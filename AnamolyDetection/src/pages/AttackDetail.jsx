import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { attackDescriptions } from "../constants/attackDescriptions";
import { useBlacklist } from "../hooks/useBlacklist";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function AttackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [eventData, setEventData] = useState(null);
  const [contextEvents, setContextEvents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(true);
  
  const [error, setError] = useState(null);
  const [contextError, setContextError] = useState(null);

  const { blacklist, blockIP, unblockIP, loading: blLoading } = useBlacklist();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/attacks/${id}`)
      .then(res => {
         if (res.status === 404) throw new Error("404");
         if (!res.ok) throw new Error(`HTTP ${res.status}`);
         return res.json();
      })
      .then(data => {
         setEventData(data);
         setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!eventData?.src_ip) return;
    setContextLoading(true);
    fetch(`${API_BASE}/api/attacks?src_ip=${encodeURIComponent(eventData.src_ip)}&limit=50&page=1`)
      .then(res => res.json())
      .then(data => {
         let items = Array.isArray(data) ? data : data.data || data.items || [];
         setContextEvents(items);
         setContextError(null);
      })
      .catch(err => setContextError("Failed to load context charts."))
      .finally(() => setContextLoading(false));
  }, [eventData]);

  if (error === "404") {
     return (
        <div className="bg-gray-900 min-h-screen p-6 lg:ml-64 flex flex-col items-center justify-center font-sans text-cyan-400">
           <Card className="max-w-md w-full text-center border border-gray-600 shadow-[0_0_15px_theme(colors.gray.700)] py-10">
              <h2 className="text-gray-300 text-2xl font-bold mb-4 uppercase tracking-widest">Event Not Found</h2>
              <p className="text-gray-500 mb-8 font-mono text-xs">The requested attack profile <span className="text-white">[{id}]</span> could not be resolved from the current active buffer.</p>
              <button 
                 onClick={() => navigate("/attacks")}
                 className="bg-cyan-700 hover:bg-cyan-600 text-white px-8 py-3 rounded transition-colors font-bold uppercase tracking-widest text-xs"
              >
                 Return to Attacks Log
              </button>
           </Card>
        </div>
     );
  }

  if (error) {
     return (
        <div className="bg-gray-900 min-h-screen p-6 lg:ml-64 font-sans text-cyan-400">
           <Card className="border border-red-600 shadow-xl">
              <h2 className="text-red-500 font-bold mb-2 uppercase tracking-wide text-lg">System Error</h2>
              <p className="bg-gray-900 text-gray-300 font-mono text-sm p-4 rounded">{error}</p>
           </Card>
        </div>
     );
  }

  // Description Resolution logic
  let matchedDescription = attackDescriptions["Unknown"];
  if (eventData?.attack_type) {
     const t = eventData.attack_type;
     if (attackDescriptions[t]) {
        matchedDescription = attackDescriptions[t];
     } else if (t.startsWith("DoS")) {
        matchedDescription = attackDescriptions["DoS"];
     } else if (t.startsWith("Web Attack")) {
        matchedDescription = attackDescriptions["Web Attack"];
     } else if (t !== "BENIGN") {
        matchedDescription = `${eventData.attack_type}: Abnormal pattern behavior definitively reported. Standard triage protocols apply.`;
     }
  }

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const sparkData = [...contextEvents]
    .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(c => ({
       time: new Date(c.timestamp).toLocaleTimeString(),
       packets: c.packets_per_sec || 0
    }));

  const durationGroups = {"0-1": 0, "1-5": 0, "5-10": 0, "10-50": 0, "50+": 0};
  contextEvents.forEach(c => {
     const d = c.flow_duration || 0;
     if (d <= 1) durationGroups["0-1"]++;
     else if (d <= 5) durationGroups["1-5"]++;
     else if (d <= 10) durationGroups["5-10"]++;
     else if (d <= 50) durationGroups["10-50"]++;
     else durationGroups["50+"]++;
  });
  const durationData = Object.entries(durationGroups).map(([name, count]) => ({name, count}));

  const dataSkeleton = (
     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 tracking-wide mt-2">
        {[...Array(8)].map((_, i) => (
           <div key={i} className="flex flex-col">
              <div className="h-4 w-24 bg-gray-700 font-bold uppercase mb-2 rounded animate-pulse"></div>
              <div className="h-6 w-32 bg-gray-700/60 rounded animate-pulse"></div>
           </div>
        ))}
     </div>
  );

  const isBlocked = eventData && blacklist.has(eventData.src_ip);

  return (
    <div className="bg-gray-900 min-h-screen p-6 lg:ml-64 font-sans text-cyan-400 flex flex-col space-y-6">
      <div className="flex items-center space-x-6 mb-2">
         <button 
           onClick={() => navigate("/attacks")}
           className="text-gray-400 hover:text-white hover:bg-gray-700 transition-colors uppercase tracking-widest text-xs font-bold px-4 py-2.5 bg-gray-800 rounded shadow-md border border-gray-700 flex items-center"
         >
           <span className="mr-2 text-lg leading-none">←</span> Back to Table
         </button>
         <h1 className="text-3xl font-bold text-white tracking-wide">Attack Source Detail</h1>
      </div>

      {/* Top Card - Overview */}
      <Card title="Event Overview" className="shadow-2xl">
        {loading ? dataSkeleton : eventData && (
           <div className="relative">
              
              <div className="absolute top-0 right-0 flex items-center shadow-lg border border-transparent group transition-all">
                 {blLoading ? (
                    <div className="h-10 w-24 bg-gray-700 rounded animate-pulse" />
                 ) : (
                    <button 
                      onClick={() => isBlocked ? unblockIP(eventData.src_ip) : blockIP(eventData.src_ip)}
                      className={`font-bold transition-all px-8 py-2.5 rounded shadow-lg uppercase tracking-widest text-xs border-2 flex items-center space-x-2 ${isBlocked ? 'border-green-600 bg-green-900/10 text-green-500 hover:bg-green-600 hover:text-white' : 'border-red-600 bg-red-900/10 text-red-500 hover:bg-red-600 hover:text-white'}`}
                    >
                      <span>{isBlocked ? '🔓 UNBLOCK' : '🛑 BLOCK IP'}</span>
                    </button>
                 )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 tracking-wide mt-2 items-start py-2">
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">ID Tag</span>
                    <span className="text-gray-300 font-mono text-xs overflow-hidden text-ellipsis w-48">{eventData.id || "N/A"}</span>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">Timestamp</span>
                    <span className="text-gray-300 font-mono text-sm shadow-sm">{eventData.timestamp ? new Date(eventData.timestamp).toLocaleString() : "Unknown"}</span>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">Source IP</span>
                    <span className={`font-mono text-xl leading-none drop-shadow ${isBlocked ? 'line-through text-red-500' : 'text-cyan-300'}`}>
                       {eventData.src_ip || "Unknown"}
                    </span>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">Dest IP</span>
                    <span className="text-gray-400 font-mono text-xl leading-none">{eventData.dst_ip || "Unknown"}</span>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">Protocol Family</span>
                    <span className="text-gray-300 font-bold text-base tracking-widest">{eventData.protocol || "Unknown"}</span>
                 </div>
                 
                 <div className="flex flex-col items-start gap-1">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Attack Type</span>
                    <span className="bg-cyan-900/60 text-cyan-300 border border-cyan-700 px-3 py-1 rounded-full text-xs font-bold shadow inline-block tracking-wide mt-1">
                       {eventData.attack_type || "None"}
                    </span>
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-widest">Confidence</span>
                    <span className="text-white font-bold text-xl drop-shadow-sm">{(eventData.confidence * 100).toFixed(0)}%</span>
                 </div>
                 
                 <div className="flex flex-col items-start gap-1">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Assessed Severity</span>
                    <span className={`px-4 py-1.5 rounded text-xs font-bold shadow-md tracking-widest uppercase inline-block mt-1 ${eventData.severity ? getSeverityColor(eventData.severity) : getSeverityColor('Low')}`}>
                       {eventData.severity || "Low"}
                    </span>
                 </div>

              </div>
           </div>
        )}
      </Card>

      {/* Second Card - Explanation */}
      <Card title="What is this attack?" className="shadow-lg min-h-[140px]">
         {loading ? (
            <div className="animate-pulse space-y-3 mt-4">
               <div className="h-4 bg-gray-700 rounded w-full"></div>
               <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
         ) : (
            <p className="text-gray-300 leading-relaxed text-sm md:text-base tracking-wide mt-2">
               {matchedDescription}
            </p>
         )}
      </Card>

      {/* Third Card Array - Context Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         
         <Card title={`Packets/s Context Mapping`} className="h-[350px] shadow-xl flex flex-col justify-center">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Historical Origin Source IP Sample</p>
            {contextLoading ? (
               <div className="animate-pulse w-full h-full flex items-center justify-center">
                  <div className="h-4 w-32 bg-gray-700 rounded"></div>
               </div>
            ) : contextError ? (
               <div className="w-full h-full flex items-center justify-center text-red-500 text-sm font-bold uppercase">{contextError}</div>
            ) : sparkData.length === 0 ? (
               <div className="w-full h-full flex items-center justify-center text-gray-500 italic text-sm font-bold">Insufficient contextual data</div>
            ) : (
               <ResponsiveContainer width="100%" height="85%">
                 <LineChart data={sparkData}>
                   <XAxis dataKey="time" hide={true} />
                   <YAxis hide={true} domain={['dataMin', 'dataMax']} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                     itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                     labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                   />
                   <Line type="monotone" dataKey="packets" stroke="#22d3ee" strokeWidth={3} dot={{r: 2, fill: '#06b6d4'}} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
            )}
         </Card>

         <Card title={`Flow Distribution Spread`} className="h-[350px] shadow-xl flex flex-col justify-center">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Duration Timeline Mapping</p>
            {contextLoading ? (
               <div className="animate-pulse w-full h-full flex items-center justify-center">
                  <div className="h-4 w-32 bg-gray-700 rounded"></div>
               </div>
            ) : contextError ? (
               <div className="w-full h-full flex items-center justify-center text-red-500 text-sm font-bold uppercase">{contextError}</div>
            ) : durationData.length === 0 ? (
               <div className="w-full h-full flex items-center justify-center text-gray-500 italic text-sm font-bold">Insufficient contextual data</div>
            ) : (
               <ResponsiveContainer width="100%" height="85%">
                 <BarChart data={durationData} margin={{ top: 20 }}>
                   <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={12} />
                   <Tooltip 
                     cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                     contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                     itemStyle={{ color: '#0891b2', fontWeight: 'bold' }}
                   />
                   <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
            )}
         </Card>
      </div>

    </div>
  );
}

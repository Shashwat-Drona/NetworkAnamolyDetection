import React, { useState, useEffect } from "react";
import Card from "../components/Card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const isAttack = payload.attack_type && payload.attack_type !== "BENIGN";
  
  // Render red dot for attacks, cyan for benign
  if (isAttack) {
     return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} />;
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="#06b6d4" stroke="none" />;
};

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/timeline?limit=500`)
      .then(res => {
         if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
         return res.json();
      })
      .then(data => {
         setEvents(data);
         setCurrentIndex(0);
         setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Playback Interval Control System
  useEffect(() => {
    let intervalId = null;
    if (isPlaying && events.length > 0) {
       // "speed x 100ms" -> We map speed logically to tick intervals. base = 500ms
       // 1x = 500ms, 2x = 250ms, 5x = 100ms
       const tickRate = speed === 1 ? 500 : speed === 2 ? 250 : 100;
       
       intervalId = setInterval(() => {
          setCurrentIndex(prev => {
             if (prev >= events.length - 1) {
                setIsPlaying(false);
                return prev;
             }
             return prev + 1;
          });
       }, tickRate);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, speed, events.length]);

  const handleSlider = (e) => {
     setCurrentIndex(parseInt(e.target.value, 10));
     if(isPlaying) setIsPlaying(false);
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  // Extract subset from local buffer avoiding backend requests
  const currentData = events.slice(0, currentIndex + 1);
  const visibleEvents = [...currentData].reverse().slice(0, 20); // Top 20 descending timeline

  const activeEvent = currentData[currentData.length - 1] || {};
  const activeTime = activeEvent?.timestamp 
      ? new Date(activeEvent.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) 
      : "00:00:00";

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 lg:ml-64 font-sans flex flex-col space-y-6">
      
      <div className="mb-2">
         <h1 className="text-3xl font-bold text-white tracking-wide mb-2">Flow Playback Timeline</h1>
         <p className="text-gray-400 text-sm tracking-widest uppercase">Analyze historical buffer buffers chronologically through client projection</p>
      </div>

      {loading ? (
          <div className="animate-pulse w-full h-[300px] flex items-center justify-center bg-gray-800 rounded-lg shadow border border-gray-700">
             <span className="text-gray-500 uppercase font-bold tracking-widest text-sm">Synchronizing Timeline Blocks...</span>
          </div>
      ) : error ? (
          <div className="text-red-500 font-bold bg-gray-800 p-6 rounded shadow border border-red-500/50 uppercase tracking-widest text-sm">{error}</div>
      ) : events.length === 0 ? (
          <div className="text-gray-500 bg-gray-800 p-6 rounded-lg italic font-semibold text-center h-48 flex items-center justify-center uppercase tracking-widest text-sm shadow border border-gray-700/50">
             Buffer Empty — No events logged to playback.
          </div>
      ) : (
        <>
          {/* Top Panel: Playback Controls */}
          <Card className="shadow-2xl flex flex-col border border-gray-700/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>
             
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex items-center space-x-6">
                   <button 
                      onClick={() => {
                         if (currentIndex >= events.length - 1) setCurrentIndex(0);
                         setIsPlaying(!isPlaying);
                      }}
                      className="bg-cyan-700 hover:bg-cyan-600 text-white w-[60px] h-[60px] rounded-full flex items-center justify-center font-bold shadow-lg transition-all active:scale-95 border-2 border-cyan-500"
                   >
                      <span className="text-2xl drop-shadow -ml-1 mt-0.5">{isPlaying ? "⏸" : "▶"}</span>
                   </button>
                   <div>
                      <div className="text-[10px] text-cyan-600 uppercase tracking-widest mb-1 font-bold">Chronological Marker</div>
                      <div className="text-3xl font-mono text-white font-bold drop-shadow">{activeTime}</div>
                   </div>
                </div>

                <div className="flex flex-col items-end">
                   <div className="text-xs text-gray-400 font-bold mb-3 tracking-wide uppercase">
                      Position <span className="text-cyan-400 mx-1">{currentIndex + 1}</span> / <span className="text-white mx-1">{events.length}</span> Traces
                   </div>
                   <div className="flex space-x-2 bg-gray-900 p-1.5 rounded-lg border border-gray-700 shadow-inner">
                       {[1, 2, 5].map(s => (
                          <button 
                             key={s} 
                             onClick={() => setSpeed(s)}
                             className={`px-4 py-1.5 text-xs font-bold rounded transition-all tracking-wider uppercase ${speed === s ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                          >
                             {s}x
                          </button>
                       ))}
                   </div>
                </div>
             </div>
             
             <div className="w-full flex items-center pb-2 relative z-10">
                <input 
                   type="range" 
                   min={0} 
                   max={events.length - 1} 
                   value={currentIndex}
                   onChange={handleSlider}
                   className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 outline-none shadow-inner border border-gray-700"
                />
             </div>
          </Card>

          {/* Main Chart Vector Space */}
          <Card title="Traffic Packets per Second Trace" className="shadow-2xl h-[400px] flex flex-col justify-center border-t-2 border-t-gray-700/50">
             <ResponsiveContainer width="100%" height="90%">
                <LineChart data={currentData.map((e, idx) => ({time: new Date(e.timestamp).toLocaleTimeString(), packets: e.packets_per_sec || 0, attack_type: e.attack_type, src_ip: e.src_ip}))}>
                   <XAxis dataKey="time" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={10} minTickGap={40} />
                   <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={11} />
                   <Tooltip 
                      contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}} 
                      itemStyle={{color: '#22d3ee', fontWeight: 'bold'}}
                   />
                   <Line 
                      type="stepAfter"
                      dataKey="packets" 
                      stroke="#4b5563" 
                      strokeWidth={1.5} 
                      dot={<CustomDot />}
                      activeDot={false}
                      isAnimationActive={false} // Required: disables heavy tweening, forcing graph to step instantly matching slider
                   />
                </LineChart>
             </ResponsiveContainer>
          </Card>

          {/* Event Feed Block */}
          <Card title="Playback Frame Sequence Arrays" className="shadow-2xl border-t-2 border-t-gray-700/50">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                   <thead className="bg-gray-800 text-cyan-400 border-b border-gray-700 uppercase tracking-widest text-xs font-bold">
                      <tr>
                         <th className="px-5 py-3 whitespace-nowrap">Chronological Stamp</th>
                         <th className="px-5 py-3 whitespace-nowrap">Origin Source</th>
                         <th className="px-5 py-3 whitespace-nowrap">Mapped Event Class</th>
                         <th className="px-5 py-3 whitespace-nowrap">Assessed Weight</th>
                      </tr>
                   </thead>
                   <tbody>
                      {visibleEvents.map((row, i) => (
                         <tr key={row.id || i} className="border-b border-gray-800/50 hover:bg-gray-700/30 transition-colors animate-[slideInUp_0.15s_ease-out]">
                            <td className="px-5 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                               {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : ""}
                            </td>
                            <td className="px-5 py-3 font-mono text-cyan-200 tracking-tight">
                               {row.src_ip}
                            </td>
                            <td className="px-5 py-3">
                               <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap tracking-wide uppercase">
                                  {row.attack_type || "Unknown"}
                               </span>
                            </td>
                            <td className="px-5 py-3">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap uppercase tracking-widest shadow ${getSeverityColor(row.severity)}`}>
                                  {row.severity || "Low"}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             <style dangerouslySetInnerHTML={{__html: `
               @keyframes slideInUp {
                 from { opacity: 0; transform: translateY(-8px); }
                 to { opacity: 1; transform: translateY(0); }
               }
             `}} />
          </Card>
        </>
      )}
    </div>
  );
}

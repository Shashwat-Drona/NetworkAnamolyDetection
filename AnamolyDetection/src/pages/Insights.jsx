import React, { useState, useEffect } from "react";
import Card from "../components/Card";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
  LineChart, Line
} from "recharts";
import BlacklistPanel from "../components/BlacklistPanel";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/insights`)
      .then(res => {
         if (!res.ok) throw new Error(`HTTP ${res.status}`);
         return res.json();
      })
      .then(d => {
         setData(d);
         setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const renderSkeleton = () => (
     <div className="animate-pulse w-full h-full bg-gray-800/50 rounded flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Aggregating Global View...</span>
     </div>
  );

  const renderError = (msg) => (
     <div className="w-full h-full flex flex-col items-center justify-center text-red-500 font-bold p-6 text-center">
        <span className="mb-2 text-2xl">⚠️</span>
        <span className="text-sm tracking-wider uppercase mb-2">Aggregation Error</span>
        <span className="text-xs text-red-400 font-mono bg-red-900/20 px-4 py-2 rounded">{msg}</span>
     </div>
  );

  const renderEmpty = () => (
     <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 italic text-sm font-semibold tracking-wide">
        <span className="text-2xl mb-2">∅</span>
        Insufficient topological data
     </div>
  );

  // Standardized distinct palette matching previous cyan themes with logical variation
  const pieColors = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'];

  const distData = data?.attack_distribution || [];
  const topSrcData = data?.top_src_ips || [];
  const topDstData = data?.top_dst_ips || [];
  const trendsData = data?.trends || [];

  return (
   <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 font-sans flex flex-col space-y-8">
      
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-white mb-3 tracking-wide drop-shadow-sm">Global Insights Overview</h1>
        <p className="text-gray-400 text-sm tracking-widest uppercase">Chronological and Topological Aggregations maps across all active signatures</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         
         {/* 1. Attack Type Distribution Chart */}
         <Card title="Attack Type Profile Distribution" className="h-[450px] shadow-2xl flex flex-col justify-center border-t-2 border-t-gray-700/50 relative overflow-hidden">
           {loading ? renderSkeleton() : error ? renderError(error) : distData.length === 0 ? renderEmpty() : (
              <ResponsiveContainer width="100%" height="90%">
                 <PieChart>
                    <Pie 
                       data={distData} 
                       dataKey="count" 
                       nameKey="attack_type" 
                       cx="50%" 
                       cy="50%" 
                       outerRadius={120}
                       innerRadius={70}
                       paddingAngle={4}
                       stroke="none"
                    >
                       {distData.map((e, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
                    </Pie>
                    <Tooltip 
                       contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}}
                       itemStyle={{color: '#22d3ee', fontWeight: 'bold'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', color: '#9ca3af', paddingTop: '20px'}} />
                 </PieChart>
              </ResponsiveContainer>
           )}
         </Card>

         {/* 2. Top Attacker IPs Chart */}
         <Card title="Top Identified Malicious Actors (Source IPs)" className="h-[450px] shadow-2xl flex flex-col justify-center border-t-2 border-t-gray-700/50 relative overflow-hidden">
           <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">By Event Quantity Output</p>
           {loading ? renderSkeleton() : error ? renderError(error) : topSrcData.length === 0 ? renderEmpty() : (
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={topSrcData} layout="vertical" margin={{top: 0, right: 30, left: 40, bottom: 0}}>
                    <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="src_ip" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={11} width={110} />
                    <Tooltip 
                       cursor={{fill: 'rgba(255,255,255,0.05)'}}
                       contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}}
                       itemStyle={{color: '#ef4444', fontWeight: 'bold'}}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={22}>
                       {topSrcData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={'#ef4444'} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           )}
         </Card>

         {/* 3. Most Targeted IPs Chart */}
         <Card title="Host Vulnerability Landscape (Dest IPs)" className="h-[450px] shadow-2xl flex flex-col justify-center border-t-2 border-t-gray-700/50 relative overflow-hidden">
           <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Most Frequent Targets</p>
           {loading ? renderSkeleton() : error ? renderError(error) : topDstData.length === 0 ? renderEmpty() : (
              <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={topDstData} layout="vertical" margin={{top: 0, right: 30, left: 40, bottom: 0}}>
                    <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="dst_ip" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={11} width={110} />
                    <Tooltip 
                       cursor={{fill: 'rgba(255,255,255,0.05)'}}
                       contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}}
                       itemStyle={{color: '#0891b2', fontWeight: 'bold'}}
                    />
                    <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={22} />
                 </BarChart>
              </ResponsiveContainer>
           )}
         </Card>

         {/* 4. Traffic Trends Over Time Chart */}
         <Card title="Chronological Threat Topology Vector Maps" className="h-[450px] shadow-2xl flex flex-col justify-center border-t-2 border-t-gray-700/50 relative overflow-hidden">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Relative Chronometric Density</p>
            {loading ? renderSkeleton() : error ? renderError(error) : trendsData.length === 0 ? renderEmpty() : (
               <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={trendsData} margin={{top: 10, right: 20, left: 0, bottom: 25}}>
                     <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={10} 
                        angle={-25} 
                        textAnchor="end" 
                     />
                     <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={11} />
                     <Tooltip 
                        contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}}
                        labelStyle={{color: '#9ca3af', marginBottom: '5px', fontWeight: 'bold'}}
                     />
                     <Legend iconType="circle" wrapperStyle={{fontSize: '12px', color: '#9ca3af', paddingTop: '20px'}} />
                     <Line 
                        type="monotone" 
                        dataKey="attack_count" 
                        name="Malicious Actions" 
                        stroke="#ef4444" 
                        strokeWidth={4} 
                        dot={false} 
                        activeDot={{r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2}} 
                     />
                     <Line 
                        type="monotone" 
                        dataKey="benign_count" 
                        name="Benign Traffic" 
                        stroke="#06b6d4" 
                        strokeWidth={4} 
                        dot={false} 
                        activeDot={{r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2}} 
                     />
                  </LineChart>
               </ResponsiveContainer>
            )}
         </Card>
      </div>

      {/* Embed Blacklist Panel Bottom spanning full width */}
      <BlacklistPanel />

    </div>
  );
}

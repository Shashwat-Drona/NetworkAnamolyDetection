import { useState, useMemo } from "react";
import { useAttacks } from "../hooks/useAttacks";
import Card from "../components/Card";
import {
  LineChart, Line, PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

export default function Traffic() {
  const { attacks, loading, error } = useAttacks();

  const [filters, setFilters] = useState({
    attack_type: "All",
    protocol: "All",
    src_ip: "",
    dst_ip: "",
  });

  const handleFilterChange = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const filteredAttacks = useMemo(() => {
    if (!attacks) return [];
    return attacks.filter(a => {
      if (filters.attack_type !== "All" && a.attack_type !== filters.attack_type) return false;
      if (filters.protocol !== "All" && a.protocol !== filters.protocol) return false;
      if (filters.src_ip && !a.src_ip?.includes(filters.src_ip)) return false;
      if (filters.dst_ip && !a.dst_ip?.includes(filters.dst_ip)) return false;
      return true;
    });
  }, [attacks, filters]);

  // Unique values for dropdowns
  const uniqueAttackTypes = useMemo(() => {
    return ["All", ...new Set(attacks?.map(a => a.attack_type).filter(Boolean))];
  }, [attacks]);

  const uniqueProtocols = useMemo(() => {
    return ["All", ...new Set(attacks?.map(a => a.protocol).filter(Boolean))];
  }, [attacks]);

  // Chart 1: Packets/s Over Time
  const lineData = useMemo(() => {
    if (filteredAttacks.length === 0) return [];
    const sorted = [...filteredAttacks].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    const maxPoints = 200;
    const step = sorted.length > maxPoints ? Math.ceil(sorted.length / maxPoints) : 1;
    
    return sorted.filter((_, i) => i % step === 0).map(a => ({
      time: new Date(a.timestamp).toLocaleTimeString(),
      packets: a.packets_per_sec || 0
    }));
  }, [filteredAttacks]);

  // Chart 2: Protocol Distribution
  const pieData = useMemo(() => {
    const counts = {};
    filteredAttacks.forEach(a => {
      const p = a.protocol || "Unknown";
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredAttacks]);
  
  const pieColors = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'];

  // Chart 3: Flow Duration Histogram
  const histogramData = useMemo(() => {
    if (filteredAttacks.length === 0) return [];
    let minD = Infinity; let maxD = -Infinity;
    filteredAttacks.forEach(a => {
      const d = a.flow_duration || 0;
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    });
    
    if (minD === Infinity) return [];
    if (minD === maxD) {
      return [{ range: minD.toFixed(1), count: filteredAttacks.length }];
    }
    
    const binSize = (maxD - minD) / 10;
    const bins = Array.from({length: 10}, (_, i) => ({
      min: minD + i * binSize,
      max: minD + (i + 1) * binSize,
      count: 0
    }));
    
    filteredAttacks.forEach(a => {
      const d = a.flow_duration || 0;
      let binIdx = Math.floor((d - minD) / binSize);
      if (binIdx >= 10) binIdx = 9;
      bins[binIdx].count++;
    });
    
    return bins.map(b => ({
      range: `${b.min.toFixed(1)}-${b.max.toFixed(1)}`,
      count: b.count
    }));
  }, [filteredAttacks]);

  // Shared state helpers
  const renderLoadingSkeleton = () => (
    <div className="animate-pulse w-full h-full bg-gray-700 rounded flex items-center justify-center shadow-inner">
       <span className="text-gray-500 font-semibold tracking-wide uppercase text-sm">Loading Chart Data...</span>
    </div>
  );

  const renderEmptyState = () => (
    <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold italic text-sm">
      No data available
    </div>
  );

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-cyan-400 font-sans">
        <h1 className="text-3xl font-bold text-white mb-6">Traffic Analysis</h1>
        <Card className="border border-red-600 shadow-xl">
          <h2 className="text-red-500 text-lg font-bold mb-2 uppercase tracking-wide">Error Failed to Read Fetch Data</h2>
          <p className="text-gray-300 bg-gray-900 p-4 rounded font-mono text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 font-sans">
      <h1 className="text-3xl font-bold text-white mb-6">Traffic Analysis</h1>
      
      {/* Filter Bar */}
      <Card className="mb-6 flex flex-wrap gap-4 items-end shadow-lg transition-all duration-300">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Attack Type</label>
          <select 
            name="attack_type" 
            value={filters.attack_type} 
            onChange={handleFilterChange}
            className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-transparent focus:border-cyan-500 transition-colors cursor-pointer"
          >
            {uniqueAttackTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Protocol</label>
          <select 
            name="protocol" 
            value={filters.protocol} 
            onChange={handleFilterChange}
            className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-transparent focus:border-cyan-500 transition-colors cursor-pointer"
          >
            {uniqueProtocols.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Source IP</label>
          <input 
            type="text" 
            name="src_ip"
            placeholder="Search by exact or partial Match" 
            value={filters.src_ip} 
            onChange={handleFilterChange}
            className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 border border-transparent focus:border-cyan-500 transition-all font-mono text-sm"
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Destination IP</label>
          <input 
            type="text" 
            name="dst_ip"
            placeholder="Search by exact or partial Match" 
            value={filters.dst_ip} 
            onChange={handleFilterChange}
            className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 border border-transparent focus:border-cyan-500 transition-all font-mono text-sm"
          />
        </div>
        
        <div className="w-full mt-2 text-right text-gray-400 text-xs font-semibold tracking-wider">
           {loading ? (
              <span className="text-cyan-500 animate-pulse">Fetching records...</span>
           ) : (
              <span>Showing {filteredAttacks.length} records active for charts</span>
           )}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* 1. Packets/s Over Time */}
        <Card title="Traffic Packets per Second Over Time Flowing" className="xl:col-span-2 h-96 shadow-xl transition-shadow duration-300">
          {loading ? renderLoadingSkeleton() : lineData.length === 0 ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={lineData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="packets" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 2. Protocol Distribution */}
        <Card title="Port & Protocol Group Size Allocation Distribution" className="h-[400px] shadow-xl flex flex-col justify-center">
          {loading ? renderLoadingSkeleton() : pieData.length === 0 ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={110}
                  innerRadius={70}
                  paddingAngle={5}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#9ca3af', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 3. Flow Duration Histogram */}
        <Card title="Traffic Flow Time Spaced Bucket Duration" className="h-[400px] shadow-xl flex flex-col justify-center">
          {loading ? renderLoadingSkeleton() : histogramData.length === 0 ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <XAxis 
                  dataKey="range" 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  angle={-35} 
                  textAnchor="end"
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

      </div>
    </div>
  );
}

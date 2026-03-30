import React from 'react';
import Card from './Card';

export default function FilterBar({ filters, setFilters, uniqueAttackTypes = ["All"], uniqueProtocols = ["All"], loading, totalCount }) {
  const handleFilterChange = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  return (
    <Card className="mb-6 flex flex-wrap gap-4 items-end shadow-lg transition-all duration-300">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Attack Type</label>
        <select 
          name="attack_type" 
          value={filters.attack_type || "All"} 
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
          value={filters.protocol || "All"} 
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
          placeholder="Filter by Source IP" 
          value={filters.src_ip || ""} 
          onChange={handleFilterChange}
          className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 border border-transparent focus:border-cyan-500 transition-all font-mono text-sm"
        />
      </div>
      
      <div className="flex-1 min-w-[200px]">
        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">Destination IP</label>
        <input 
          type="text" 
          name="dst_ip"
          placeholder="Filter by Dest IP" 
          value={filters.dst_ip || ""} 
          onChange={handleFilterChange}
          className="w-full bg-gray-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 border border-transparent focus:border-cyan-500 transition-all font-mono text-sm"
        />
      </div>
      
      {(loading !== undefined || totalCount !== undefined) && (
        <div className="w-full mt-2 text-right text-gray-400 text-xs font-semibold tracking-wider">
           {loading ? (
              <span className="text-cyan-500 animate-pulse">Fetching records...</span>
           ) : (
              <span>Showing {totalCount} records visible</span>
           )}
        </div>
      )}
    </Card>
  );
}

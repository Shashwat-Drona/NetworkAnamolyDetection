import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from './Card';
import { useBlacklist } from '../hooks/useBlacklist';

export default function DataTable({ data, loading, error, activeRowId = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sortCol, setSortCol] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [search, setSearch] = useState("");
  
  const { blacklist, blockIP, unblockIP } = useBlacklist();

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(col);
      setSortDesc(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    let processed = [...data];

    // Search visible columns
    if (search) {
      const s = search.toLowerCase();
      processed = processed.filter(item => {
        return ['timestamp', 'src_ip', 'dst_ip', 'attack_type', 'confidence', 'severity']
          .some(key => String(item[key] || '').toLowerCase().includes(s));
      });
    }

    // Sort client-side
    if (sortCol) {
      processed.sort((a, b) => {
        const valA = a[sortCol] || "";
        const valB = b[sortCol] || "";
        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
      });
    }
    return processed;
  }, [data, search, sortCol, sortDesc]);

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-gray-300';
    }
  };

  if (error) {
    return (
      <Card className="border border-red-600 shadow-xl w-full">
        <h2 className="text-red-500 text-lg font-bold mb-2 uppercase tracking-wide">Error Failed to Read Table Data</h2>
        <p className="text-gray-300 bg-gray-900 p-4 rounded font-mono text-sm">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full shadow-xl w-full">
      <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Analysis Event Logs</h3>
        <input 
          type="text" 
          placeholder="Search visible columns..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-72 border border-transparent focus:border-cyan-500 transition-all font-mono"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-left text-sm text-gray-300 table-auto">
          <thead className="bg-gray-800 text-cyan-400 border-b border-gray-700 uppercase tracking-widest text-[10px] font-bold">
            <tr>
              {['timestamp', 'src_ip', 'dst_ip', 'attack_type', 'confidence', 'severity'].map(col => (
                <th key={col} className="px-5 py-4 cursor-pointer hover:text-white select-none whitespace-nowrap transition-colors group" onClick={() => handleSort(col)}>
                  <div className="flex items-center space-x-1">
                    <span>{col.replace('_', ' ')}</span>
                    <span className="text-gray-500 group-hover:text-cyan-400">
                      {sortCol === col ? (sortDesc ? '▼' : '▲') : ''}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-5 py-4 whitespace-nowrap text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-gray-700/50 animate-pulse bg-gray-800/20">
                  <td colSpan="7" className="px-5 py-4">
                     <div className="h-5 bg-gray-700 rounded w-full line-clamp-1"></div>
                  </td>
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-500 italic text-sm tracking-wide">
                   No matching event records active in current view.
                </td>
              </tr>
            ) : (
              filteredData.map((row, i) => {
                const isBlocked = blacklist.has(row.src_ip);
                const isActive = activeRowId === row.id || location.pathname.includes(`/attacks/${row.id}`);
                return (
                  <tr 
                    key={row.id || i} 
                    onClick={() => navigate(`/attacks/${row.id}`)}
                    className={`border-b border-gray-700/50 transition-colors duration-150 cursor-pointer group 
                      ${isBlocked ? 'opacity-50 hover:bg-gray-700 bg-red-900/10' : 'hover:bg-gray-700'} 
                      ${isActive ? 'border-l-2 border-l-cyan-400 bg-gray-800' : ''}`}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-gray-400 group-hover:text-white text-xs">
                       {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className={`px-5 py-3 font-mono text-cyan-300 text-xs ${isBlocked ? 'line-through text-red-400' : ''}`}>
                       {row.src_ip}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-300 group-hover:text-white text-xs whitespace-nowrap">{row.dst_ip}</td>
                    <td className="px-5 py-3">
                       <span className="bg-cyan-900/50 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap shadow-sm group-hover:bg-cyan-800 transition-colors">
                          {row.attack_type || "Unknown"}
                       </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300 font-semibold text-xs text-center">
                       {row.confidence ? (row.confidence * 100).toFixed(0) : "0"}%
                    </td>
                    <td className="px-5 py-3">
                       <span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap shadow tracking-wide uppercase ${getSeverityColor(row.severity)}`}>
                          {row.severity || "None"}
                       </span>
                    </td>
                    <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                       <button
                          onClick={(e) => {
                             e.stopPropagation();
                             if (isBlocked) unblockIP(row.src_ip);
                             else blockIP(row.src_ip);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-md border-2 ${isBlocked ? 'bg-gray-800 border-green-500/50 hover:bg-green-900/40 text-green-500' : 'bg-gray-800 border-red-500/50 hover:bg-red-900/40 text-red-500'}`}
                          title={isBlocked ? "Unblock IP Route" : "Block Source IP"}
                       >
                          {isBlocked ? '🔓' : '🛑'}
                       </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

import React from 'react';
import Card from './Card';
import { useBlacklist } from '../hooks/useBlacklist';

export default function BlacklistPanel() {
  const { blacklist, unblockIP, loading } = useBlacklist();
  
  return (
    <Card title="Active Blocked IP Constraints" className="shadow-2xl border-t-2 border-t-red-600/50 mt-8 w-full">
       {loading ? (
          <div className="animate-pulse flex items-center p-4">
             <div className="h-4 w-1/3 bg-gray-700/50 rounded"></div>
          </div>
       ) : blacklist.size === 0 ? (
          <div className="text-gray-500 text-sm italic font-bold tracking-widest p-4 text-center py-10 uppercase">No IPs currently isolated in blocked queues</div>
       ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
             {Array.from(blacklist).map(ip => (
                <div key={ip} className="bg-gray-900 border border-red-900/50 p-4 rounded-lg flex items-center justify-between shadow-inner transition-colors duration-300 hover:border-red-500/50">
                   <div className="flex items-center space-x-3">
                      <span className="text-red-500 text-xl leading-none">⚠️</span>
                      <span className="text-red-400 font-mono text-sm tracking-widest line-through drop-shadow-sm">{ip}</span>
                   </div>
                   <button 
                      onClick={() => unblockIP(ip)} 
                      className="text-[10px] bg-gray-800 hover:bg-green-900/40 text-gray-400 hover:text-green-400 font-bold px-3 py-1.5 rounded transition-colors uppercase tracking-widest border border-gray-600 hover:border-green-600 shadow"
                   >
                      Unblock
                   </button>
                </div>
             ))}
          </div>
       )}
    </Card>
  );
}

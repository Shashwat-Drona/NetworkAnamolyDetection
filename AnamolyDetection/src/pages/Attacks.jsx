import React, { useState, useEffect } from 'react';
import { useAttacks } from '../hooks/useAttacks';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';

// Given server-side filtering, we supply static common options for the dropdowns.
const COMMON_ATTACK_TYPES = ["All", "BENIGN", "DoS", "PortScan", "SSH BruteForce", "Botnet", "SQL Injection", "XSS"];
const COMMON_PROTOCOLS = ["All", "TCP", "UDP", "ICMP", "HTTP"];

export default function Attacks() {
  const { attacks, total, page, loading, error, setPage, setFilters } = useAttacks(1, 50, {
    attack_type: "All",
    protocol: "All",
    src_ip: "",
    dst_ip: ""
  });

  const [localFilters, setLocalFilters] = useState({
    attack_type: "All",
    protocol: "All",
    src_ip: "",
    dst_ip: ""
  });

  // Debounce logic to avoid rapid API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(localFilters);
      if (page !== 1) setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters, setPage, page]);

  const handleNext = () => setPage(p => p + 1);
  const handlePrev = () => setPage(p => Math.max(1, p - 1));

  const totalPages = Math.max(1, Math.ceil((total || 0) / 50));

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 font-sans flex flex-col">
      <h1 className="text-3xl font-bold text-white mb-6">Threat Events Log</h1>
      
      <FilterBar 
        filters={localFilters} 
        setFilters={setLocalFilters} 
        loading={loading}
        totalCount={total}
        uniqueAttackTypes={COMMON_ATTACK_TYPES}
        uniqueProtocols={COMMON_PROTOCOLS}
      />

      <div className="flex-1 mb-6">
        <DataTable 
          data={attacks}
          loading={loading}
          error={error}
        />
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-gray-800 p-5 rounded-lg shadow-xl border border-gray-700">
         <button 
           onClick={handlePrev} 
           disabled={page <= 1 || loading}
           className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded transition-colors border border-transparent focus:border-cyan-500 shadow-md uppercase tracking-wider text-sm"
         >
           Previous
         </button>
         
         <div className="text-gray-400 text-sm font-semibold tracking-widest flex items-center">
           PAGE 
           <span className="text-cyan-400 mx-2 bg-gray-900 px-3 py-1 rounded shadow-inner">{page}</span> 
           OF 
           <span className="text-white mx-2">{totalPages}</span>
         </div>
         
         <button 
           onClick={handleNext} 
           disabled={page >= totalPages || loading}
           className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-8 rounded transition-colors border border-transparent shadow-[0_0_15px_theme(colors.cyan.900)] focus:border-cyan-400 uppercase tracking-wider text-sm"
         >
           Next
         </button>
      </div>

    </div>
  );
}

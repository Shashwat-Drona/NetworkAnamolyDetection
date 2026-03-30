import React from 'react';

export default function RiskIndicator({ risk, loading }) {
  const getRiskColor = (r) => {
    if (r < 30) return "text-green-500 shadow-[0_0_20px_theme(colors.green.600)]";
    if (r <= 70) return "text-amber-500 shadow-[0_0_20px_theme(colors.amber.600)]";
    return "text-red-500 shadow-[0_0_20px_theme(colors.red.600)]";
  };

  const isCritical = risk > 90;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full min-h-[300px]">
      {loading ? (
        <div className="animate-pulse w-40 h-40 bg-gray-700/50 rounded-full flex items-center justify-center border border-gray-600 shadow-inner">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Scanning</span>
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
           {isCritical && (
              <div className="absolute inset-0 rounded-full border-[6px] border-red-500/40 animate-ping z-0" style={{ transform: 'scale(1.2)' }}></div>
           )}
           <div className={`text-7xl font-bold bg-gray-900 w-48 h-48 rounded-full flex flex-col items-center justify-center drop-shadow-xl z-10 
             ${getRiskColor(risk)} border border-gray-700/50 transition-all duration-300`}>
             <span className="drop-shadow-sm leading-none">{Number(risk).toFixed(0)}</span>
             <span className="text-[10px] text-gray-500 mt-2 font-bold tracking-widest uppercase">System Risk</span>
           </div>
        </div>
      )}
    </div>
  );
}

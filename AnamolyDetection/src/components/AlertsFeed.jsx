import React, { useState, useEffect } from 'react';

export default function AlertsFeed({ events, error }) {
  const [renderList, setRenderList] = useState([]);

  useEffect(() => {
    if (!events) return;
    const threats = events.filter(e => e.attack_type && e.attack_type !== "BENIGN");
    // Retain 12 to cleanly fade out items 10, 11
    setRenderList(threats.slice(0, 12));
  }, [events]);

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto space-y-3 pr-2 relative h-full">
      {error && <p className="text-red-500 text-xs font-bold tracking-widest uppercase mb-2">{error}</p>}
      {!renderList.length ? (
        <div className="text-gray-500 text-center mt-20 italic text-xs font-bold tracking-widest uppercase">Awaiting Active Traces...</div>
      ) : (
        renderList.map((alert, i) => {
          let badgeColor = "bg-green-600";
          if (alert.severity === "Critical") badgeColor = "bg-red-600";
          else if (alert.severity === "High") badgeColor = "bg-orange-500";
          else if (alert.severity === "Medium") badgeColor = "bg-yellow-500 text-black";

          const isFading = i >= 10;

          return (
            <div 
              key={alert.id || alert.timestamp + String(i)} 
              className={`bg-gray-800 p-3 rounded-lg flex justify-between items-center shadow border border-gray-700/50 
                animate-[slideInRight_300ms_ease-out_forwards]
                transition-all duration-300
                ${isFading ? 'opacity-0 h-0 py-0 my-0 overflow-hidden border-none transform scale-95' : 'opacity-100'}
              `}
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex flex-col">
                <span className="font-mono text-cyan-300 text-xs tracking-tight drop-shadow-sm">{alert.src_ip}</span>
                <span className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{alert.attack_type || "Unknown"}</span>
              </div>
              <span className={`${badgeColor} font-bold text-[10px] px-2.5 py-1 rounded shadow-sm tracking-widest uppercase`}>
                {alert.severity || "None"}
              </span>
            </div>
          );
        })
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}

import React, { useState } from "react";
import Card from "../components/Card";
import { attackDescriptions } from "../constants/attackDescriptions";
import { useStream } from "../hooks/useStream";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const ATTACK_TYPES = [
  { id: "DoS", name: "DoS Attack" },
  { id: "PortScan", name: "Port Scan" },
  { id: "SSH BruteForce", name: "SSH Brute Force" },
  { id: "Botnet", name: "Botnet" }
];

export default function Simulation() {
  const { events } = useStream();

  // State to track loading spinners and status messages per button
  const [loading, setLoading] = useState({});
  const [status, setStatus] = useState({});

  const injectAttack = async (attackType) => {
    setLoading(prev => ({ ...prev, [attackType]: true }));
    setStatus(prev => ({ ...prev, [attackType]: null }));
    
    try {
      const res = await fetch(`${API_BASE}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack_type: attackType })
      });
      
      if (!res.ok) {
         const err = await res.json().catch(()=>({}));
         throw new Error(err.detail || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setStatus(prev => ({ 
         ...prev, 
         [attackType]: { type: "success", msg: `Injected ${data.injected} events` } 
      }));
    } catch (err) {
      setStatus(prev => ({ 
         ...prev, 
         [attackType]: { type: "error", msg: err.message } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [attackType]: false }));
      
      // Auto clear message after 3 seconds
      setTimeout(() => {
         setStatus(prev => {
            if (prev[attackType]) {
               return { ...prev, [attackType]: null };
            }
            return prev;
         });
      }, 3000);
    }
  };

  // Filter the live SSE stream for the explicit matching confidence synthetic injections
  const recentInjections = events
    .filter(e => e.attack_type && e.attack_type !== "BENIGN" && Number(e.confidence).toFixed(2) === "0.95")
    .slice(0, 10);

  return (
    <div className="bg-gray-900 min-h-screen p-6 lg:ml-64 font-sans text-cyan-400">
      
      {/* Header Panel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Threat Simulation</h1>
        <p className="text-gray-400 text-sm tracking-wide">
          Inject synthetic attack signatures into the live network stream.
          <br />
          <span className="italic text-gray-500 mt-1 inline-block">
            Injected events appear live across Dashboard and Traffic pages via the shared stream.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Simulation Generators - Left Column Grid */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ATTACK_TYPES.map(attack => {
             let desc = attackDescriptions[attack.id] || "Targeted synthetic vulnerability injection vector. Maps automatically to stream limits natively.";
             const isLoad = loading[attack.id];
             const stat = status[attack.id];
             
             const statClass = stat?.type === "success" 
                ? "border-green-500/50 bg-green-900/10 shadow-[0_0_20px_theme(colors.green.600)]" 
                : stat?.type === "error" 
                   ? "border-red-500/50 bg-red-900/10" 
                   : "border-gray-700/50 hover:border-cyan-700/50";

             return (
               <Card key={attack.id} className={`flex flex-col border-2 transition-all duration-300 ${statClass} shadow-xl relative overflow-hidden group`}>
                  <h3 className="text-cyan-400 text-2xl font-bold tracking-wide mb-3 uppercase">{attack.name}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed mb-8 flex-1">{desc}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                     <div className="flex-1 mr-4 min-h-[1.5rem] flex items-center">
                        {stat?.type === "success" && <span className="text-green-400 text-xs font-bold uppercase tracking-wider animate-pulse">{stat.msg}</span>}
                        {stat?.type === "error" && <span className="text-red-400 text-xs font-bold truncate max-w-[150px] inline-block uppercase tracking-wider">{stat.msg}</span>}
                     </div>
                     <button 
                       onClick={() => injectAttack(attack.id)}
                       disabled={isLoad}
                       className="border-2 border-cyan-700 text-cyan-400 hover:bg-cyan-600 hover:text-white transition-colors duration-300 font-bold uppercase tracking-widest text-xs px-8 py-2.5 rounded shadow-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                     >
                       {isLoad ? (
                          <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                       ) : (
                          "Inject"
                       )}
                     </button>
                  </div>
                  
                  {stat?.type === "success" && (
                     <div className="absolute inset-0 bg-green-500/10 pointer-events-none animate-[flash_0.6s_ease-out]"></div>
                  )}
               </Card>
             );
          })}
        </div>

        {/* Live Feed - Right Hand Column Panel */}
        <Card title="Synthetic Trace Feed" className="xl:col-span-1 shadow-2xl flex flex-col h-full border border-gray-700/50 min-h-[400px]">
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <style dangerouslySetInnerHTML={{__html: `
                 @keyframes slideInUp {
                   from { opacity: 0; transform: translateY(20px); }
                   to { opacity: 1; transform: translateY(0); }
                 }
                 @keyframes flash {
                   0% { opacity: 0; }
                   30% { opacity: 1; }
                   100% { opacity: 0; }
                 }
                 .slide-up { animation: slideInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
              `}} />
              
              {recentInjections.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-500 italic">
                    <span className="text-xs font-semibold tracking-widest uppercase mb-4">Awaiting Signal Injections</span>
                    <div className="flex space-x-2">
                       <span className="w-2.5 h-2.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: "0ms"}}></span>
                       <span className="w-2.5 h-2.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></span>
                       <span className="w-2.5 h-2.5 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></span>
                    </div>
                 </div>
              ) : (
                 recentInjections.map((alert, i) => {
                   let badgeColor = "bg-green-600";
                   if (alert.severity === "Critical") badgeColor = "bg-red-600";
                   else if (alert.severity === "High") badgeColor = "bg-orange-500";
                   else if (alert.severity === "Medium") badgeColor = "bg-yellow-500";
                   
                   return (
                     <div key={alert.id || alert.timestamp + i} className="slide-up bg-gray-800 p-3 rounded-lg flex flex-col md:flex-row justify-between md:items-center border border-gray-600/50 shadow gap-2">
                       <div className="flex flex-col">
                         <span className="text-gray-500 text-[10px] font-mono mb-1">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "Now"}</span>
                         <span className="font-mono text-cyan-200 text-xs tracking-tight">{alert.src_ip}</span>
                       </div>
                       
                       <div className="flex items-center space-x-2 md:flex-col md:items-end md:space-x-0 md:space-y-1">
                         <span className="bg-cyan-900/60 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap uppercase tracking-wider">
                            {alert.attack_type}
                         </span>
                         <span className={`${badgeColor} text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm tracking-wider uppercase`}>
                            {alert.severity || "Low"}
                         </span>
                       </div>
                     </div>
                   );
                 })
              )}
           </div>
        </Card>
      </div>
    </div>
  );
}

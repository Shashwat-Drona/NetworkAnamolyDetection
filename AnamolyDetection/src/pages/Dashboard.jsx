import { useStream } from "../hooks/useStream";
import { useSummary } from "../hooks/useSummary";
import Card from "../components/Card";
import AlertsFeed from "../components/AlertsFeed";
import RiskIndicator from "../components/RiskIndicator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Dashboard() {
  const { summary, loading: summaryLoading, error: summaryError } = useSummary();
  const { events, error: streamError } = useStream();

  const handleStartSim = () => {
    fetch(`${API_BASE}/api/sim/start`, { method: "POST" })
      .catch(e => console.error(e));
  };
  
  const handleStopSim = () => {
    fetch(`${API_BASE}/api/sim/stop`, { method: "POST" })
      .catch(e => console.error(e));
  };

  const risk = summary?.system_risk ?? 0;

  const chartData = summary?.top_attack_types
    ? Object.entries(summary.top_attack_types).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 font-sans flex flex-col space-y-6">
      <h1 className="text-3xl font-bold text-white mb-4 tracking-wide">Flow Dynamics Architecture</h1>
      
      {summaryError && (
        <Card className="border border-red-500 mb-6">
          <p className="text-red-500 font-bold uppercase tracking-widest text-sm">Error Loading Core Summary: {summaryError}</p>
        </Card>
      )}

      {/* Top Row - 4 stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card title="Recorded Global Trace Events">
          {summaryLoading ? <div className="animate-pulse h-10 bg-gray-700/50 rounded w-1/2" /> : (
            <div className="text-4xl font-bold text-white drop-shadow-sm">{summary?.total_events ?? 0}</div>
          )}
        </Card>
        <Card title="Structural Attack Packets Count">
          {summaryLoading ? <div className="animate-pulse h-10 bg-gray-700/50 rounded w-1/2" /> : (
            <div className="text-4xl font-bold text-red-500 drop-shadow-sm">{summary?.attack_count ?? 0}</div>
          )}
        </Card>
        <Card title="Safe Benign Flow Count">
          {summaryLoading ? <div className="animate-pulse h-10 bg-gray-700/50 rounded w-1/2" /> : (
            <div className="text-4xl font-bold text-cyan-500 drop-shadow-sm">{summary?.benign_count ?? 0}</div>
          )}
        </Card>
        <Card title="Aggregated Threat Ratio Index">
          {summaryLoading ? <div className="animate-pulse h-10 bg-gray-700/50 rounded w-1/2" /> : (
             <div className="flex items-baseline space-x-2">
                <div className="text-4xl font-bold text-white drop-shadow-sm">{(summary?.attack_ratio ?? 0).toFixed(1)}</div>
                <div className="text-gray-500 font-bold text-lg">%</div>
             </div>
          )}
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="System Risk Trajectory Vector" className="h-[380px] flex flex-col items-center justify-center p-0">
           <RiskIndicator risk={risk} loading={summaryLoading} />
        </Card>

        <Card title="Live Continuous Event Alert Pipeline" className="lg:col-span-2 h-[380px] flex flex-col">
           <AlertsFeed events={events} error={streamError} />
        </Card>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        <Card title="Virtual Simulation Matrix Handlers" className="min-h-[300px] flex flex-col justify-center space-y-6">
          <p className="text-gray-500 text-xs tracking-widest uppercase font-bold text-center mb-2">Automated Node Threading Simulation Controls</p>
          <button 
            onClick={handleStartSim}
            className="w-full py-4 bg-cyan-700 hover:bg-cyan-600 text-white rounded shadow-lg font-bold transition-transform active:scale-95 uppercase tracking-widest text-xs border border-cyan-500/50"
          >
            Engage Background Threat Injection
          </button>
          <button 
            onClick={handleStopSim}
            className="w-full py-4 bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 border border-gray-600 hover:border-red-500/50 rounded shadow-sm font-bold transition-all uppercase tracking-widest text-xs"
          >
            Halt All Simulation Nodes
          </button>
        </Card>

        <Card title="High-Velocity Vector Frequency Distribution" className="lg:col-span-2 min-h-[300px] flex flex-col justify-center">
          {summaryLoading ? <div className="animate-pulse w-full h-[200px] bg-gray-700/50 rounded border border-gray-600" /> : chartData.length === 0 ? (
            <div className="text-gray-500 flex h-full items-center justify-center italic text-sm font-bold uppercase tracking-widest">No topological vectors charted</div>
          ) : (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData} margin={{ top: 10 }}>
                <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}} 
                  itemStyle={{color: '#22d3ee', fontWeight: 'bold'}} 
                />
                <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

    </div>
  );
}

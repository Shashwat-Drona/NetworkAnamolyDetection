import React, { useMemo } from "react";

function badgeForScore(score) {
  if (score >= 85) return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (score >= 30) return "bg-sky-500/15 text-sky-200 border-sky-500/30";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
}

export default function RiskScoresPanel({ riskScores = [], loading, error }) {
  const top = useMemo(() => (riskScores || []).slice(0, 8), [riskScores]);

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="text-rose-300 text-[11px] font-bold tracking-widest uppercase mb-2">
          Risk feed error: {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-700/40 rounded border border-slate-700/60" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold tracking-widest uppercase">
          No risk scores yet
        </div>
      ) : (
        <div className="flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 gap-2">
            {top.map((r) => {
              const score = Number(r.score || 0);
              return (
                <div
                  key={r.src_ip}
                  className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 hover:bg-slate-900/60 transition"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-slate-100 truncate">{r.src_ip}</div>
                    <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate">
                      {r.top_attack_type || "UNKNOWN"} • {r.event_count || 0} events
                    </div>
                  </div>
                  <div className={`shrink-0 ml-3 border rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeForScore(score)}`}>
                    {Math.round(score)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


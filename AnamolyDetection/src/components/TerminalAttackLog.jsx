import { useEffect, useMemo, useRef, useState } from "react";

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function severityStyles(sev) {
  switch (sev) {
    case "Critical":
      return { pill: "bg-rose-500/15 text-rose-200 border-rose-400/30", dot: "bg-rose-400" };
    case "High":
      return { pill: "bg-orange-500/15 text-orange-200 border-orange-400/30", dot: "bg-orange-400" };
    case "Medium":
      return { pill: "bg-amber-500/15 text-amber-200 border-amber-400/30", dot: "bg-amber-400" };
    case "Low":
      return { pill: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30", dot: "bg-emerald-400" };
    default:
      return { pill: "bg-cyan-500/10 text-cyan-200 border-cyan-400/25", dot: "bg-cyan-300" };
  }
}

export default function TerminalAttackLog({ events, isConnected }) {
  const [paused, setPaused] = useState(false);
  const [localClearedAt, setLocalClearedAt] = useState(0);
  const scrollerRef = useRef(null);

  const visible = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    const afterClear = localClearedAt
      ? list.filter((e) => {
          const t = new Date(e?.timestamp || 0).getTime();
          return Number.isFinite(t) ? t >= localClearedAt : true;
        })
      : list;

    // Terminal feel: oldest at top, newest at bottom.
    return [...afterClear].reverse().slice(-250);
  }, [events, localClearedAt]);

  useEffect(() => {
    if (paused) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible.length, paused]);

  const empty = visible.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-rose-400"} shadow-[0_0_10px_rgba(34,197,94,0.2)]`} />
          <div className="text-[11px] text-slate-300 font-extrabold tracking-widest uppercase">Threat stream</div>
          <div className="text-[10px] text-slate-500 font-bold tracking-[0.24em] uppercase">Terminal mode</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className={`px-3 py-2 rounded-xl border text-[11px] font-extrabold tracking-widest uppercase transition active:scale-[0.99] ${
              paused ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-slate-700/60 bg-slate-900/30 text-slate-100 hover:bg-slate-800/40"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setLocalClearedAt(Date.now())}
            className="px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-900/30 text-slate-100 hover:bg-slate-800/40 text-[11px] font-extrabold tracking-widest uppercase transition active:scale-[0.99]"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 bg-[#070b14] font-mono">
        {empty ? (
          <div className="h-full min-h-[280px] flex items-center justify-center">
            <div className="max-w-md w-full rounded-2xl border border-slate-800/70 bg-slate-950/30 p-6 text-center">
              <div className="text-slate-200 font-extrabold tracking-widest uppercase text-[11px]">No attacks detected</div>
              <div className="mt-2 text-slate-500 text-[12px] leading-relaxed">
                When malicious traffic is observed, events will appear here in real time.
                <br />
                Try starting the simulation or widening filters.
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/30 px-3 py-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="text-[10px] text-slate-400 font-bold tracking-[0.24em] uppercase">
                  {isConnected ? "Stream connected" : "Stream disconnected"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((e, idx) => {
              const sev = e?.severity || "Unknown";
              const s = severityStyles(sev);
              const src = e?.src_ip || "—";
              const dst = e?.dst_ip || "—";
              const typ = e?.attack_type || "Unknown";
              const conf = e?.confidence != null ? Number(e.confidence) : null;
              const confTxt = conf != null && Number.isFinite(conf) ? conf.toFixed(2) : "—";

              return (
                <div
                  key={`${e?.id || "evt"}-${e?.timestamp || idx}-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-900/60 bg-slate-950/20 hover:bg-slate-950/35 transition px-3 py-2"
                >
                  <div className="w-[78px] text-slate-500 text-[11px] pt-[1px]">{fmtTime(e?.timestamp)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[10px] font-extrabold tracking-widest uppercase ${s.pill}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {sev}
                      </span>
                      <span className="text-slate-200 text-[12px] font-bold tracking-tight truncate">
                        <span className="text-cyan-300">{src}</span>
                        <span className="text-slate-600 mx-2">→</span>
                        <span className="text-slate-200">{dst}</span>
                      </span>
                      <span className="ml-auto inline-flex items-center gap-2">
                        <span className="px-2 py-1 rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 text-[10px] font-extrabold tracking-widest uppercase">
                          {typ}
                        </span>
                        <span className="px-2 py-1 rounded-xl border border-slate-700/60 bg-slate-900/30 text-slate-300 text-[10px] font-bold tracking-widest uppercase">
                          conf {confTxt}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 tracking-tight">
                      protocol <span className="text-slate-300">{e?.protocol || "—"}</span> • packets/s{" "}
                      <span className="text-slate-300">{e?.packets_per_sec ?? "—"}</span> • flow{" "}
                      <span className="text-slate-300">{e?.flow_duration ?? "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useMemo } from "react";
import { alertKey, normalizeSeverity, severityMeta } from "../utils/alerting";

function isAttackEvent(e) {
  return e?.attack_type && e.attack_type !== "BENIGN";
}

function Panel({ title, value, badgeClass, pulse }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase">{title}</div>
        {pulse ? (
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 opacity-75 animate-[pulseRing_1.2s_ease-out_infinite]" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.55)]" />
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between">
        <div className="text-2xl font-extrabold tracking-tight text-slate-100">{value}</div>
        <div className={`text-[10px] font-extrabold tracking-widest uppercase px-2 py-1 rounded-lg ${badgeClass}`}>{title}</div>
      </div>
    </div>
  );
}

export default function AlertPanels({ events }) {
  const attacks = useMemo(() => (events || []).filter(isAttackEvent), [events]);

  const counts = useMemo(() => {
    const c = { Critical: 0, High: 0, Medium: 0, Low: 0, Unknown: 0 };
    for (const e of attacks) {
      const sev = normalizeSeverity(e?.severity);
      if (sev === "Critical") c.Critical += 1;
      else if (sev === "High") c.High += 1;
      else if (sev === "Medium") c.Medium += 1;
      else if (sev === "Low") c.Low += 1;
      else c.Unknown += 1;
    }
    return c;
  }, [attacks]);

  const topCritical = useMemo(() => attacks.filter((e) => normalizeSeverity(e?.severity) === "Critical").slice(0, 3), [attacks]);
  const topHigh = useMemo(() => attacks.filter((e) => normalizeSeverity(e?.severity) === "High").slice(0, 3), [attacks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel title="Critical" value={counts.Critical} badgeClass="bg-rose-600/20 text-rose-200 border border-rose-500/20" pulse />
        <Panel title="High" value={counts.High} badgeClass="bg-orange-500/15 text-orange-200 border border-orange-400/20" pulse={counts.High > 0} />
        <Panel title="Medium" value={counts.Medium} badgeClass="bg-amber-400/15 text-amber-200 border border-amber-300/15" />
        <Panel title="Low" value={counts.Low} badgeClass="bg-emerald-500/10 text-emerald-200 border border-emerald-400/15" />
      </div>

      <div className="lg:col-span-4 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase">Hot alerts</div>
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            {topCritical.length ? "Critical" : topHigh.length ? "High" : "—"}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {(topCritical.length ? topCritical : topHigh).length ? (
            (topCritical.length ? topCritical : topHigh).map((a, i) => {
              const meta = severityMeta(a?.severity);
              return (
                <div
                  key={alertKey(a, i)}
                  className={`flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-950/20 px-3 py-2 ring-1 ${meta.ring}`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-cyan-200 truncate">{String(a?.src_ip || "Unknown")}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate">
                      {String(a?.attack_type || "Unknown")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {meta.pulse ? (
                      <span className="relative inline-flex">
                        <span className="absolute inline-flex h-2 w-2 rounded-full bg-rose-500 opacity-75 animate-[pulseRing_1.2s_ease-out_infinite]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.55)]" />
                      </span>
                    ) : null}
                    <span className={`${meta.badge} text-[10px] font-extrabold tracking-widest uppercase px-2 py-1 rounded-lg`}>{meta.label}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 text-xs font-bold tracking-widest uppercase italic text-center py-6">No active attack alerts</div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.75; }
            70% { transform: scale(2.2); opacity: 0; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        `,
        }}
      />
    </div>
  );
}


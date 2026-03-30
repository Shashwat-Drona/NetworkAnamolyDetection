import { useMemo } from "react";

function SeverityPill({ label, enabled, onToggle }) {
  const styles = useMemo(() => {
    switch (label) {
      case "Critical":
        return enabled
          ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
          : "border-slate-700/60 bg-slate-900/30 text-slate-400";
      case "High":
        return enabled
          ? "border-orange-400/40 bg-orange-500/10 text-orange-200"
          : "border-slate-700/60 bg-slate-900/30 text-slate-400";
      case "Medium":
        return enabled
          ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
          : "border-slate-700/60 bg-slate-900/30 text-slate-400";
      case "Low":
        return enabled
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
          : "border-slate-700/60 bg-slate-900/30 text-slate-400";
      default:
        return enabled
          ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
          : "border-slate-700/60 bg-slate-900/30 text-slate-400";
    }
  }, [enabled, label]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-2 rounded-xl border text-[11px] font-extrabold tracking-widest uppercase transition active:scale-[0.99] ${styles}`}
      aria-pressed={enabled}
    >
      {label}
    </button>
  );
}

export default function StreamFilters({ filters, setFilters, attackTypes }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase mb-2">Filter by IP</div>
          <input
            value={filters.ipQuery}
            onChange={(e) => setFilters((p) => ({ ...p, ipQuery: e.target.value }))}
            placeholder="Search src/dst (e.g. 10.0.0.12)"
            className="w-full rounded-xl bg-slate-950/40 border border-slate-700/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400/30"
          />
        </div>

        <div className="md:col-span-3">
          <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase mb-2">Attack type</div>
          <select
            value={filters.attackType}
            onChange={(e) => setFilters((p) => ({ ...p, attackType: e.target.value }))}
            className="w-full rounded-xl bg-slate-950/40 border border-slate-700/60 px-4 py-3 text-slate-100 text-[12px] font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400/30"
          >
            {(attackTypes || ["All"]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase mb-2">Severity</div>
          <div className="flex flex-wrap gap-2">
            {["Critical", "High", "Medium", "Low", "Unknown"].map((sev) => (
              <SeverityPill
                key={sev}
                label={sev}
                enabled={!!filters.severities?.[sev]}
                onToggle={() =>
                  setFilters((p) => ({
                    ...p,
                    severities: { ...(p.severities || {}), [sev]: !p.severities?.[sev] },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] text-slate-500 font-bold tracking-[0.22em] uppercase">
          Tip: leave filters broad to see the full live picture.
        </div>
        <button
          type="button"
          onClick={() =>
            setFilters({
              ipQuery: "",
              attackType: "All",
              severities: { Critical: true, High: true, Medium: true, Low: true, Unknown: true },
            })
          }
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-extrabold tracking-widest uppercase border border-slate-700/60 transition active:scale-[0.99]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}


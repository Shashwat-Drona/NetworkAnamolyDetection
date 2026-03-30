import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", code: "SOC" },
  { to: "/live", label: "Live Stream", code: "LIVE" },
  { to: "/traffic", label: "Traffic", code: "NET" },
  { to: "/attacks", label: "Attacks", code: "THRT" },
  { to: "/insights", label: "Insights", code: "INTEL" },
  { to: "/simulation", label: "Simulation", code: "SIM" },
  { to: "/timeline", label: "Timeline", code: "TIME" },
  { to: "/upload", label: "Upload", code: "INGEST" },
];

function NavItem({ to, label, code, active }) {
  return (
    <NavLink
      to={to}
      className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        active
          ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
          : "border-slate-800/60 bg-slate-950/20 text-slate-300 hover:bg-slate-900/30 hover:border-slate-700/60"
      }`}
    >
      <div
        className={`h-7 w-7 rounded-lg grid place-items-center border ${
          active ? "border-cyan-400/30 bg-cyan-500/10" : "border-slate-800/70 bg-slate-950/30"
        }`}
      >
        <span className={`text-[10px] font-extrabold tracking-[0.22em] ${active ? "text-cyan-200" : "text-slate-400 group-hover:text-slate-200"}`}>
          {code}
        </span>
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-extrabold tracking-[0.24em] uppercase truncate ${active ? "text-cyan-200" : "text-slate-300"}`}>
          {label}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500 font-bold tracking-widest uppercase truncate">
          mission route
        </div>
      </div>
      {active ? <div className="absolute right-3 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.55)]" /> : null}
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex w-[286px] shrink-0 border-r border-slate-800/60 bg-slate-950/20">
      <div className="w-full px-4 py-5 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-2xl border border-slate-800/60 bg-slate-950/30 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-cyan-400/15 border border-cyan-300/20 grid place-items-center shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                <span className="text-cyan-200 font-extrabold text-[12px] tracking-widest">NS</span>
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold tracking-[0.26em] uppercase text-slate-100 truncate">
                  NetSentinel
                </div>
                <div className="mt-1 text-[10px] text-slate-500 font-bold tracking-[0.22em] uppercase truncate">
                  cyber intel console
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_14px_rgba(52,211,153,0.25)]" />
              <span className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase">live</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            operator panel • splunk-grade telemetry • gotham-grade context
          </div>
        </motion.div>

        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
          {NAV_LINKS.map((l) => {
            const active = location.pathname === l.to || location.pathname.startsWith(`${l.to}/`);
            return <NavItem key={l.to} {...l} active={active} />;
          })}
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/25 p-4">
          <div className="text-[10px] text-slate-400 font-extrabold tracking-[0.26em] uppercase">system</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-2">
              <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">mode</div>
              <div className="mt-1 text-[11px] text-slate-200 font-extrabold tracking-widest uppercase">active</div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-2">
              <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">profile</div>
              <div className="mt-1 text-[11px] text-cyan-200 font-extrabold tracking-widest uppercase">operator</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}


import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

function useRouteTitle() {
  const location = useLocation();
  return useMemo(() => {
    const p = location.pathname || "/";
    if (p.startsWith("/live")) return { kicker: "Live monitoring", title: "Mission Control Stream" };
    if (p.startsWith("/traffic")) return { kicker: "Network telemetry", title: "Traffic & Latency" };
    if (p.startsWith("/attacks")) return { kicker: "Threat registry", title: "Attacks & Investigations" };
    if (p.startsWith("/insights")) return { kicker: "Intelligence", title: "Analyst Insights" };
    if (p.startsWith("/simulation")) return { kicker: "Red-team", title: "Simulation Console" };
    if (p.startsWith("/timeline")) return { kicker: "Forensics", title: "Timeline" };
    if (p.startsWith("/upload")) return { kicker: "Ingestion", title: "Upload & Parse" };
    return { kicker: "Intrusion detection system", title: "NetSentinel SOC Overview" };
  }, [location.pathname]);
}

export default function TopBar() {
  const route = useRouteTitle();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#070A12]/70 backdrop-blur supports-[backdrop-filter]:bg-[#070A12]/50">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-w-0"
        >
          <div className="text-[10px] text-slate-500 font-extrabold tracking-[0.30em] uppercase">
            {route.kicker}
          </div>
          <div className="mt-1 text-slate-100 font-extrabold tracking-tight text-[18px] sm:text-[20px] truncate">
            {route.title}
          </div>
        </motion.div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/25 px-3 py-2">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.4)] animate-pulse" />
            <span className="text-[10px] text-slate-300 font-extrabold tracking-[0.26em] uppercase">
              uplink ok
            </span>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-slate-800/60 bg-slate-950/25 px-3 py-2 text-[10px] text-slate-200 font-extrabold tracking-[0.26em] uppercase hover:bg-slate-900/30 transition"
          >
            operator tools
          </button>
        </div>
      </div>
    </header>
  );
}


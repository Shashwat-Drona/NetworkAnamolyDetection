import React from 'react';
import { NavLink, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/traffic", label: "Traffic" },
  { to: "/attacks", label: "Attacks" },
  { to: "/insights", label: "Insights" },
  { to: "/simulation", label: "Simulation" },
  { to: "/predictor", label: "Predictor" },
  { to: "/timeline", label: "Timeline" },
  { to: "/upload", label: "Upload" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-300 via-cyan-500 to-orange-400 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.45)]">
              <span className="text-slate-950 font-black text-sm tracking-tight">NS</span>
            </div>
            <div className="leading-tight">
              <p className="text-cyan-200 font-semibold text-sm md:text-base tracking-wide">NetSentinel Console</p>
              <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-[0.2em]">Real-Time Anomaly Intelligence</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-200 font-semibold tracking-[0.18em] uppercase">Auto Response Active</span>
          </div>
        </div>

        <nav className="mt-3 overflow-x-auto scrollbar-hide">
          <ul className="flex min-w-max items-center gap-2 md:gap-3">
            {NAV_LINKS.map(({ to, label }) => {
              const isActive = location.pathname.startsWith(to) || location.pathname === to;
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={`inline-flex items-center rounded-full px-4 py-2.5 text-xs md:text-sm font-semibold tracking-wide transition-all duration-200 border ${
                      isActive
                        ? "bg-cyan-400/20 text-cyan-100 border-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                        : "bg-slate-900/50 text-slate-300 border-white/10 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    {label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

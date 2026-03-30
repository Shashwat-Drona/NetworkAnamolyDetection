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
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center shadow-[0_0_10px_theme(colors.cyan.500)]">
             <span className="text-gray-900 font-bold text-sm tracking-wider">NS</span>
          </div>
          <span className="text-cyan-400 font-bold text-lg tracking-widest uppercase shadow-sm">NetSentinel</span>
        </div>

        {/* Navigation Map */}
        <div className="flex items-center gap-[24px]">
          {NAV_LINKS.map(({ to, label }) => {
            const isActive = location.pathname.startsWith(to) || location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`text-xs font-bold tracking-widest uppercase transition-all duration-200 py-1 ${
                    isActive
                      ? "text-cyan-400 border-b-2 border-cyan-400 hover:brightness-110"
                      : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </NavLink>
            );
          })}
        </div>

        {/* System Active Status */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_theme(colors.green.500)]" />
          System Live
        </div>
        
      </div>
    </nav>
  );
}

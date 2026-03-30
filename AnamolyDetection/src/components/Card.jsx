import React from 'react';

export default function Card({ children, className = "", title = null }) {
  return (
    <div className={`rounded-2xl p-6 border border-white/10 bg-slate-900/65 shadow-[0_10px_35px_rgba(2,6,23,0.55)] transition-all duration-300 hover:border-cyan-300/35 hover:shadow-[0_14px_40px_rgba(8,145,178,0.2)] ${className}`}>
      {title && (
        <h2 className="text-slate-300 text-xs font-bold uppercase tracking-[0.16em] mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

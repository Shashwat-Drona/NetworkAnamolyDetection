import React from 'react';

export default function Card({ children, className = "", title = null }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 hover:brightness-110 transition-all duration-300 ${className}`}>
      {title && (
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

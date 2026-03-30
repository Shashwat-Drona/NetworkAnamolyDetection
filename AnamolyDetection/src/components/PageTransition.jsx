import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }) {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  // Reset opacity when path bounds change
  useEffect(() => {
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 20); // allow browser ticks
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className={`transition-opacity duration-200 ease-out w-full h-full ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}

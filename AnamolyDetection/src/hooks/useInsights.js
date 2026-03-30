import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function useInsights({ pollMs = 15000 } = {}) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInsights = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;
        setInsights(data);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInsights();
    const id = setInterval(fetchInsights, pollMs);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { insights, loading, error };
}


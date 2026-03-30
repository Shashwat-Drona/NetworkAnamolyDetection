import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * useSummary hook.
 * Fetches summary metrics from /api/summary.
 * Polls every 5s.
 * Returns { summary, loading, error }
 */
export function useSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted) {
          setSummary(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();
    const intervalId = setInterval(fetchSummary, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return { summary, loading, error };
}

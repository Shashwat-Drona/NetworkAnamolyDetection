import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function useRiskScores({ pollMs = 5000 } = {}) {
  const [riskScores, setRiskScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRisk = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/risk`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;
        setRiskScores(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRisk();
    const id = setInterval(fetchRisk, pollMs);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { riskScores, loading, error };
}


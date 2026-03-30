import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * useStream — shared SSE hook.
 * Opens /api/stream and accumulates events.
 * Returns { events, isConnected, error }
 */
export function useStream(url = `${API_BASE}/api/stream`) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev].slice(0, 100)); // maintain max 100
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError("SSE connection lost. Retrying…");
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [url]);

  return { events, isConnected, error };
}

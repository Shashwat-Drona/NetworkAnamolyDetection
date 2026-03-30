import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useAttacks(initialPage = 1, initialLimit = 50, initialFilters = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [filters, setFilters] = useState(initialFilters);
  
  const [attacks, setAttacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAttacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page || 1);
      params.append("limit", limit || 50);
      
      if (filters.attack_type && filters.attack_type !== "All") params.append("attack_type", filters.attack_type);
      if (filters.protocol && filters.protocol !== "All") params.append("protocol", filters.protocol);
      if (filters.src_ip) params.append("src_ip", filters.src_ip);
      if (filters.dst_ip) params.append("dst_ip", filters.dst_ip);

      const res = await fetch(`${API_BASE}/api/attacks?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
         setAttacks(data);
         setTotal(data.length);
      } else {
         setAttacks(data.items || data.events || []);
         setTotal(data.total || data.items?.length || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchAttacks();
  }, [fetchAttacks]);

  return { attacks, total, page, loading, error, setPage, setFilters, refetch: fetchAttacks };
}

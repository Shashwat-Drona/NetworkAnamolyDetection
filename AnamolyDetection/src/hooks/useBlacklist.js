import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let globalBlacklist = new Set();
let fetchPromise = null;
const listeners = new Set();

export function useBlacklist() {
  const [blacklist, setBlacklist] = useState(globalBlacklist);
  const [loading, setLoading] = useState(true);

  const sync = () => {
     const newSet = new Set(globalBlacklist);
     setBlacklist(newSet);
     listeners.forEach(l => l(newSet));
  };

  useEffect(() => {
    let active = true;
    const handler = (newSet) => { if (active) setBlacklist(newSet); };
    listeners.add(handler);

    if (!fetchPromise) {
      setLoading(true);
      fetchPromise = fetch(`${API_BASE}/api/blacklist`)
        .then(res => res.json())
        .then(data => {
           globalBlacklist = new Set(data.blacklisted || []);
           return globalBlacklist;
        })
        .finally(() => {
           fetchPromise = null; 
        });
    }
    
    if (fetchPromise) {
        fetchPromise.then(() => {
            if (active) {
                setBlacklist(new Set(globalBlacklist));
                setLoading(false);
            }
        });
    } else {
        setLoading(false);
    }

    return () => {
      active = false;
      listeners.delete(handler);
    };
  }, []);

  const blockIP = async (src_ip) => {
    globalBlacklist.add(src_ip);
    sync();
    
    try {
      const res = await fetch(`${API_BASE}/api/blacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src_ip })
      });
      if (!res.ok) throw new Error("Failed to block");
    } catch(err) {
      globalBlacklist.delete(src_ip);
      sync();
      throw err;
    }
  };

  const unblockIP = async (src_ip) => {
    globalBlacklist.delete(src_ip);
    sync();

    try {
      const res = await fetch(`${API_BASE}/api/blacklist/${encodeURIComponent(src_ip)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to unblock");
    } catch(err) {
      globalBlacklist.add(src_ip);
      sync();
      throw err;
    }
  };

  return { blacklist, blockIP, unblockIP, loading };
}

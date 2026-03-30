import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toEpochSecond(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}

export default function LiveTrafficChart({
  events = [],
  windowSeconds = 60,
  height = 260,
}) {
  const series = useMemo(() => {
    // Anchor the window to the latest observed event timestamp (pure, no Date.now()).
    let maxSec = null;
    for (const e of events) {
      const sec = toEpochSecond(e?.timestamp);
      if (sec == null) continue;
      if (maxSec == null || sec > maxSec) maxSec = sec;
    }

    if (maxSec == null) return { data: [], yMax: 5 };

    const start = maxSec - windowSeconds + 1;

    const buckets = new Map();
    for (let s = start; s <= maxSec; s++) {
      buckets.set(s, { t: s, total: 0, attacks: 0, benign: 0 });
    }

    for (const e of events) {
      const sec = toEpochSecond(e?.timestamp);
      if (sec == null) continue;
      if (sec < start || sec > maxSec) continue;
      const b = buckets.get(sec);
      if (!b) continue;
      b.total += 1;
      if (e.attack_type && e.attack_type !== "BENIGN") b.attacks += 1;
      else b.benign += 1;
    }

    const arr = Array.from(buckets.values());
    const max = arr.reduce((m, r) => Math.max(m, r.total), 0);
    const cap = clamp(Math.ceil(max * 1.2), 5, 999999);

    return { data: arr, yMax: cap };
  }, [events, windowSeconds]);

  if (!series.data.length) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-950/30 to-slate-900/20">
        <div className="text-center px-6">
          <div className="text-slate-200 font-extrabold tracking-widest uppercase text-[11px]">No traffic trend data</div>
          <div className="mt-2 text-slate-500 text-[12px]">Wait for stream events with timestamps.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series.data} margin={{ top: 8, right: 10, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(148,163,184,0.10)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => new Date(v * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })}
            stroke="rgba(148,163,184,0.70)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            minTickGap={24}
          />
          <YAxis
            domain={[0, series.yMax]}
            stroke="rgba(148,163,184,0.70)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "rgba(34,211,238,0.35)", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#0b1220",
              border: "1px solid rgba(51,65,85,0.9)",
              borderRadius: 10,
              color: "#e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            }}
            labelFormatter={(v) => new Date(v * 1000).toLocaleTimeString()}
            formatter={(val, name) => {
              const label = name === "total" ? "Total" : name === "attacks" ? "Attacks" : "Benign";
              return [val, label];
            }}
          />

          <Area type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} fill="url(#colorTotal)" />
          <Area type="monotone" dataKey="attacks" stroke="#fb7185" strokeWidth={2} fill="url(#colorAttacks)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


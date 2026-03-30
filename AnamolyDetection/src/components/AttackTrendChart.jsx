import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function toEpochSecond(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function AttackTrendChart({ events = [], windowSeconds = 60, height = 260 }) {
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
      buckets.set(s, { t: s, attacks: 0 });
    }

    for (const e of events) {
      const sec = toEpochSecond(e?.timestamp);
      if (sec == null) continue;
      if (sec < start || sec > maxSec) continue;

      // If the caller passed mixed benign/attacks, treat BENIGN as non-attack.
      const isAttack = !e?.attack_type || e.attack_type !== "BENIGN";
      if (!isAttack) continue;

      const b = buckets.get(sec);
      if (!b) continue;
      b.attacks += 1;
    }

    const arr = Array.from(buckets.values());
    const max = arr.reduce((m, r) => Math.max(m, r.attacks), 0);
    const cap = clamp(Math.ceil(max * 1.2), 5, 999999);
    return { data: arr, yMax: cap };
  }, [events, windowSeconds]);

  if (!series.data.length) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-950/30 to-slate-900/20">
        <div className="text-center px-6">
          <div className="text-slate-200 font-extrabold tracking-widest uppercase text-[11px]">No trend data</div>
          <div className="mt-2 text-slate-500 text-[12px]">Wait for attack timestamps to arrive.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series.data} margin={{ top: 8, right: 10, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="attackTrendGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.38} />
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
            cursor={{ stroke: "rgba(251,113,133,0.35)", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#0b1220",
              border: "1px solid rgba(51,65,85,0.9)",
              borderRadius: 10,
              color: "#e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            }}
            labelFormatter={(v) => new Date(v * 1000).toLocaleTimeString()}
            formatter={(val) => [val, "Attacks"]}
          />

          <Area type="monotone" dataKey="attacks" stroke="#fb7185" strokeWidth={2} fill="url(#attackTrendGlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


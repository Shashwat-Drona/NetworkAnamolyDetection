import React, { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f97316",
  "#94a3b8",
];

export default function AttackTypeDistribution({ distribution = [], height = 260 }) {
  const data = useMemo(() => {
    const cleaned = (distribution || [])
      .filter((d) => d && d.attack_type)
      .map((d) => ({
        name: d.attack_type,
        value: Number(d.count || 0),
      }))
      .filter((d) => d.value > 0);

    cleaned.sort((a, b) => b.value - a.value);
    const top = cleaned.slice(0, 6);
    const rest = cleaned.slice(6).reduce((s, r) => s + r.value, 0);
    if (rest > 0) top.push({ name: "Other", value: rest });
    return top;
  }, [distribution]);

  if (!data.length) {
    return (
      <div className="h-[260px] w-full flex items-center justify-center text-slate-400 text-xs font-bold tracking-widest uppercase">
        No distribution data
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={105}
            paddingAngle={2}
            stroke="rgba(15,23,42,0.65)"
            strokeWidth={2}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1220",
              border: "1px solid rgba(51,65,85,0.9)",
              borderRadius: 10,
              color: "#e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            }}
            itemStyle={{ color: "#e2e8f0", fontWeight: 700 }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


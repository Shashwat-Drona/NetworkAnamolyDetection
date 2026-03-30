import { useMemo, useState } from "react";
import Card from "../components/Card";
import { useStream } from "../hooks/useStream";
import StreamFilters from "../components/StreamFilters";
import TerminalAttackLog from "../components/TerminalAttackLog";
import GeoAttacksMap from "../components/GeoAttacksMap";
import NetworkGraph from "../components/NetworkGraph";
import AttackTrendChart from "../components/AttackTrendChart";

function isAttackEvent(e) {
  return e?.attack_type && e.attack_type !== "BENIGN";
}

function toEpochSecond(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}

function severityScore(sev) {
  switch (sev) {
    case "Critical":
      return 100;
    case "High":
      return 75;
    case "Medium":
      return 50;
    case "Low":
      return 25;
    default:
      return 0;
  }
}

function Stat({ label, value, hint }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 hover:bg-slate-900/70 transition">
      <div className="text-[10px] text-slate-400 font-bold tracking-[0.22em] uppercase">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-slate-500 font-bold tracking-widest uppercase">{hint}</div> : null}
    </div>
  );
}

export default function LiveStream() {
  const { events, isConnected, error } = useStream();
  const attackEvents = useMemo(() => (events || []).filter(isAttackEvent), [events]);

  const attackTypes = useMemo(() => {
    const set = new Set();
    for (const e of attackEvents) {
      if (e?.attack_type) set.add(e.attack_type);
    }
    return ["All", ...Array.from(set).sort()];
  }, [attackEvents]);

  const [filters, setFilters] = useState({
    ipQuery: "",
    attackType: "All",
    severities: {
      Critical: true,
      High: true,
      Medium: true,
      Low: true,
      Unknown: true,
    },
  });

  const filtered = useMemo(() => {
    const q = filters.ipQuery.trim();
    return attackEvents.filter((e) => {
      if (filters.attackType !== "All" && e.attack_type !== filters.attackType) return false;

      const sev = e?.severity || "Unknown";
      if (!filters.severities?.[sev]) return false;

      if (q) {
        const src = String(e?.src_ip || "");
        const dst = String(e?.dst_ip || "");
        if (!src.includes(q) && !dst.includes(q)) return false;
      }
      return true;
    });
  }, [attackEvents, filters]);

  const stats = useMemo(() => {
    // Anchor time windows to the latest observed event timestamp (pure, no Date.now()).
    let nowSec = null;
    for (const e of filtered) {
      const sec = toEpochSecond(e?.timestamp);
      if (sec == null) continue;
      if (nowSec == null || sec > nowSec) nowSec = sec;
    }

    if (nowSec == null) {
      return {
        last60: 0,
        last5m: 0,
        uniqueSrc: 0,
        uniqueDst: 0,
        topType: "—",
        avgRisk: 0,
        deltaHint: null,
      };
    }

    const last60Start = nowSec - 60;
    const prev60Start = nowSec - 120;
    const last5mStart = nowSec - 300;

    let last60 = 0;
    let prev60 = 0;
    let last5m = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const srcSet = new Set();
    const dstSet = new Set();
    const typeCounts = new Map();

    for (const e of filtered) {
      const sec = toEpochSecond(e?.timestamp);
      if (sec == null) continue;
      if (sec >= last5mStart) last5m += 1;
      if (sec >= last60Start) last60 += 1;
      else if (sec >= prev60Start) prev60 += 1;

      if (e?.src_ip) srcSet.add(String(e.src_ip));
      if (e?.dst_ip) dstSet.add(String(e.dst_ip));

      const t = String(e?.attack_type || "Unknown");
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);

      const s = severityScore(e?.severity);
      scoreSum += s;
      scoreCount += 1;
    }

    let topType = "—";
    let topCount = 0;
    for (const [t, c] of typeCounts.entries()) {
      if (c > topCount) {
        topCount = c;
        topType = t;
      }
    }

    const delta = last60 - prev60;
    const deltaHint = prev60 === 0 ? null : `${delta >= 0 ? "+" : ""}${delta} vs prev 60s`;
    const avgRisk = scoreCount ? Math.round(scoreSum / scoreCount) : 0;

    return {
      last60,
      last5m,
      uniqueSrc: srcSet.size,
      uniqueDst: dstSet.size,
      topType,
      avgRisk,
      deltaHint,
    };
  }, [filtered]);

  return (
    <div className="bg-gray-900 min-h-screen text-cyan-400 p-6 font-sans max-w-screen-2xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <div className="text-slate-400 text-[10px] font-bold tracking-[0.28em] uppercase">Live Monitoring</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Live Attack Stream</h1>
          <div className="mt-2 text-[11px] text-slate-400 font-bold tracking-widest uppercase">
            Streaming threat telemetry • filter and investigate in real time
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-2 rounded-xl border text-[11px] font-bold tracking-widest uppercase ${
              isConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {isConnected ? "Stream connected" : "Stream disconnected"}
          </div>
          <div className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">
            Buffer: {events?.length ?? 0}/100 • Attacks: {attackEvents.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 mb-4">
        <Stat label="Attacks (last 60s)" value={stats.last60} hint={stats.deltaHint || "Real-time window"} />
        <Stat label="Attacks (last 5m)" value={stats.last5m} hint="Rolling window" />
        <Stat label="Unique sources" value={stats.uniqueSrc} hint="From filtered set" />
        <Stat label="Unique destinations" value={stats.uniqueDst} hint="From filtered set" />
        <Stat label="Top attack type" value={stats.topType} hint="By frequency" />
        <Stat label="Avg severity score" value={stats.avgRisk} hint="0–100" />
      </div>

      <Card className="border border-slate-700/60 bg-slate-900/40 rounded-2xl mb-4">
        <StreamFilters filters={filters} setFilters={setFilters} attackTypes={attackTypes} />
        {error && <div className="mt-3 text-rose-300 text-[11px] font-bold tracking-widest uppercase">{error}</div>}
      </Card>

      <Card
        title="Attack rate trends (last 120s)"
        className="border border-slate-700/60 bg-slate-900/40 rounded-2xl p-0 overflow-hidden mb-4"
      >
        <div className="px-4 pb-4 pt-2">
          <AttackTrendChart events={filtered} windowSeconds={120} height={240} />
          <div className="mt-2 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Rolling curve from stream timestamps (filtered attacks)
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pb-8">
        <Card
          title="Live logs (terminal)"
          className="xl:col-span-7 border border-slate-700/60 bg-slate-900/40 rounded-2xl h-[560px] flex flex-col p-0 overflow-hidden"
        >
          <TerminalAttackLog events={filtered} isConnected={isConnected} />
        </Card>

        <div className="xl:col-span-5 grid grid-cols-1 gap-4">
          <Card title="Geo map of attacks" className="border border-slate-700/60 bg-slate-900/40 rounded-2xl h-[270px] p-0 overflow-hidden">
            <GeoAttacksMap events={filtered} />
          </Card>
          <Card title="Network graph visualization" className="border border-slate-700/60 bg-slate-900/40 rounded-2xl h-[270px] p-0 overflow-hidden">
            <NetworkGraph events={filtered} />
          </Card>
        </div>
      </div>
    </div>
  );
}


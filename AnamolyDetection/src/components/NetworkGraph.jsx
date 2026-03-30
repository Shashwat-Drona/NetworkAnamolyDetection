import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { extractGeo } from "../utils/geo";

function severityRank(sev) {
  switch (sev) {
    case "Critical":
      return 4;
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
    default:
      return 0;
  }
}

function severityToColor(sev) {
  switch (sev) {
    case "Critical":
      return "rgba(244,63,94,0.75)";
    case "High":
      return "rgba(251,146,60,0.70)";
    case "Medium":
      return "rgba(251,191,36,0.65)";
    case "Low":
      return "rgba(52,211,153,0.60)";
    default:
      return "rgba(34,211,238,0.45)";
  }
}

function kindToColor(kind) {
  return kind === "src" ? { stroke: "rgba(34,211,238,0.95)", fill: "rgba(34,211,238,0.35)" } : { stroke: "rgba(148,163,184,0.9)", fill: "rgba(148,163,184,0.32)" };
}

function clampLat(lat) {
  return Math.max(-85, Math.min(85, lat));
}

function FitToBounds({ bounds, padding = [18, 18] }) {
  const map = useMap();
  const didFitRef = useRef(false);
  useEffect(() => {
    const hasBounds = !!bounds?.length;
    if (!hasBounds) {
      didFitRef.current = false;
      return;
    }
    if (didFitRef.current) return;
    map.fitBounds(bounds, { padding, maxZoom: 4, animate: true, duration: 0.6 });
    didFitRef.current = true;
  }, [bounds, map, padding]);
  return null;
}

function Empty() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-950/30 to-slate-900/20">
      <div className="text-center px-6">
        <div className="text-slate-200 font-extrabold tracking-widest uppercase text-[11px]">No attacks detected</div>
        <div className="mt-2 text-slate-500 text-[12px]">Topology overlay populates from src → dst relationships.</div>
      </div>
    </div>
  );
}

function buildGeoTopology(events, maxEdges = 70) {
  const list = Array.isArray(events) ? events : [];

  const nodes = new Map();
  const nodeDegree = new Map(); // id -> { in, out }
  const edges = new Map(); // key -> { source,target,sev,sevRank,count,attack_type }

  for (const e of list.slice(0, maxEdges)) {
    const srcIp = String(e?.src_ip || "");
    const dstIp = String(e?.dst_ip || "");
    if (!srcIp || !dstIp) continue;

    const srcId = `src:${srcIp}`;
    const dstId = `dst:${dstIp}`;

    const srcGeo = extractGeo(e, "src");
    const dstGeo = extractGeo(e, "dst");
    const srcLat = Number(srcGeo?.lat);
    const srcLon = Number(srcGeo?.lon);
    const dstLat = Number(dstGeo?.lat);
    const dstLon = Number(dstGeo?.lon);

    if (![srcLat, srcLon, dstLat, dstLon].every(Number.isFinite)) continue;

    if (!nodes.has(srcId)) nodes.set(srcId, { id: srcId, label: srcIp, kind: "src", lat: clampLat(srcLat), lon: srcLon });
    if (!nodes.has(dstId)) nodes.set(dstId, { id: dstId, label: dstIp, kind: "dst", lat: clampLat(dstLat), lon: dstLon });

    const srcDeg = nodeDegree.get(srcId) || { in: 0, out: 0 };
    srcDeg.out += 1;
    nodeDegree.set(srcId, srcDeg);

    const dstDeg = nodeDegree.get(dstId) || { in: 0, out: 0 };
    dstDeg.in += 1;
    nodeDegree.set(dstId, dstDeg);

    const sev = e?.severity || "Unknown";
    const r = severityRank(sev);
    const key = `${srcId}=>${dstId}`;

    if (!edges.has(key)) {
      edges.set(key, {
        key,
        source: srcId,
        target: dstId,
        sev,
        sevRank: r,
        count: 1,
        attack_type: e?.attack_type || "Unknown",
      });
    } else {
      const curr = edges.get(key);
      curr.count += 1;
      // Keep the most severe label for color/weight.
      if (r > curr.sevRank) {
        curr.sevRank = r;
        curr.sev = sev;
        curr.attack_type = e?.attack_type || curr.attack_type;
      }
      edges.set(key, curr);
    }
  }

  const nodeArr = Array.from(nodes.values());
  const edgeArr = Array.from(edges.values()).slice(0, maxEdges);

  return { nodes: nodeArr, edges: edgeArr, nodeDegree };
}

export default function NetworkGraph({ events }) {
  const graph = useMemo(() => buildGeoTopology(events, 65), [events]);
  const nodeIndex = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const hasData = graph.nodes?.length && graph.edges?.length;
  if (!hasData) return <Empty />;

  const bounds = graph.nodes
    .map((n) => [n.lat, n.lon])
    .filter((p) => p.every(Number.isFinite))
    .map((p) => /** @type {[number, number]} */ (p));

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[20, 0]}
        zoom={1}
        minZoom={1}
        maxZoom={6}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToBounds bounds={bounds} />

        {graph.edges.map((e) => {
          const a = nodeIndex.get(e.source);
          const b = nodeIndex.get(e.target);
          if (!a || !b) return null;

          const color = severityToColor(e.sev);
          const w = Math.max(1, Math.min(6, 1.5 + Math.log10(e.count + 1) * 1.6 + e.sevRank * 0.55));

          return (
            <Polyline
              key={e.key}
              positions={[
                [a.lat, a.lon],
                [b.lat, b.lon],
              ]}
              pathOptions={{ color, weight: w, opacity: 0.62, dashArray: "5 8" }}
            >
              <Tooltip direction="top" offset={[0, -4]} sticky opacity={1}>
                <div className="text-[11px] font-bold tracking-widest uppercase">{e.attack_type}</div>
                <div className="mt-1 text-[11px] font-mono text-slate-200">
                  {a.label} → {b.label}
                  {" • "}
                  {e.sev}
                  {" • "}
                  {e.count} events
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {graph.nodes.map((n) => {
          const deg = graph.nodeDegree.get(n.id) || { in: 0, out: 0 };
          const total = deg.in + deg.out;
          const r = Math.max(4, Math.min(12, 4 + Math.log10(total + 1) * 3));
          const c = kindToColor(n.kind);

          return (
            <CircleMarker
              key={n.id}
              center={[n.lat, n.lon]}
              radius={r}
              pathOptions={{ color: c.stroke, weight: 2, fillColor: c.fill, fillOpacity: 0.95 }}
            >
              <Tooltip direction="right" offset={[10, 0]} opacity={1}>
                <div className="text-[10px] text-slate-200 font-bold tracking-widest uppercase">
                  {n.kind.toUpperCase()}
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-200">{n.label}</div>
                <div className="mt-1 text-[11px] font-mono text-slate-400">
                  out {deg.out} • in {deg.in}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "rgba(34,211,238,0.95)" }} />
          <span className="text-[10px] text-slate-400 font-bold tracking-[0.24em] uppercase">Src</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "rgba(148,163,184,0.9)" }} />
          <span className="text-[10px] text-slate-400 font-bold tracking-[0.24em] uppercase">Dst</span>
        </div>
      </div>
    </div>
  );
}


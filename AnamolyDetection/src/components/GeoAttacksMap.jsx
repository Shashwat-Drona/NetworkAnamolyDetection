import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { extractGeo } from "../utils/geo";

function severityColor(sev) {
  switch (sev) {
    case "Critical":
      return { stroke: "rgba(244,63,94,0.9)", fill: "rgba(244,63,94,0.75)" };
    case "High":
      return { stroke: "rgba(251,146,60,0.85)", fill: "rgba(251,146,60,0.72)" };
    case "Medium":
      return { stroke: "rgba(251,191,36,0.85)", fill: "rgba(251,191,36,0.7)" };
    case "Low":
      return { stroke: "rgba(52,211,153,0.8)", fill: "rgba(52,211,153,0.68)" };
    default:
      return { stroke: "rgba(34,211,238,0.75)", fill: "rgba(34,211,238,0.62)" };
  }
}

function EmptyMap() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-950/30 to-slate-900/20">
      <div className="text-center px-6">
        <div className="text-slate-200 font-extrabold tracking-widest uppercase text-[11px]">No attacks detected</div>
        <div className="mt-2 text-slate-500 text-[12px]">Map populates when threats arrive.</div>
      </div>
    </div>
  );
}

function FitToBounds({ bounds, padding = [18, 18] }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds?.length) return;
    map.fitBounds(bounds, { padding, maxZoom: 4, animate: true, duration: 0.6 });
  }, [bounds, map, padding]);
  return null;
}

function clampLat(lat) {
  return Math.max(-85, Math.min(85, lat));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function arcMidpoint(from, to) {
  const midLat = (from[0] + to[0]) / 2;
  const midLon = (from[1] + to[1]) / 2;
  const lonDelta = Math.abs(from[1] - to[1]);
  const latDelta = Math.abs(from[0] - to[0]);

  // Arc "height" scales with distance, capped for readability.
  const bump = Math.min(28, Math.max(6, (lonDelta + latDelta) / 6));
  const sign = from[1] < to[1] ? 1 : -1;
  return [clampLat(midLat + bump * sign * 0.35), midLon];
}

function quadBezier(p0, p1, p2, t) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
}

function MovingDot({ from, via, to, color, durationMs = 1600, radius = 4 }) {
  const [center, setCenter] = useState(from);
  const rafRef = useRef(0);
  const lastPaintRef = useRef(0);

  useEffect(() => {
    const start = performance.now();

    const tick = (now) => {
      const t = ((now - start) % durationMs) / durationMs; // [0,1)
      const [lat, lon] = via ? quadBezier(from, via, to, t) : [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];

      // Throttle React updates a bit; Leaflet SVG is expensive at 60fps.
      if (now - lastPaintRef.current > 50) {
        lastPaintRef.current = now;
        setCenter([lat, lon]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [from, to, durationMs]);

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
        className: "attack-dot",
      }}
    />
  );
}

export default function GeoAttacksMap({ events }) {
  const data = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    // Render up to 60 recent attacks (newest first in stream) => take first N
    const attacks = list.filter((e) => e?.attack_type && e.attack_type !== "BENIGN");
    return attacks.slice(0, 60).map((e) => {
      const src = extractGeo(e, "src");
      const dst = extractGeo(e, "dst");
      return { e, src, dst };
    });
  }, [events]);

  if (!data.length) return <EmptyMap />;

  const bounds = data
    .flatMap(({ src, dst }) => [
      [clampLat(src.lat), src.lon],
      [clampLat(dst.lat), dst.lon],
    ])
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

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

        {data.map(({ e, src, dst }, i) => {
          const sev = e?.severity || "Unknown";
          const c = severityColor(sev);
          const srcPos = [clampLat(src.lat), src.lon];
          const dstPos = [clampLat(dst.lat), dst.lon];
          const midPos = arcMidpoint(srcPos, dstPos);
          const arc = [srcPos, midPos, dstPos];

          const key = `${e?.id || "evt"}-${e?.timestamp || i}-${i}`;
          const label = `${e?.attack_type || "Attack"} • ${sev}`;
          const srcLabel = String(e?.src_ip || "src");
          const dstLabel = String(e?.dst_ip || "dst");
          const sevKey = String(sev || "Unknown").toLowerCase().replace(/\s+/g, "-");

          return [
            <Polyline
              key={`${key}-path`}
              positions={arc}
              pathOptions={{
                color: c.stroke,
                weight: 2,
                opacity: 0.65,
                dashArray: "6 10",
                className: `attack-arc attack-arc--${sevKey}`,
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-[11px] font-bold tracking-widest uppercase">{label}</div>
                <div className="mt-1 text-[11px] font-mono text-slate-200">{srcLabel} → {dstLabel}</div>
              </Tooltip>
            </Polyline>,
            <MovingDot
              key={`${key}-dot`}
              from={srcPos}
              via={midPos}
              to={dstPos}
              color={c.stroke}
              durationMs={sev === "Critical" ? 900 : sev === "High" ? 1200 : 1600}
              radius={sev === "Critical" ? 5 : 4}
            />,
            <CircleMarker
              key={`${key}-src`}
              center={srcPos}
              radius={6}
              pathOptions={{ color: c.stroke, weight: 2, fillColor: c.fill, fillOpacity: 0.9 }}
            >
              <Tooltip direction="right" offset={[8, 0]} opacity={1}>
                <div className="text-[10px] text-slate-200 font-bold tracking-widest uppercase">Source</div>
                <div className="mt-1 text-[11px] font-mono text-slate-200">{srcLabel}</div>
              </Tooltip>
            </CircleMarker>,
            <CircleMarker
              key={`${key}-dst`}
              center={dstPos}
              radius={5}
              pathOptions={{
                color: "rgba(148,163,184,0.85)",
                weight: 2,
                fillColor: "rgba(148,163,184,0.55)",
                fillOpacity: 0.85,
                className: "attack-dst",
              }}
            >
              <Tooltip direction="left" offset={[-8, 0]} opacity={1}>
                <div className="text-[10px] text-slate-200 font-bold tracking-widest uppercase">Destination</div>
                <div className="mt-1 text-[11px] font-mono text-slate-200">{dstLabel}</div>
              </Tooltip>
            </CircleMarker>,
          ];
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
        <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
        <span className="text-[10px] text-slate-300 font-bold tracking-[0.24em] uppercase">
          Real geo map • src → dst paths • deterministic geo fallback if not provided
        </span>
      </div>
    </div>
  );
}


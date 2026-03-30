function hashStringToUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Convert to [0,1)
  return (h >>> 0) / 4294967296;
}

/**
 * Deterministic pseudo-geolocation.
 * If backend doesn't supply geo, this makes the UI usable and consistent during demos.
 */
export function ipToLatLon(ip, salt = "src") {
  const s = `${salt}:${ip || "unknown"}`;
  const a = hashStringToUnit(s);
  const b = hashStringToUnit(`${s}:b`);

  // Keep within plausible populated latitude bands.
  const lat = -55 + a * 125; // [-55, 70]
  const lon = -170 + b * 340; // [-170, 170]
  return { lat, lon };
}

export function extractGeo(event, which /* "src" | "dst" */) {
  const w = which === "dst" ? "dst" : "src";

  const latKey = `${w}_lat`;
  const lonKey = `${w}_lon`;
  const lat = Number(event?.[latKey]);
  const lon = Number(event?.[lonKey]);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };

  const geo = event?.geo || event?.[`${w}_geo`];
  const glat = Number(geo?.lat ?? geo?.latitude);
  const glon = Number(geo?.lon ?? geo?.lng ?? geo?.longitude);
  if (Number.isFinite(glat) && Number.isFinite(glon)) return { lat: glat, lon: glon };

  const ip = event?.[`${w}_ip`] || event?.[`${w}Ip`] || event?.[`${w}_address`];
  return ipToLatLon(String(ip || "unknown"), w);
}


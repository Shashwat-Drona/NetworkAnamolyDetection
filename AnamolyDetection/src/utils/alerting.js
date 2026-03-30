export function normalizeSeverity(sev) {
  const s = String(sev || "").trim();
  if (!s) return "Unknown";
  const lower = s.toLowerCase();
  if (lower === "critical") return "Critical";
  if (lower === "high") return "High";
  if (lower === "medium") return "Medium";
  if (lower === "low") return "Low";
  if (lower === "info" || lower === "informational") return "Info";
  return s[0].toUpperCase() + s.slice(1);
}

export function severityMeta(sev) {
  const s = normalizeSeverity(sev);
  switch (s) {
    case "Critical":
      return { label: "Critical", badge: "bg-rose-600 text-white", ring: "ring-rose-500/40", pulse: true };
    case "High":
      return { label: "High", badge: "bg-orange-500 text-white", ring: "ring-orange-400/30", pulse: true };
    case "Medium":
      return { label: "Medium", badge: "bg-amber-400 text-slate-950", ring: "ring-amber-300/25", pulse: false };
    case "Low":
      return { label: "Low", badge: "bg-emerald-500 text-slate-950", ring: "ring-emerald-400/20", pulse: false };
    case "Info":
      return { label: "Info", badge: "bg-sky-500 text-white", ring: "ring-sky-400/20", pulse: false };
    default:
      return { label: s || "Unknown", badge: "bg-slate-600 text-white", ring: "ring-slate-400/20", pulse: false };
  }
}

export function alertKey(a, fallbackIndex = 0) {
  const id = a?.id ?? a?._id ?? "";
  const ts = a?.timestamp ?? a?.time ?? "";
  const src = a?.src_ip ?? "";
  const dst = a?.dst_ip ?? "";
  const type = a?.attack_type ?? "";
  return String(id || `${ts}|${src}|${dst}|${type}|${fallbackIndex}`);
}

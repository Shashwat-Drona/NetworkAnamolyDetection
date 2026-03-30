let ctx = null;
let masterGain = null;
let armed = false;
let lastPlayAt = 0;

function ensureContext() {
  if (ctx && masterGain) return { ctx, masterGain };
  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) return null;
  ctx = new AudioContextImpl();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(ctx.destination);
  return { ctx, masterGain };
}

export async function armAudio() {
  const res = ensureContext();
  if (!res) return false;
  try {
    if (res.ctx.state === "suspended") await res.ctx.resume();
    armed = true;
    return true;
  } catch {
    return false;
  }
}

export function isAudioArmed() {
  return armed;
}

function pickTone(severity) {
  switch (severity) {
    case "Critical":
      return { freq: 880, durMs: 180, type: "square" };
    case "High":
      return { freq: 660, durMs: 140, type: "sawtooth" };
    default:
      return { freq: 520, durMs: 100, type: "sine" };
  }
}

export function playAlertBeep(severity, { minIntervalMs = 900 } = {}) {
  if (!armed) return false;
  const res = ensureContext();
  if (!res) return false;

  const now = performance.now();
  if (now - lastPlayAt < minIntervalMs) return false;
  lastPlayAt = now;

  const { freq, durMs, type } = pickTone(severity);
  const osc = res.ctx.createOscillator();
  const g = res.ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0.0001;

  osc.connect(g);
  g.connect(res.masterGain);

  const t0 = res.ctx.currentTime;
  const t1 = t0 + durMs / 1000;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  osc.start(t0);
  osc.stop(t1 + 0.02);
  return true;
}

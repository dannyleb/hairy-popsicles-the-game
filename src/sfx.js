// Procedural sound effects (Web Audio, no files). unlock() must run inside
// a real user gesture or phones stay silent.
let ctx = null, master = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

function noise(duration) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(node, t, peak, attack, release) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  node.connect(g);
  g.connect(master);
  return g;
}

function tone(type, f0, f1, dur, peak = 0.4, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(o, t, peak, 0.01, dur);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function burst(freq, q, dur, peak, type = "lowpass", delay = 0) {
  const t = ctx.currentTime + delay;
  const n = noise(dur + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  n.connect(f);
  env(f, t, peak, 0.004, dur);
  n.start(t);
}

const ready = () => ctx && ctx.state === "running";

export const sfx = {
  slap() {
    if (!ready()) return;
    burst(2600, 0.8, 0.09, 0.9, "bandpass");
    burst(500, 1, 0.12, 0.5);
    tone("sine", 180, 60, 0.12, 0.5);
  },
  splash() {
    if (!ready()) return;
    burst(1800, 2, 0.35, 0.35, "bandpass");
    for (let i = 0; i < 4; i++) tone("sine", 900 + Math.random() * 900, 300, 0.06, 0.12, 0.05 + i * 0.07);
  },
  pop() {
    if (!ready()) return;
    tone("sine", 600, 1400, 0.08, 0.5);
    burst(3000, 1, 0.05, 0.4, "highpass");
  },
  splort() {
    if (!ready()) return;
    burst(700, 3, 0.4, 0.7);
    tone("sawtooth", 140, 45, 0.35, 0.25);
  },
  grab() {
    if (!ready()) return;
    tone("triangle", 300, 520, 0.09, 0.3);
  },
  drip() {
    if (!ready()) return;
    tone("sine", 1400, 500, 0.12, 0.3);
  },
  gulp() {
    if (!ready()) return;
    tone("sine", 220, 90, 0.18, 0.6);
    tone("sine", 160, 70, 0.22, 0.5, 0.2);
  },
  burp() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(70, t + 0.7);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 28;
    lg.gain.value = 18;
    lfo.connect(lg); lg.connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 700;
    o.connect(f);
    env(f, t, 0.6, 0.05, 0.75);
    o.start(t); lfo.start(t);
    o.stop(t + 0.9); lfo.stop(t + 0.9);
  },
  grunt() {
    if (!ready()) return;
    const f = 90 + Math.random() * 120;
    tone("sawtooth", f, f * 0.7, 0.18, 0.2);
  },
  rustle() {
    if (!ready()) return;
    burst(4000, 0.5, 1.2, 0.25, "highpass");
  },
};

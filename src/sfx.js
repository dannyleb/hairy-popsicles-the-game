// Procedural sound effects (Web Audio, no files). unlock() must run inside
// a real user gesture or phones stay silent.
let ctx = null, master = null, buzzNode = null, ambience = null;

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
  // A wet bubble popping: a fast upward pitch blip with a click, then a
  // small low blub.
  bubble(size = 1, combo = 1) {
    if (!ready()) return;
    const f = (520 / Math.sqrt(size)) * Math.pow(1.07, Math.min(combo - 1, 14));
    tone("sine", f, f * 3.2, 0.045, 0.55);
    burst(4200, 1.2, 0.025, 0.5, "highpass");
    tone("sine", f * 0.45, f * 0.25, 0.12, 0.35, 0.04);
  },
  // Slurping up a glob of pus; the pitch climbs during a streak.
  bloop(streak = 0) {
    if (!ready()) return;
    const f = 380 * Math.pow(1.06, Math.min(streak, 24));
    tone("sine", f, f * 1.7, 0.07, 0.3);
  },
  // One squelchy footstep on skin.
  squish(run = false) {
    if (!ready()) return;
    const v = run ? 0.32 : 0.22;
    burst(380 + Math.random() * 380, 5 + Math.random() * 4, 0.1 + Math.random() * 0.05, v, "bandpass");
    tone("sine", 140 + Math.random() * 50, 55, 0.11, v * 0.8);
    if (Math.random() < 0.35) tone("sine", 900 + Math.random() * 500, 1500, 0.03, 0.06, 0.06);
  },
  // Pocketing a scrap: a dry little tick.
  pick() {
    if (!ready()) return;
    tone("triangle", 900 + Math.random() * 200, 1400, 0.05, 0.22);
    burst(3500, 2, 0.03, 0.15, "bandpass");
  },
  swat() {
    if (!ready()) return;
    burst(1800, 0.7, 0.08, 0.9, "bandpass");
    tone("sine", 220, 70, 0.1, 0.4);
  },
  // Continuous fly buzz; level 0..1 by how close the nearest fly is.
  buzz(level) {
    if (!ready()) return;
    if (!buzzNode) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 205;
      const wob = ctx.createOscillator();
      const wg = ctx.createGain();
      wob.frequency.value = 7;
      wg.gain.value = 14;
      wob.connect(wg); wg.connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(master);
      o.start(); wob.start();
      buzzNode = g;
    }
    buzzNode.gain.setTargetAtTime(level * 0.09, ctx.currentTime, 0.1);
  },
  // A little music-box chime: album pages, achievements.
  chime() {
    if (!ready()) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone("triangle", f, f, 0.35, 0.18, i * 0.09));
  },
  // Golden whitehead: a wet fanfare.
  jackpot() {
    if (!ready()) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone("square", f, f * 1.01, 0.18, 0.12, i * 0.07));
    burst(1500, 1.5, 0.6, 0.35, "bandpass", 0.1);
  },
  buy() {
    if (!ready()) return;
    tone("triangle", 660, 660, 0.08, 0.25);
    tone("triangle", 990, 990, 0.18, 0.25, 0.08);
  },
  // A quiet ambient bed per zone: the west gurgles, the east squeaks.
  zone(name) {
    if (!ready()) return;
    if (!ambience) {
      const mk = (build) => { const g = ctx.createGain(); g.gain.value = 0; build(g); g.connect(master); return g; };
      ambience = {
        hub: mk(() => {}),
        west: mk((g) => {
          const n = noise(4);
          n.loop = true;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass"; f.frequency.value = 260; f.Q.value = 8;
          const lfo = ctx.createOscillator(), lg = ctx.createGain();
          lfo.frequency.value = 0.7; lg.gain.value = 140;
          lfo.connect(lg); lg.connect(f.frequency);
          n.connect(f); f.connect(g);
          n.start(); lfo.start();
        }),
        east: mk((g) => {
          for (const fr of [1760, 2217, 2637]) {
            const o = ctx.createOscillator(), og = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
            o.type = "sine"; o.frequency.value = fr;
            lfo.frequency.value = 3 + fr / 1000; lg.gain.value = 0.5;
            og.gain.value = 0.5;
            lfo.connect(lg); lg.connect(og.gain);
            o.connect(og); og.connect(g);
            o.start(); lfo.start();
          }
        }),
      };
    }
    const level = { hub: 0, west: 0.16, east: 0.03 };
    for (const [k, g] of Object.entries(ambience)) g.gain.setTargetAtTime(k === name ? level[k] : 0, ctx.currentTime, 1.2);
  },
  // Foot in a puddle: a short wet slap; pus is thicker and lower.
  splish(thick = false) {
    if (!ready()) return;
    burst(thick ? 900 : 1600, 2.5, 0.16, 0.5, "bandpass");
    tone("sine", thick ? 300 : 520, thick ? 120 : 220, 0.09, 0.3);
    for (let i = 0; i < 3; i++) tone("sine", 1100 + Math.random() * 900, 600, 0.04, 0.08, 0.04 + i * 0.05);
  },
  rustle() {
    if (!ready()) return;
    burst(4000, 0.5, 1.2, 0.25, "highpass");
  },
};

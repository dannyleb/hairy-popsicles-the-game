// Day/night cycle. `phase` runs 0..1 over one full day:
//   0.00 dawn · 0.08-0.40 day · 0.50 dusk · 0.58-0.90 night · 1.00 dawn
// Each key gives a sky tint (multiplied over the skin wall), a world tint
// (multiplied over the ground and everyone on it), and how bright the
// stars and pus-flies are.
export const CYCLE_SECONDS = 240;
export const START_PHASE = 0.1;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const DAWN = { sky: ["#f3a98a", 0.35], world: ["#ffb48f", 0.2], stars: 0.15 };
const DAY = { sky: ["#ffffff", 0], world: ["#ffffff", 0], stars: 0 };
const DUSK = { sky: ["#e8706a", 0.5], world: ["#ff8f6a", 0.28], stars: 0.1 };
const NIGHT = { sky: ["#2a2350", 0.82], world: ["#3e3470", 0.55], stars: 1 };

const KEYS = [
  [0, DAWN], [0.08, DAY], [0.4, DAY], [0.5, DUSK], [0.58, NIGHT], [0.9, NIGHT], [1, DAWN],
];

function mixTint(a, b, t) {
  const ca = hex(a[0]), cb = hex(b[0]);
  // Fade color from whichever side is actually visible.
  const wa = a[1] || 0.0001, wb = b[1] || 0.0001;
  const k = (t * wb) / ((1 - t) * wa + t * wb);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return [`rgb(${c.join(",")})`, a[1] + (b[1] - a[1]) * t];
}

export function environment(phase) {
  const p = ((phase % 1) + 1) % 1;
  let i = 0;
  while (KEYS[i + 1][0] < p) i++;
  const [p0, a] = KEYS[i], [p1, b] = KEYS[i + 1];
  const t = (p - p0) / (p1 - p0 || 1);
  return {
    sky: mixTint(a.sky, b.sky, t),
    world: mixTint(a.world, b.world, t),
    stars: a.stars + (b.stars - a.stars) * t,
    // Sun is up for phase 0..0.5, moon for 0.5..1; progress 0..1 across the sky.
    sun: p < 0.5 ? p / 0.5 : null,
    moon: p >= 0.5 ? (p - 0.5) / 0.5 : null,
  };
}

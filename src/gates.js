// Hedges of hair. Permanent ones fence the edges of the page; the two gate
// hedges wither away when Toad has eaten enough.
import { AREA } from "./config.js";
import { hedgeTexture } from "./ink.js";

const kinds = [];
const clumpImg = () => {
  if (kinds.length < 5) kinds.push(hedgeTexture());
  return kinds[Math.floor(Math.random() * kinds.length)];
};

// A row of hair clumps from (x0, g0) to (x1, g1).
function row(x0, g0, x1, g1, { height = 1.6, spacing = 0.5 } = {}) {
  const len = Math.hypot(x1 - x0, (g1 - g0) * 2.5);
  const n = Math.ceil(len / spacing);
  return Array.from({ length: n }, (_, i) => {
    const t = (i + Math.random() * 0.8) / n;
    const img = clumpImg();
    const h = height * (0.75 + Math.random() * 0.6);
    return {
      img, h, w: h * (img.width / img.height),
      x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * 0.4,
      g: g0 + (g1 - g0) * t,
      flip: Math.random() < 0.5,
    };
  });
}

export function buildHedges() {
  const { minX, maxX, front, gateX } = AREA;
  const e = 1.4;
  const edges = [
    ...row(minX - e, -0.05, maxX + e, -0.05, { height: 1.5, spacing: 0.45 }),
    ...row(minX - e, front + 0.6, maxX + e, front + 0.6, { height: 0.6, spacing: 0.9 }),
    ...row(minX - e, 0, minX - e, front + 0.6, { height: 1.9, spacing: 0.5 }),
    ...row(maxX + e, 0, maxX + e, front + 0.6, { height: 1.9, spacing: 0.5 }),
  ];
  const gate = (x) => ({ clumps: row(x, 0, x, front + 0.6, { height: 1.9, spacing: 0.5 }), open: false, wither: 0 });
  return { edges, west: gate(-gateX), east: gate(gateX) };
}

export function openGate(gate) {
  gate.open = true;
}

// Shrink factor for a gate's hair (1 = full, 0 = gone).
export const gateScale = (gate) => (gate.open ? (1 - gate.wither) * (1 + Math.sin(gate.wither * 30) * 0.08) : 1);

export function updateGates(gates, dt) {
  for (const g of [gates.west, gates.east]) {
    if (g.open && g.wither < 1) g.wither = Math.min(1, g.wither + dt / 1.6);
  }
}

// How far the player may walk sideways, given which gates are open.
export function walkableX(gates, radius) {
  const { minX, maxX, gateX } = AREA;
  return [
    gates.west.open ? minX : -gateX + radius,
    gates.east.open ? maxX : gateX - radius,
  ];
}

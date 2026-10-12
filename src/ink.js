// Everything the game draws itself, in the same flat 2D style as the
// processed drawings: solid fills, solid ink, thick dark outlines. Each
// function returns a canvas.
import { INK } from "./config.js";

const OUTLINE = 7;

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

// Seeded random so the world looks the same every load.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A lumpy closed blob path around (x, y).
function blob(ctx, x, y, rx, ry, rand, lumps = 9, wobble = 0.22) {
  const pts = Array.from({ length: lumps }, (_, i) => {
    const a = (i / lumps) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 2 * wobble;
    return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k];
  });
  ctx.beginPath();
  for (let i = 0; i < lumps; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % lumps];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(x0, y0, mx, my);
  }
  const [x0, y0] = pts[0], [x1, y1] = pts[1];
  ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  ctx.closePath();
}

// ---------- skin ----------

// Sickly skin, as a seamless square tile: a base tone with flat blotches
// (pink flush, jaundiced yellow, sallow), pores, and creases.
export function skinTile({ size = 512, seed = 1, base, blotches, pore, crease }) {
  const [c, ctx] = canvas(size, size);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Draw everything 9 times offset by the tile size so edges wrap.
  const wrap = (fn) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      ctx.save(); ctx.translate(ox, oy); fn(); ctx.restore();
    }
  };
  for (const [color, count, minR, maxR] of blotches) {
    for (let i = 0; i < count; i++) {
      const x = rand() * size, y = rand() * size;
      const r = minR + rand() * (maxR - minR);
      const ry = r * (0.55 + rand() * 0.5);
      const seedB = rand() * 1e9;
      wrap(() => {
        blob(ctx, x, y, r, ry, rng(seedB), 10, 0.3);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }
  }
  if (crease) {
    ctx.strokeStyle = crease;
    ctx.lineCap = "round";
    for (let i = 0; i < 14; i++) {
      const x = rand() * size, y = rand() * size, len = 30 + rand() * 70, bend = (rand() - 0.5) * 30;
      const lw = 2 + rand() * 1.5;
      wrap(() => {
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y + bend, x + len, y + bend * 0.3);
        ctx.stroke();
      });
    }
  }
  ctx.fillStyle = pore;
  for (let i = 0; i < 320; i++) {
    const x = rand() * size, y = rand() * size, r = 1.2 + rand() * 1.8;
    wrap(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  }
  return c;
}

// The world is deeper and dustier than the cast, so the characters'
// brighter flesh tones read on top of it.
export const FLOOR_SKIN = {
  seed: 7,
  base: "#d6947f",
  blotches: [
    ["#d38a86", 6, 90, 170],   // pink flush
    ["#d6a175", 6, 70, 150],   // jaundiced
    ["#cc8a74", 5, 50, 110],   // sallow
    ["#dda08b", 6, 30, 80],    // paler patches
    ["#c27474", 7, 6, 16],     // inflamed spots
  ],
  pore: "rgba(110, 52, 44, 0.4)",
  crease: "rgba(120, 58, 48, 0.45)",
};

export const WALL_SKIN = {
  seed: 23,
  base: "#dfb989",
  blotches: [
    ["#ddbf82", 6, 90, 170],   // yellowing
    ["#dcaa88", 5, 70, 140],   // peach
    ["#d79f8f", 4, 50, 100],   // pink
  ],
  pore: "rgba(120, 78, 50, 0.3)",
  crease: null,
};

// ---------- pimples ----------

// A swollen pimple: inflamed red base, raised pink dome, yellow-white head,
// thick outline. Drawn side-on (a dome sitting on the ground) or as a round
// one seen face-on (for the backdrop).
export function pimpleTexture(seed, { faceOn = false } = {}) {
  const rand = rng(seed);
  const W = 220, H = faceOn ? 220 : 190;
  const [c, ctx] = canvas(W, H);
  const cx = W / 2, by = faceOn ? H / 2 : H - 16;
  const rw = 88 + rand() * 10, rh = faceOn ? rw * (0.8 + rand() * 0.2) : 24;
  ctx.lineWidth = OUTLINE + 3;
  ctx.strokeStyle = INK;
  // Inflamed ring.
  blob(ctx, cx, by, rw, rh, rand, 11, 0.12);
  ctx.fillStyle = "#d9636a";
  ctx.fill();
  ctx.stroke();
  // Swollen dome.
  const dw = rw * (0.62 + rand() * 0.12);
  const dh = 100 + rand() * 45;
  const domeSeed = rand() * 1e9;
  const dome = () => {
    if (faceOn) {
      blob(ctx, cx, by, dw, dw * 0.92, rng(domeSeed), 9, 0.07);
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - dw, by);
      ctx.bezierCurveTo(cx - dw, by - dh * 1.1, cx + dw, by - dh * 1.1, cx + dw, by);
      ctx.closePath();
    }
  };
  dome();
  ctx.fillStyle = "#ee9a92";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#f6b9ad";
  ctx.beginPath();
  ctx.ellipse(cx - dw * 0.4, faceOn ? by - dw * 0.35 : by - dh * 0.55, dw * 0.28, dw * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  dome();
  ctx.stroke();
  // Pus head.
  const hr = dw * (0.36 + rand() * 0.14);
  const hx = cx + (rand() - 0.5) * dw * 0.3, hy = faceOn ? by - dw * 0.1 : by - dh * 0.68;
  blob(ctx, hx, hy, hr, hr * 0.9, rand, 8, 0.12);
  ctx.fillStyle = "#f5e3a1";
  ctx.fill();
  ctx.lineWidth = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = "#fffbe8";
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.3, hy - hr * 0.3, hr * 0.28, hr * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// A glob of pus: what flies out of a popped pimple, worth one point.
export function pusGlobTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(96, 96);
  blob(ctx, 48, 52, 36, 30, rand, 8, 0.2);
  ctx.fillStyle = "#f2dc8a";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#e3bf5e";
  ctx.beginPath();
  ctx.ellipse(58, 70, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  blob(ctx, 48, 52, 36, 30, rng(seed), 8, 0.2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = "#fffbe8";
  ctx.beginPath();
  ctx.ellipse(36, 40, 9, 6, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// What's left after a pop: a red crater with a splat of pus.
export function poppedTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(260, 90);
  blob(ctx, 130, 52, 120, 26, rand, 13, 0.3);
  ctx.fillStyle = "#f2e19a";
  ctx.fill();
  ctx.lineWidth = OUTLINE * 0.8; ctx.strokeStyle = INK; ctx.stroke();
  blob(ctx, 130, 56, 62, 17, rand, 9, 0.15);
  ctx.fillStyle = "#b8434d";
  ctx.fill();
  ctx.stroke();
  return c;
}

// ---------- props ----------

export function stickTexture() {
  const [c, ctx] = canvas(64, 512);
  const r = 24;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8, 512 - r - 8);
    ctx.arc(32, 512 - r - 8, r, Math.PI, 0, true);
    ctx.lineTo(56, 0);
  };
  path();
  ctx.fillStyle = "#d8ab6c";
  ctx.fill();
  ctx.fillStyle = "#e9c48e";
  ctx.fillRect(14, 0, 10, 470);
  ctx.lineWidth = OUTLINE * 1.6;
  ctx.strokeStyle = INK;
  path();
  ctx.stroke();
  return c;
}

// A flat contact shadow.
export function shadowTexture() {
  const [c, ctx] = canvas(256, 96);
  ctx.fillStyle = "rgba(120, 40, 40, 0.28)";
  ctx.beginPath();
  ctx.ellipse(128, 48, 120, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// A few stray hairs growing out of the skin.
export function tuftTexture() {
  const s = 96;
  const [c, ctx] = canvas(s, s);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const bx = s / 2 + (Math.random() - 0.5) * 14;
    const len = 30 + Math.random() * 55;
    const lean = (Math.random() - 0.5) * 50;
    ctx.lineWidth = 2.6 + Math.random() * 1;
    ctx.beginPath();
    ctx.moveTo(bx, s - 2);
    ctx.bezierCurveTo(bx + lean * 0.2, s - len * 0.5, bx + lean * 0.9, s - len * 0.7, bx + lean, s - len);
    ctx.stroke();
  }
  // Every hair grows out of a follicle bump.
  ctx.fillStyle = "#c9766d";
  ctx.beginPath();
  ctx.ellipse(s / 2, s - 4, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  return c;
}

// The blue drip that runs off half the cast.
export function dripTexture() {
  const [c, ctx] = canvas(128, 192);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.bezierCurveTo(70, 50, 112, 92, 112, 132);
    ctx.bezierCurveTo(112, 162, 90, 184, 64, 184);
    ctx.bezierCurveTo(38, 184, 16, 162, 16, 132);
    ctx.bezierCurveTo(16, 92, 58, 50, 64, 8);
  };
  path();
  ctx.fillStyle = "#6fa3dc";
  ctx.fill();
  ctx.fillStyle = "#4f7fbf";
  ctx.beginPath();
  ctx.ellipse(78, 150, 26, 22, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(46, 124, 9, 20, 0.3, 0, Math.PI * 2);
  ctx.fill();
  path();
  ctx.lineWidth = OUTLINE + 1;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

// A popped eyeball: pink, veiny, wet.
export function eyeballTexture() {
  const [c, ctx] = canvas(170, 170);
  const cx = 85, cy = 87, r = 70;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f7dcd6";
  ctx.fill();
  ctx.strokeStyle = "#c0303a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const rand = rng(5);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    let x = cx + Math.cos(a) * (r - 4), y = cy + Math.sin(a) * (r - 4);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      x += (cx - x) * 0.25 + (rand() - 0.5) * 10;
      y += (cy - y) * 0.25 + (rand() - 0.5) * 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx + 16, cy - 8, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#9b6a8a";
  ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 16, cy - 8, 13, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx + 22, cy - 15, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = OUTLINE;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

// A dense clump of hair, for the hedges that wall off unopened areas.
export function hedgeTexture() {
  const w = 160, h = 200;
  const [c, ctx] = canvas(w, h);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const bx = w / 2 + (Math.random() - 0.5) * 70;
    const len = 90 + Math.random() * 100;
    const lean = (Math.random() - 0.5) * 120;
    const curl = (Math.random() - 0.5) * 60;
    ctx.lineWidth = 2 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, h - 2);
    ctx.bezierCurveTo(bx + curl, h - len * 0.4, bx + lean * 0.6 - curl, h - len * 0.75, bx + lean, h - len);
    ctx.stroke();
  }
  return c;
}

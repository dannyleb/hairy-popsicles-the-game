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

// ---------- scraps (Toad food) ----------

// A crumb: a lumpy, toasted chunk with a few darker flecks.
export function crumbTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(110, 90);
  blob(ctx, 55, 50, 40 + rand() * 8, 28 + rand() * 8, rand, 7, 0.32);
  ctx.fillStyle = "#e3a85c";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#c27c3a";
  ctx.beginPath();
  ctx.ellipse(70, 66, 34, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f3cf8a";
  ctx.beginPath();
  ctx.ellipse(42, 38, 14, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  blob(ctx, 55, 50, 40 + rand() * 0, 28, rng(seed), 7, 0.32);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = "#8c5124";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(30 + rand() * 50, 36 + rand() * 30, 2.5 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

// A toenail clipping: a yellowed crescent with a grimy inner edge.
export function toenailTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(130, 80);
  ctx.translate(65, 44);
  ctx.rotate((rand() - 0.5) * 0.6);
  const w = 48 + rand() * 8, bow = 26 + rand() * 8, thick = 11 + rand() * 4;
  const crescent = () => {
    ctx.beginPath();
    ctx.moveTo(-w, 6);
    ctx.quadraticCurveTo(0, -bow * 2 + 6, w, 6);
    ctx.quadraticCurveTo(w + 4, 12, w - 6, 12);
    ctx.quadraticCurveTo(0, -bow * 2 + 6 + thick * 2, -w + 6, 12);
    ctx.quadraticCurveTo(-w - 4, 12, -w, 6);
    ctx.closePath();
  };
  crescent();
  ctx.fillStyle = "#f1dfa8";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "#c9a96a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-w + 8, 12);
  ctx.quadraticCurveTo(0, -bow * 2 + 6 + thick * 2, w - 8, 12);
  ctx.stroke();
  ctx.restore();
  crescent();
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.stroke();
  return c;
}

// Mouse droppings: three dark, rice-shaped pellets in a little pile.
export function droppingTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(130, 80);
  const pellets = [[38, 50, 0.3], [78, 54, -0.25], [58, 30, 0.9]];
  for (const [x, y, a] of pellets) {
    const ang = a + (rand() - 0.5) * 0.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + rand() * 4, 9 + rand() * 2, ang, 0, Math.PI * 2);
    ctx.fillStyle = "#5b3a24";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - Math.cos(ang) * 6, y - 3, 7, 2.5, ang, 0, Math.PI * 2);
    ctx.fillStyle = "#8a6142";
    ctx.fill();
  }
  return c;
}

// A curly pubic hair lying on the skin: a tight, uneven corkscrew.
export function pubeTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(160, 70);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pts = [];
  const turns = 4 + rand() * 2;
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const a = t * turns * Math.PI * 2;
    const r = 11 + Math.sin(t * 9 + rand()) * 2;
    pts.push([16 + t * 128 + Math.cos(a) * r * 0.55, 36 + Math.sin(a) * r + (t - 0.5) * 10]);
  }
  const stroke = (w, color) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  stroke(9, "#f6d7bf");
  stroke(4.5, INK);
  return c;
}

// A house fly, wings up or down. Seen side-on, facing right.
export function flyTexture(wingsUp, dead = false) {
  const [c, ctx] = canvas(140, 110);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  if (dead) {
    ctx.translate(70, 55);
    ctx.rotate(Math.PI);
    ctx.translate(-70, -55);
  }
  // Wings (behind the body).
  const wing = (rot) => {
    ctx.save();
    ctx.translate(64, 44);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(-4, -26, 15, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214, 236, 245, 0.85)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(46, 22, 22, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2); ctx.lineTo(-6, -48);
    ctx.moveTo(-4, -18); ctx.lineTo(6, -40);
    ctx.stroke();
    ctx.restore();
  };
  if (!dead) wing(wingsUp ? -0.55 : 0.35);
  // Legs.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const [x, dx] of [[50, -10], [64, 0], [78, 10]]) {
    ctx.beginPath();
    ctx.moveTo(x, 66);
    ctx.lineTo(x + dx * 0.6, 82);
    ctx.lineTo(x + dx, 92);
    ctx.stroke();
  }
  // Abdomen and thorax.
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(48, 60, 30, 20, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "#4a3a3a";
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#7a6262";
  ctx.lineWidth = 3;
  for (const x of [36, 48, 60]) {
    ctx.beginPath();
    ctx.moveTo(x, 44); ctx.quadraticCurveTo(x + 4, 60, x, 76);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(80, 56, 17, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5a4646";
  ctx.fill();
  ctx.stroke();
  // Head with big red eye.
  ctx.beginPath();
  ctx.arc(100, 56, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#5a4646";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(104, 51, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#c8364a";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.fillStyle = "#f5b0b0";
  ctx.beginPath();
  ctx.arc(101, 47, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (!dead) wing(wingsUp ? -0.15 : 0.6);
  if (dead) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    for (const [x, y] of [[36, 59]]) {
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
    }
  }
  return c;
}

// ---------- rewards ----------

// A giant wart: a fat, lumpy dome studded with round bumps, a few coarse
// black hairs sprouting from the top. cracked: the beaten-up look after a
// few slaps (red splits and a bead of pus).
export function wartTexture(seed, cracked = false) {
  const rand = rng(seed);
  const [c, ctx] = canvas(220, 210);
  const cx = 110, cy = 120, base = 196;
  const body = () => {
    blob(ctx, cx, cy, 92, 80, rng(seed), 11, 0.12);
  };
  // Body, cut flat where it meets the skin.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 220, base);
  ctx.clip();
  body();
  ctx.fillStyle = "#c98a73";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#aa6b5a"; // shade along the lower right
  ctx.beginPath();
  ctx.ellipse(cx + 38, cy + 52, 92, 60, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Lots of small, tight lumps (the cauliflower texture).
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 84;
    const x = cx + Math.cos(a) * d, y = cy - 4 + Math.sin(a) * d * 0.85, r = 7 + rand() * 6;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.85, rand() * 3, 0, Math.PI * 2);
    ctx.fillStyle = y > cy + 30 ? "#b4745f" : rand() < 0.5 ? "#d39780" : "#c88570";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(46, 22, 22, 0.5)";
    ctx.stroke();
    if (y < cy + 20) {
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "#eab9a0";
      ctx.fill();
    }
  }
  if (cracked) {
    ctx.strokeStyle = "#b8343f";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [x0, y0] of [[78, 70], [138, 82], [104, 128]]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 12, y0 + 16); ctx.lineTo(x0 + 2, y0 + 30); ctx.lineTo(x0 + 16, y0 + 44);
      ctx.stroke();
    }
    ctx.fillStyle = "#f5e3a1";
    ctx.strokeStyle = "#2e1616";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(122, 100, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  // Ink outline, and the flat base line.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 220, base);
  ctx.clip();
  body();
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  // Swollen pink rim where it grows out of the skin (like the pimples').
  ctx.beginPath();
  ctx.ellipse(cx, base - 4, 104, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#e0868a";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Coarse black hairs.
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  for (const [x, y, dx, dy] of [[86, 52, -18, -38], [118, 44, 6, -44], [146, 58, 26, -30]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + dx * 0.6, y + dy * 0.3, x - dx * 0.2, y + dy * 0.7, x + dx, y + dy);
    ctx.stroke();
  }
  return c;
}

// The rare golden whitehead: same swollen shape, gold dome, glinting head.
export function goldenPimpleTexture(seed) {
  const c = pimpleTexture(seed);
  const ctx = c.getContext("2d");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(255, 200, 40, 0.55)";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#fffbe8";
  for (const [x, y, r] of [[60, 50, 7], [160, 70, 5], [120, 30, 4]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 2, y);
    ctx.lineTo(x + r * 0.5, y + r * 0.5); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y + r * 0.5);
    ctx.lineTo(x - r * 2, y); ctx.lineTo(x - r * 0.5, y - r * 0.5); ctx.closePath();
    ctx.fill();
  }
  return c;
}

// A pus glob with something glinting inside: holds a curio.
export function mysteryGlobTexture() {
  const c = pusGlobTexture(77);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c8364a";
  ctx.beginPath();
  ctx.arc(56, 56, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = "#fffbe8";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("?", 56, 62);
  return c;
}

// A pus splat left on the skin after a pop.
export function stainTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(200, 80);
  blob(ctx, 100, 40, 90, 28, rand, 14, 0.35);
  ctx.fillStyle = "rgba(226, 196, 98, 0.75)";
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(20 + rand() * 160, 12 + rand() * 56, 4 + rand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export const CURIOS = [
  { id: "stone", name: "Kidney Stone" },
  { id: "tooth", name: "Baby Tooth" },
  { id: "lens", name: "Lost Contact Lens" },
  { id: "scab", name: "Old Scab" },
  { id: "lash", name: "Wish Eyelash" },
  { id: "wax", name: "Earwax Pearl" },
  { id: "lint", name: "Belly Button Lint" },
  { id: "wisdom", name: "Wisdom Tooth" },
];

export function curioTexture(id) {
  const [c, ctx] = canvas(120, 120);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const fillStroke = (fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  ctx.beginPath();
  if (id === "stone") {
    blob(ctx, 60, 62, 38, 30, rng(31), 8, 0.38);
    fillStroke("#d9b56a");
    ctx.beginPath(); ctx.fillStyle = "#b8904a";
    ctx.moveTo(44, 70); ctx.lineTo(58, 52); ctx.lineTo(70, 74); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = "#f3dc9c";
    ctx.ellipse(50, 48, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (id === "tooth" || id === "wisdom") {
    const big = id === "wisdom";
    ctx.moveTo(30, 30); ctx.quadraticCurveTo(60, big ? 10 : 18, 90, 30);
    ctx.quadraticCurveTo(96, 60, 82, 64); ctx.lineTo(76, 100); ctx.lineTo(64, 70);
    if (big) { ctx.lineTo(56, 70); ctx.lineTo(46, 102); } else ctx.lineTo(56, 70);
    ctx.lineTo(44, 100); ctx.lineTo(38, 64); ctx.quadraticCurveTo(24, 60, 30, 30);
    fillStroke(big ? "#f1e4b0" : "#fdf8ec");
  } else if (id === "lens") {
    ctx.ellipse(60, 64, 40, 26, 0, 0, Math.PI * 2);
    fillStroke("rgba(160, 210, 240, 0.7)");
    ctx.beginPath(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.arc(48, 56, 12, Math.PI, Math.PI * 1.6); ctx.stroke();
  } else if (id === "scab") {
    blob(ctx, 60, 62, 40, 32, rng(9), 11, 0.3);
    fillStroke("#8a3a2e");
    ctx.beginPath(); ctx.fillStyle = "#b8564a";
    ctx.ellipse(50, 52, 14, 9, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (id === "lash") {
    ctx.moveTo(20, 90); ctx.bezierCurveTo(40, 30, 80, 20, 100, 36);
    ctx.lineWidth = 6; ctx.stroke();
  } else if (id === "wax") {
    blob(ctx, 60, 64, 34, 30, rng(4), 9, 0.15);
    fillStroke("#d99a3a");
    ctx.beginPath(); ctx.fillStyle = "#f7d27a";
    ctx.ellipse(48, 52, 10, 7, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (id === "lint") {
    blob(ctx, 60, 62, 38, 32, rng(2), 14, 0.35);
    fillStroke("#8fa3b8");
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7;
      ctx.beginPath(); ctx.moveTo(60 + Math.cos(a) * 30, 62 + Math.sin(a) * 26); ctx.lineTo(60 + Math.cos(a) * 46, 62 + Math.sin(a) * 40); ctx.stroke();
    }
  }
  return c;
}

// Things the player can wear, drawn over the Antenna sprite. Coordinates
// are shares of the sprite's box (0..1 across and down).
export function drawCosmetic(ctx, id, x, y, w, h) {
  const P = (fx, fy) => [x + fx * w, y + fy * h];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  if (id === "wart") {
    const [cx, cy] = P(0.74, 0.265);
    ctx.fillStyle = "#b98a5e";
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, w * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - w * 0.06); ctx.lineTo(cx + w * 0.05, cy - w * 0.16); ctx.stroke();
  } else if (id === "unibrow") {
    const [x0, y0] = P(0.3, 0.12), [x1, y1] = P(0.78, 0.115);
    ctx.lineWidth = Math.max(3, h * 0.016);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 - h * 0.022, x1, y1); ctx.stroke();
  } else if (id === "stain") {
    const [cx, cy] = P(0.56, 0.47);
    ctx.fillStyle = "rgba(170, 140, 40, 0.75)";
    blob(ctx, cx, cy, w * 0.16, h * 0.04, rng(3), 9, 0.35);
    ctx.fill();
  } else if (id === "tuft") {
    const [bx, by] = P(0.6, 0.1);
    ctx.lineWidth = Math.max(2, w * 0.025);
    for (const [dx, dy] of [[-0.12, -0.08], [0, -0.1], [0.12, -0.07]]) {
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dx * w * 0.3, by + dy * h * 0.6, bx + dx * w, by + dy * h);
      ctx.stroke();
    }
  } else if (id === "drool") {
    const [mx, my] = P(0.56, 0.295);
    ctx.fillStyle = "#9fd0f0";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.03, my);
    ctx.quadraticCurveTo(mx - w * 0.03, my + h * 0.06, mx, my + h * 0.075);
    ctx.quadraticCurveTo(mx + w * 0.035, my + h * 0.06, mx + w * 0.03, my);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, w * 0.015); ctx.stroke();
  }
  ctx.restore();
}

// A little puddle where a tear or bead of sweat landed.
export function puddleTexture(seed) {
  const rand = rng(seed);
  const [c, ctx] = canvas(160, 64);
  blob(ctx, 80, 32, 70, 22, rand, 11, 0.25);
  ctx.fillStyle = "rgba(119, 184, 234, 0.8)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(46, 22, 22, 0.55)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.beginPath();
  ctx.ellipse(58, 24, 16, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

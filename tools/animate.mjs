// Idle animation strips for the sprites: hair that sways in a light breeze
// and facial drips (tears, sweat) that slowly stretch and wobble.
//
//   assets/sprites/<name>.webp -> assets/sprites/<name>-anim.webp
//   (FRAMES frames side by side) + assets/sprites/anim.json
//
// Hair: thin strands sticking out of the body (whatever a morphological
// opening of the silhouette removes). Each strand pixel sways sideways in
// proportion to how far it is from the body, so roots stay attached.
// Drips: blue liquid areas (plus their outline) stretch downward from
// their top, each on its own beat.
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { distance } from "./trace.mjs";

const DIR = "assets/sprites";
const SIZE = 512;        // frame long edge
const FRAMES = 6;
const OPEN = 10;         // px: strands thinner than ~2x this count as hair
const SWAY = 0.22;       // hair sway per px of distance from the body
const SWAY_MAX = 12;     // px
const STRETCH = 0.2;     // drips stretch up to this share of their height
const SKIP = new Set(["snoot-2"]); // the moon

const isBlue = (r, g, b) => b > r + 18 && b > g - 6;

async function animate(name) {
  const { data, info } = await sharp(join(DIR, `${name}.webp`))
    .resize(SIZE, SIZE, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, n = w * h;
  const A = new Uint8Array(n);
  for (let i = 0; i < n; i++) A[i] = data[i * 4 + 3] > 40 ? 1 : 0;

  // Body = opening of the silhouette; hair = the rest.
  const notA = new Uint8Array(n);
  for (let i = 0; i < n; i++) notA[i] = A[i] ? 0 : 1;
  const inside = distance(notA, w, h);
  const eroded = new Uint8Array(n);
  for (let i = 0; i < n; i++) eroded[i] = inside[i] > OPEN ? 1 : 0;
  const toEroded = distance(eroded, w, h);
  const body = new Uint8Array(n);
  for (let i = 0; i < n; i++) body[i] = A[i] && toEroded[i] <= OPEN ? 1 : 0;
  const toBody = distance(body, w, h);

  // Liquid: blue pixels, grown a little to take their outline with them.
  const blue = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (A[i] && isBlue(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])) blue[i] = 1;
  const toBlue = distance(blue, w, h);
  const liquid = new Uint8Array(n);
  for (let i = 0; i < n; i++) liquid[i] = A[i] && toBlue[i] <= 4 ? 1 : 0;

  // Liquid components: top, height, own phase.
  const comp = new Int32Array(n).fill(-1);
  const comps = [];
  const queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!liquid[s] || comp[s] >= 0) continue;
    let head = 0, tail = 0, top = h, bot = 0;
    comp[s] = comps.length; queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0;
      if (y < top) top = y;
      if (y > bot) bot = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && liquid[q] && comp[q] < 0) { comp[q] = comps.length; queue[tail++] = q; }
      }
    }
    comps.push({ top, height: Math.max(1, bot - top), phase: Math.random() * Math.PI * 2, size: tail });
  }
  for (let i = 0; i < n; i++) if (comp[i] >= 0 && comps[comp[i]].size < 30) comp[i] = -1;

  let hairPx = 0, liquidPx = 0;
  for (let i = 0; i < n; i++) {
    if (comp[i] >= 0) liquidPx++;
    else if (A[i] && !body[i] && toBody[i] > 4) hairPx++;
  }
  if (hairPx < n * 0.002 && liquidPx < n * 0.002) return 0;

  const out = Buffer.alloc(w * FRAMES * h * 4);
  const put = (f, x, y, i) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const o = ((y * w * FRAMES) + f * w + x) * 4;
    if (out[o + 3] > data[i * 4 + 3]) return;
    out[o] = data[i * 4]; out[o + 1] = data[i * 4 + 1]; out[o + 2] = data[i * 4 + 2]; out[o + 3] = data[i * 4 + 3];
  };
  for (let f = 0; f < FRAMES; f++) {
    const ph = (f / FRAMES) * Math.PI * 2;
    // Still pixels first.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!data[i * 4 + 3]) continue;
      const moving = comp[i] >= 0 || (A[i] && !body[i]);
      if (!moving) put(f, x, y, i);
    }
    // Hair sways sideways, more the further from the body.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!A[i] || body[i] || comp[i] >= 0) continue;
      const dx = Math.min(SWAY_MAX, toBody[i] * SWAY) * Math.sin(ph + y * 0.018 + x * 0.006);
      put(f, Math.round(x + dx), y, i);
      if (Math.abs(dx - Math.round(dx)) > 0.3) put(f, Math.round(x + dx) + Math.sign(dx - Math.round(dx)), y, i);
    }
    // Drips stretch down from their top.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = comp[i];
      if (c < 0) continue;
      const C = comps[c];
      const k = STRETCH * (0.5 + 0.5 * Math.sin(ph + C.phase));
      const y0 = y + (y - C.top) * k, y1 = y + 1 + (y + 1 - C.top) * k;
      for (let yy = Math.round(y0); yy < Math.max(Math.round(y0) + 1, Math.round(y1)); yy++) put(f, x, yy, i);
    }
  }
  await sharp(out, { raw: { width: w * FRAMES, height: h, channels: 4 } })
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(join(DIR, `${name}-anim.webp`));
  return FRAMES;
}

const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".webp") && !f.endsWith("-anim.webp"))
  .map((f) => f.slice(0, -5))
  .filter((nm) => !SKIP.has(nm));
const manifest = {};
for (const nm of names) {
  const frames = await animate(nm);
  if (frames) manifest[nm] = frames;
}
writeFileSync(join(DIR, "anim.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`  animated: ${Object.keys(manifest).join(", ")}`);

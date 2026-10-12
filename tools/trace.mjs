// Rebuild a cut-out scan as a clean vector illustration, instead of
// cleaning up the scan itself:
//
//   1. Line art: find the pen lines, including faint ones, by comparing
//      each pixel with its surroundings; give every line a minimum weight.
//   2. Color areas: smooth the pencil grain away, group the colors, merge
//      tiny leftovers.
//   3. Recolor: every color area is replaced by one entry from a fixed,
//      shared palette, so all characters use the exact same colors. Base
//      tones are flesh only (peach, pale yellow, pink, tan); greens become
//      jaundiced yellow, whites and greys become pale peach. Small accents
//      stay: blood red, drip blue, ink.
//   4. Trace each color layer and the line art with potrace into smooth
//      vector shapes, stack them into one SVG with an ink outline under
//      everything, and hand the SVG back for rendering.
import sharp from "sharp";
import potraceLib from "potrace";
import Bitmap from "potrace/lib/types/Bitmap.js";

const { Potrace } = potraceLib;

const INK = "#2e1616"; // same as src/config.js INK

// The shared character palette. `family` groups light/mid/shade tones.
export const PALETTE = {
  peachLight: "#fcd8bd", peach: "#f5b28f", peachShade: "#df8b69",
  pinkLight: "#fbc3bb", pink: "#f0939d", pinkShade: "#d26a80",
  yellowLight: "#fbe5a6", yellow: "#f1c56c", yellowShade: "#d69c48",
  red: "#c8364a",
  blue: "#77b8ea", blueShade: "#4b86c8",
  ink: INK,
};

export const STYLE = {
  outline: 4,          // px, minimum outline thickness
  outlineFrac: 0.012,  // ...scaled to this share of the drawing's height
  median: 15,          // px, pencil-grain smoothing before grouping colors
  colors: 8,           // color groups found per drawing (before palette mapping)
  lightWeight: 0.3,
  minRegion: 0.004,
  keepDist: 20,
  lineDark: 64,        // anything darker than this is a line
  lineContrast: 34,    // ...or darker than its surroundings by this much
  lineMaxLum: 165,     // ...and no lighter than this
  lineMaxChroma: 80,   // ...and not too colorful (pencil color isn't a line)
  lineMinWeight: 1.4,  // px, every line is at least this thick
  lineSpeck: 10,       // px, line bits smaller than this are noise
  fleck: 500,
  turd: 6,             // potrace: drop traced specks smaller than this (px area)
  shadeFrac: 0.03,     // cel-shade crescent width, share of the drawing's height
  // Lightness cut-offs (0-255) for light / mid / shade tones.
  light: 226,
  mid: 168,
};

const SHADES = new Set(["peach", "pink", "yellow", "blue"]);

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function toLab(r, g, b) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx / 255];
}

// Map an averaged scan color onto the shared palette.
export function paletteFor([r, g, b], style = STYLE) {
  const L = lum(r, g, b);
  const [h, s, v] = hsv(r, g, b);
  if (L < 58) return "ink";
  if (s > 0.22 && h >= 175 && h < 265) return v > 0.62 ? "blue" : "blueShade";
  if (s > 0.42 && (h >= 342 || h < 10) && v < 0.86) return "red";
  let family;
  if (s < 0.1) family = "peach";                    // whites, greys
  else if (h >= 330 || h < 13) family = "pink";
  else if (h >= 265) family = "pink";               // mauve, purple
  else if (h < 36) family = "peach";
  else family = "yellow";                           // yellows and greens
  const tier = L > style.light ? "Light" : L > style.mid ? "" : "Shade";
  return family + tier;
}

// Two-pass chamfer distance (in px) from every pixel to the nearest `on`.
export function distance(on, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = on[i] ? 0 : INF;
  const a = 1, b = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + a);
    if (y > 0) {
      v = Math.min(v, d[i - w] + a);
      if (x > 0) v = Math.min(v, d[i - w - 1] + b);
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + b);
    }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + a);
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + a);
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + b);
      if (x > 0) v = Math.min(v, d[i + w - 1] + b);
    }
    d[i] = v;
  }
  return d;
}

// Connected components of `mask`; calls fn(pixelIndices) for each.
function components(mask, w, h, fn) {
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let head = 0, tail = 0;
    seen[s] = 1; queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && mask[q] && !seen[q]) { seen[q] = 1; queue[tail++] = q; }
      }
    }
    fn(queue.subarray(0, tail));
  }
}

function kmeans(feat, k, iters = 16) {
  const n = feat.length / 3;
  const sample = [];
  const stride = Math.max(1, Math.floor(n / 25000));
  for (let i = 0; i < n; i += stride) sample.push(i);
  const d2 = (i, c) => {
    const a = feat[i * 3] - c[0], b = feat[i * 3 + 1] - c[1], e = feat[i * 3 + 2] - c[2];
    return a * a + b * b + e * e;
  };
  const first = sample[Math.floor(sample.length / 2)];
  const centers = [[feat[first * 3], feat[first * 3 + 1], feat[first * 3 + 2]]];
  const best = sample.map((i) => d2(i, centers[0]));
  while (centers.length < k) {
    let far = 0;
    for (let j = 1; j < sample.length; j++) if (best[j] > best[far]) far = j;
    if (best[far] < 140) break;
    const p = sample[far];
    const c = [feat[p * 3], feat[p * 3 + 1], feat[p * 3 + 2]];
    centers.push(c);
    sample.forEach((i, j) => { best[j] = Math.min(best[j], d2(i, c)); });
  }
  for (let it = 0; it < iters; it++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const i of sample) {
      let b = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) { const d = d2(i, centers[c]); if (d < bd) { bd = d; b = c; } }
      const s = sum[b];
      s[0] += feat[i * 3]; s[1] += feat[i * 3 + 1]; s[2] += feat[i * 3 + 2]; s[3]++;
    }
    sum.forEach((s, c) => { if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return centers;
}

// Merge label blobs smaller than minArea into their most common neighbor,
// unless keep(from, to) says they're different enough to stay.
function mergeSmall(lab, w, h, minArea, keep) {
  const n = w * h;
  for (let pass = 0; pass < 3; pass++) {
    const seen = new Uint8Array(n), queue = new Int32Array(n);
    let changed = 0;
    for (let s = 0; s < n; s++) {
      if (seen[s] || lab[s] < 0) continue;
      const l = lab[s];
      let head = 0, tail = 0;
      const nb = new Map();
      seen[s] = 1; queue[tail++] = s;
      while (head < tail) {
        const p = queue[head++], x = p % w, y = (p / w) | 0;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
          if (q < 0) continue;
          const lq = lab[q];
          if (lq === l) { if (!seen[q]) { seen[q] = 1; queue[tail++] = q; } } else if (lq >= 0) nb.set(lq, (nb.get(lq) || 0) + 1);
        }
      }
      if (tail < minArea && nb.size) {
        let to = -1, most = -1;
        for (const [k2, c] of nb) if (c > most) { most = c; to = k2; }
        if (tail > 6 && keep(l, to)) continue;
        for (let i = 0; i < tail; i++) lab[queue[i]] = to;
        changed++;
      }
    }
    if (!changed) break;
  }
}

// Grow labels into unlabeled pixels inside the silhouette (under lines).
function fillUnder(lab, alpha, w, h) {
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  for (let p = 0; p < lab.length; p++) if (lab[p] >= 0) queue[tail++] = p;
  while (head < tail) {
    const p = queue[head++], x = p % w, y = (p / w) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q >= 0 && alpha[q] && lab[q] < 0) { lab[q] = lab[p]; queue[tail++] = q; }
    }
  }
}

function tracePath(mask, w, h, color, turd) {
  const bm = new Bitmap(w, h);
  for (let i = 0; i < mask.length; i++) bm.data[i] = mask[i] ? 0 : 255;
  const p = new Potrace({ turdSize: turd, alphaMax: 1, optCurve: true, optTolerance: 0.25, threshold: 128 });
  p._luminanceData = bm;
  p._imageLoaded = true;
  return p.getPathTag(color);
}

export const outlineFor = (h, style = STYLE) => Math.max(style.outline, Math.round(h * style.outlineFrac));

// rgba: a cut-out at working resolution (alpha 0 = background).
// Returns an SVG string with viewBox 0 0 w h.
export async function traceDrawing(rgba, w, h, style = STYLE) {
  const n = w * h;
  const alpha = new Uint8Array(n);
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    alpha[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
    rgb[i * 3] = rgba[i * 4]; rgb[i * 3 + 1] = rgba[i * 4 + 1]; rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  // Drop small colored flecks (leftover pencil glow); keep dark ones (stipple).
  components(alpha, w, h, (px) => {
    if (px.length >= style.fleck) return;
    let dark = 0;
    for (const p of px) if (lum(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]) < style.lineDark) dark++;
    if (dark < px.length * 0.5) for (const p of px) alpha[p] = 0;
  });

  // 1. Line art.
  const gray = Buffer.alloc(n);
  for (let i = 0; i < n; i++) gray[i] = alpha[i] ? lum(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) : 235;
  const around = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).blur(7).raw().toBuffer();
  const rawLine = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!alpha[i]) continue;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const L = gray[i], C = Math.max(r, g, b) - Math.min(r, g, b);
    if (L < style.lineDark || (L < around[i] - style.lineContrast && L < style.lineMaxLum && C < style.lineMaxChroma)) rawLine[i] = 1;
  }
  components(rawLine, w, h, (px) => { if (px.length < style.lineSpeck) for (const p of px) rawLine[p] = 0; });
  const toLine = distance(rawLine, w, h);
  const line = new Uint8Array(n);
  for (let i = 0; i < n; i++) line[i] = alpha[i] && toLine[i] <= style.lineMinWeight / 2 ? 1 : 0;

  // 2. Color areas.
  const smooth = await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).median(style.median).raw().toBuffer();
  const fill = [];
  for (let i = 0; i < n; i++) if (alpha[i] && !line[i]) fill.push(i);
  const feat = new Float32Array(fill.length * 3);
  fill.forEach((p, j) => {
    const [L, A, B] = toLab(smooth[p * 3], smooth[p * 3 + 1], smooth[p * 3 + 2]);
    feat[j * 3] = L * style.lightWeight; feat[j * 3 + 1] = A; feat[j * 3 + 2] = B;
  });
  const centers = fill.length ? kmeans(feat, style.colors) : [];
  const lab = new Int16Array(n).fill(-1);
  fill.forEach((p, j) => {
    let b = 0, bd = Infinity;
    for (let c = 0; c < centers.length; c++) {
      const a1 = feat[j * 3] - centers[c][0], a2 = feat[j * 3 + 1] - centers[c][1], a3 = feat[j * 3 + 2] - centers[c][2];
      const d = a1 * a1 + a2 * a2 + a3 * a3;
      if (d < bd) { bd = d; b = c; }
    }
    lab[p] = b;
  });
  const far = (a, b) => {
    const x = centers[a], y = centers[b];
    return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2 > style.keepDist ** 2;
  };
  mergeSmall(lab, w, h, Math.max(80, fill.length * style.minRegion), far);

  // 3. Recolor: each group's average scan color -> palette entry.
  const acc = centers.map(() => [0, 0, 0, 0]);
  for (const p of fill) { const a = acc[lab[p]]; a[0] += smooth[p * 3]; a[1] += smooth[p * 3 + 1]; a[2] += smooth[p * 3 + 2]; a[3]++; }
  const names = [...new Set(acc.map(([r, g, b, c]) => (c ? paletteFor([r / c, g / c, b / c], style) : "peach")))];
  const idxOf = Object.fromEntries(names.map((nm, i) => [nm, i]));
  const groupTo = acc.map(([r, g, b, c]) => idxOf[c ? paletteFor([r / c, g / c, b / c], style) : "peach"]);
  for (const p of fill) lab[p] = groupTo[lab[p]];
  mergeSmall(lab, w, h, Math.max(60, fill.length * style.minRegion * 0.6), (a, b) => names[a].replace(/Light|Shade/, "") !== names[b].replace(/Light|Shade/, ""));
  fillUnder(lab, alpha, w, h);

  // Cel shading: a crescent along the lower-right inside edge of the
  // silhouette takes the darker tone of whatever color it's in.
  const k = Math.max(3, Math.round(h * style.shadeFrac));
  const shadeName = (nm) => (nm.endsWith("Light") ? nm.slice(0, -5) : SHADES.has(nm) ? nm + "Shade" : nm);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (!alpha[p] || lab[p] < 0) continue;
    const xx = x + k, yy = y + k; // light from the upper left: shade where the shape ends below-right
    const lit = xx < w && yy < h && alpha[yy * w + xx];
    if (lit) continue;
    const nm = shadeName(names[lab[p]]);
    if (!(nm in idxOf)) { idxOf[nm] = names.length; names.push(nm); }
    lab[p] = idxOf[nm];
  }

  // 4. Trace and stack.
  const area = names.map(() => 0);
  for (let p = 0; p < n; p++) if (lab[p] >= 0) area[lab[p]]++;
  const order = names.map((_, i) => i).sort((a, b) => area[b] - area[a]);
  const base = order[0];

  const outside = distance(alpha, w, h);
  const outline = outlineFor(h, style);
  const ring = new Uint8Array(n);
  for (let i = 0; i < n; i++) ring[i] = outside[i] <= outline ? 1 : 0;

  const layers = [tracePath(ring, w, h, INK, style.turd)];
  layers.push(tracePath(alpha, w, h, PALETTE[names[base]], style.turd));
  for (const k of order.slice(1)) {
    if (!area[k]) continue;
    const m = new Uint8Array(n);
    for (let p = 0; p < n; p++) m[p] = lab[p] === k ? 1 : 0;
    layers.push(tracePath(m, w, h, PALETTE[names[k]], style.turd));
  }
  layers.push(tracePath(line, w, h, INK, 2));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${layers.join("")}</svg>`;
}

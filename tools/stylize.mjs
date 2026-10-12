// Turn a cut-out scan into flat 2D illustration: solid colors instead of
// colored-pencil grain, solid ink lines, and one consistent thick outline.
//
//   1. Median-smooth the color so pencil strokes melt into flat areas.
//   2. Group colors by hue more than by lightness (k-means in a Lab space
//      with lightness down-weighted), so pencil shading collapses into one
//      solid fill while genuinely different colors (yellow eyes, red
//      pimples, blue drips) stay separate. Each group is filled with its
//      average color.
//   3. Merge any small leftover blobs into the color around them.
//   4. Dark, colorless pen lines from the original become solid ink.
//   5. Grow the silhouette and fill the ring with ink: a uniform outline.
import sharp from "sharp";

const INK = [27, 26, 23];

export const STYLE = {
  colors: 7,          // flat colors per drawing (max)
  lightWeight: 0.3,   // how much lightness differences count vs hue/chroma
  median: 15,         // px, pencil-grain smoothing
  inkLum: 118,        // pen lines: darker than this...
  inkChroma: 60,      // ...and no more colorful than this (max-min of RGB)
  inkHard: 62,        // anything darker than this is ink regardless of color
  outline: 7,         // px, outline thickness outside the silhouette
  inset: 2,           // px, outline also eats this far into the edge
  minRegion: 0.004,   // color blobs smaller than this share of the drawing get merged...
  keepDist: 20,       // ...unless their color is at least this different
  detail: 10,         // chroma jump that marks a small spot worth keeping
  fleck: 500,         // px: colored bits smaller than this (not pen dots) are dropped
  saturate: 1.1,
};

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

// Remove small islands of color (leftover pencil glow, smudges); keep
// small islands of ink (pen stipple, stray hairs).
function dropFlecks(alpha, rgb, w, h, minArea, inkLum) {
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!alpha[s] || seen[s]) continue;
    let head = 0, tail = 0, dark = 0;
    seen[s] = 1; queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0;
      if (lum(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]) < inkLum) dark++;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && alpha[q] && !seen[q]) { seen[q] = 1; queue[tail++] = q; }
      }
    }
    if (tail < minArea && dark < tail * 0.5) for (let i = 0; i < tail; i++) alpha[queue[i]] = 0;
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
  const centers = [];
  const first = sample[Math.floor(sample.length / 2)];
  centers.push([feat[first * 3], feat[first * 3 + 1], feat[first * 3 + 2]]);
  // Deterministic farthest-point seeding: rare but distinct colors get a center.
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

// Merge color blobs smaller than minArea into their most common neighbor,
// unless the blob's color is clearly different (a pimple, a pupil).
function mergeSmall(lab, fill, w, h, minArea, centers, keepDist) {
  const far = (a, b) => {
    const x = centers[a], y = centers[b];
    return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2 > keepDist * keepDist;
  };
  const n = w * h;
  for (let pass = 0; pass < 3; pass++) {
    const seen = new Uint8Array(n), queue = new Int32Array(n);
    let changed = 0;
    for (const s of fill) {
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
        if (tail > 6 && far(l, to)) continue;
        for (let i = 0; i < tail; i++) lab[queue[i]] = to;
        changed++;
      }
    }
    if (!changed) break;
  }
}

export async function stylize(rgba, w, h, style = STYLE) {
  const n = w * h;
  const alpha = new Uint8Array(n);
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    alpha[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
    rgb[i * 3] = rgba[i * 4]; rgb[i * 3 + 1] = rgba[i * 4 + 1]; rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  dropFlecks(alpha, rgb, w, h, style.fleck, style.inkHard);

  const outside = distance(alpha, w, h);
  const inv = new Uint8Array(n);
  for (let i = 0; i < n; i++) inv[i] = alpha[i] ? 0 : 1;
  const inside = distance(inv, w, h);

  const src = () => sharp(rgb, { raw: { width: w, height: h, channels: 3 } });
  const smooth = await src().median(style.median).raw().toBuffer();
  // Small, strongly different spots (pimples, pupils, teeth) get wiped by
  // the big median; where a lightly smoothed copy disagrees a lot, use it.
  const fine = await src().median(5).raw().toBuffer();
  for (let p = 0; p < n; p++) {
    if (!alpha[p]) continue;
    const a = toLab(smooth[p * 3], smooth[p * 3 + 1], smooth[p * 3 + 2]);
    const b = toLab(fine[p * 3], fine[p * 3 + 1], fine[p * 3 + 2]);
    const dc = Math.hypot(a[1] - b[1], a[2] - b[2]);
    if (dc > style.detail) { smooth[p * 3] = fine[p * 3]; smooth[p * 3 + 1] = fine[p * 3 + 1]; smooth[p * 3 + 2] = fine[p * 3 + 2]; }
  }

  // Pen lines: dark and colorless (or just very dark). Tidy with a 3x3 vote.
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!alpha[i]) continue;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const L = lum(r, g, b), C = Math.max(r, g, b) - Math.min(r, g, b);
    if (L < style.inkHard || (L < style.inkLum && C < style.inkChroma)) raw[i] = 1;
  }
  const ink = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!alpha[i]) continue;
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += raw[i + dy * w + dx];
    ink[i] = raw[i] ? (c >= 3 ? 1 : 0) : (c >= 6 ? 1 : 0);
  }

  // Flat colors.
  const fill = [];
  for (let i = 0; i < n; i++) if (alpha[i] && !ink[i] && inside[i] > style.inset) fill.push(i);
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
  mergeSmall(lab, fill, w, h, Math.max(80, fill.length * style.minRegion), centers, style.keepDist);

  // Each color group is painted with the average of its pixels.
  const acc = centers.map(() => [0, 0, 0, 0]);
  for (const p of fill) { const a = acc[lab[p]]; a[0] += smooth[p * 3]; a[1] += smooth[p * 3 + 1]; a[2] += smooth[p * 3 + 2]; a[3]++; }
  const palette = acc.map(([r, g, b, c]) => {
    if (!c) return INK;
    const m = (r + g + b) / (3 * c);
    return [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(m + (v / c - m) * style.saturate))));
  });

  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    let c = null;
    if (alpha[i]) c = ink[i] || inside[i] <= style.inset || lab[i] < 0 ? INK : palette[lab[i]];
    else if (outside[i] <= style.outline) c = INK;
    if (c) { const o = i * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; }
  }
  return out;
}

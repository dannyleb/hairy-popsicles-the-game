// Cut hand-drawn scans out of the paper and export game sprites.
//
//   npm run sprites                 every assets/concept/*.jpg
//   npm run sprites -- weeper toad  just those
//
// For each scan: key out the paper with a contiguous flood fill from the
// edges (so pale skin inside an ink outline survives), split what's left
// into separate drawings, flatten each into 2D illustration style (solid
// colors, solid ink, thick outline; see stylize.mjs) and write it as a
// trimmed transparent WebP to assets/sprites/<name>.webp, <name>-2.webp, ...
// (largest first).
import sharp from "sharp";
import { distance, outlineFor, stylize } from "./stylize.mjs";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SRC = "assets/concept";
const OUT = "assets/sprites";
const WORK = 1600;       // keying resolution (long edge)
const SPRITE = 768;      // exported sprite long edge
const STEP = 14;         // max per-channel jump between neighboring paper pixels
const FAR = 52;          // max per-channel distance from the paper color
const HOLE = 8;          // enclosed patches this close to paper color are holes...
const HOLE_SHARE = 0.0008; // ...if bigger than this share of the scan
const GROUP = 14;       // px: strokes closer than this belong to one drawing
const MIN_SHARE = 0.02;  // drop pieces smaller than this share of the biggest
// Scans where figures stand on a drawn ground line; the game draws its own.
const GROUND_LINES = new Set(["balloon-gang"]);
// Scans with a colored-pencil glow around the figure: key it out too.
const HALOS = new Set(["sweats", "roast", "tendrils"]);
const HALO_FAR = 60;
// Scans drawn inside a scene: keep only the figure, found by its color
// (on a smoothed copy), with gaps closed and holes filled.
const ISOLATE = {
  toad: (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (!mx || (mx - mn) / mx < 0.3) return false;
    const hue = g === mx ? 60 * ((b - r) / (mx - mn)) + 120 : r === mx ? 60 * ((g - b) / (mx - mn)) : 999;
    return hue >= 52 && hue <= 170;
  },
};
const ISOLATE_CLOSE = 40;

async function load(file, median = 0) {
  let img = sharp(file).resize(WORK, WORK, { fit: "inside" }).removeAlpha();
  if (median) img = img.median(median);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function paperColor({ data, w, h }) {
  const band = 16, ch = [[], [], []];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * 3;
      ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2]);
    }
  }
  return ch.map((c) => c.sort((a, b) => a - b)[c.length >> 1]);
}

function keyPaper(img, paper, far = FAR) {
  const { data, w, h } = img;
  const bg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const near = (p) => {
    const i = p * 3;
    return Math.abs(data[i] - paper[0]) < far && Math.abs(data[i + 1] - paper[1]) < far && Math.abs(data[i + 2] - paper[2]) < far;
  };
  const smooth = (a, b) => {
    const i = a * 3, j = b * 3;
    return Math.abs(data[i] - data[j]) < STEP && Math.abs(data[i + 1] - data[j + 1]) < STEP && Math.abs(data[i + 2] - data[j + 2]) < STEP;
  };
  const seed = (p) => { if (!bg[p] && near(p)) { bg[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % w, y = (p / w) | 0;
    const visit = (q) => { if (!bg[q] && near(q) && smooth(p, q)) { bg[q] = 1; queue[tail++] = q; } };
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
    if (y > 0) visit(p - w);
    if (y < h - 1) visit(p + w);
  }

  // Paper trapped inside lines (between legs, between hair strands): any
  // big enclosed patch that is almost exactly paper-colored goes too.
  const tight = (p) => {
    const i = p * 3;
    return Math.abs(data[i] - paper[0]) < HOLE && Math.abs(data[i + 1] - paper[1]) < HOLE && Math.abs(data[i + 2] - paper[2]) < HOLE;
  };
  const seen = new Uint8Array(w * h);
  const minHole = w * h * HOLE_SHARE;
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s] || !tight(s)) continue;
    head = 0; tail = 0;
    seen[s] = 1; queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0;
      const visit = (q) => { if (!bg[q] && !seen[q] && tight(q)) { seen[q] = 1; queue[tail++] = q; } };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (y > 0) visit(p - w);
      if (y < h - 1) visit(p + w);
    }
    if (tail >= minHole) for (let i = 0; i < tail; i++) bg[queue[i]] = 1;
  }
  return bg;
}

function isolate(img, test) {
  const { data, w, h } = img;
  const n = w * h;
  const m = new Uint8Array(n);
  for (let p = 0; p < n; p++) m[p] = test(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) ? 1 : 0;
  // Morphological close: grow, then shrink back.
  const out = distance(m, w, h);
  const grown = new Uint8Array(n);
  for (let p = 0; p < n; p++) grown[p] = out[p] <= ISOLATE_CLOSE ? 0 : 1;
  const back = distance(grown, w, h);
  const keep = new Uint8Array(n);
  for (let p = 0; p < n; p++) keep[p] = back[p] > ISOLATE_CLOSE ? 1 : 0;
  // Fill holes: anything not reachable from the border without crossing keep.
  const bg = new Uint8Array(n), queue = new Int32Array(n);
  let head = 0, tail = 0;
  const seed = (p) => { if (!keep[p] && !bg[p]) { bg[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % w, y = (p / w) | 0;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }
  return bg;
}

// Pen lines are never background, even where the smoothed copy blurred
// them into the glow.
function keepInk(bg, { data }) {
  for (let p = 0; p < bg.length; p++) {
    const i = p * 3;
    if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 90) bg[p] = 0;
  }
  return bg;
}

// Label drawings on a dilated mask so stray hairs group with their head.
function splitDrawings(bg, w, h) {
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < fg.length; i++) fg[i] = bg[i] ? 0 : 1;

  // Separable box dilation by GROUP px.
  const rowPass = new Uint8Array(w * h), grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (fg[y * w + x]) last = x; if (x - last <= GROUP) rowPass[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (fg[y * w + x]) last = x; if (last - x <= GROUP) rowPass[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (rowPass[y * w + x]) last = y; if (y - last <= GROUP) grown[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (rowPass[y * w + x]) last = y; if (last - y <= GROUP) grown[y * w + x] = 1; }
  }

  const label = new Int32Array(w * h);
  const queue = new Int32Array(w * h);
  const pieces = [];
  for (let s = 0; s < w * h; s++) {
    if (!grown[s] || label[s]) continue;
    const id = pieces.length + 1;
    let head = 0, tail = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    label[s] = id; queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0;
      if (fg[p]) {
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (grown[q] && !label[q]) { label[q] = id; queue[tail++] = q; }
        }
      }
    }
    pieces.push({ id, area, x0, y0, x1, y1 });
  }
  const biggest = Math.max(0, ...pieces.map((p) => p.area));
  return {
    fg, label,
    pieces: pieces.filter((p) => p.area >= biggest * MIN_SHARE).sort((a, b) => b.area - a.area),
  };
}

// Cut off a drawn ground line (and the hatched shadow under it). The line
// is the row in the bottom half that reaches furthest sideways; cut just
// above the topmost row that reaches nearly as far.
function trimGroundLine(img, fg, label, piece) {
  const { w } = img;
  const inside = (x, y) => fg[y * w + x] && label[y * w + x] === piece.id;
  const spans = [];
  let maxSpan = 0;
  for (let y = piece.y1; y >= piece.y0 + (piece.y1 - piece.y0) * 0.5; y--) {
    let a = -1, b = -1;
    for (let x = piece.x0; x <= piece.x1; x++) if (inside(x, y)) { if (a < 0) a = x; b = x; }
    const span = a < 0 ? 0 : b - a;
    spans.push([y, span]);
    if (span > maxSpan) maxSpan = span;
  }
  let lineTop = piece.y1;
  for (const [y, span] of spans) if (span >= maxSpan * 0.9 && y < lineTop) lineTop = y;
  const cut = lineTop - 3;
  const out = { ...piece, x0: w, x1: 0, y0: img.h, y1: 0, cutY: cut };
  for (let x = piece.x0; x <= piece.x1; x++) {
    let n = 0, top = -1, bottom = -1;
    for (let y = piece.y0; y <= cut; y++) if (inside(x, y)) { n++; if (top < 0) top = y; bottom = y; }
    if (n < 6) continue; // leftover flecks of the line
    if (x < out.x0) out.x0 = x; if (x > out.x1) out.x1 = x;
    if (top < out.y0) out.y0 = top; if (bottom > out.y1) out.y1 = bottom;
  }
  return out;
}

async function exportPiece(img, fg, label, piece, outFile) {
  const { data, w } = img;
  const pad = outlineFor(piece.y1 - piece.y0) + 3;
  const x0 = Math.max(0, piece.x0 - pad), y0 = Math.max(0, piece.y0 - pad);
  const x1 = Math.min(w - 1, piece.x1 + pad), y1 = Math.min(img.h - 1, piece.y1 + pad);
  const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
  const rgba = Buffer.alloc(cw * chh * 4);
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (y + y0) * w + (x + x0), o = (y * cw + x) * 4;
      rgba[o] = data[p * 3]; rgba[o + 1] = data[p * 3 + 1]; rgba[o + 2] = data[p * 3 + 2];
      rgba[o + 3] = fg[p] && label[p] === piece.id && !(piece.cutY && y + y0 > piece.cutY) ? 255 : 0;
    }
  }
  const flat = await stylize(rgba, cw, chh);
  await sharp(flat, { raw: { width: cw, height: chh, channels: 4 } })
    .resize(SPRITE, SPRITE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100 })
    .toFile(outFile);
}

const only = process.argv.slice(2);
const files = readdirSync(SRC)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .filter((f) => !only.length || only.includes(basename(f, extname(f))));

mkdirSync(OUT, { recursive: true });

for (const f of files) {
  const name = basename(f, extname(f));
  const img = await load(join(SRC, f));
  const paper = paperColor(img);
  // Halo scans are keyed on a smoothed copy, so the pencil glow reads as
  // one pale area the flood fill can take out.
  const bg = ISOLATE[name]
    ? isolate(await load(join(SRC, f), 15), ISOLATE[name])
    : HALOS.has(name)
      ? keepInk(keyPaper(await load(join(SRC, f), 9), paper, HALO_FAR), img)
      : keyPaper(img, paper);
  const { fg, label, pieces } = splitDrawings(bg, img.w, img.h);
  for (const old of readdirSync(OUT)) if (old === `${name}.webp` || old.startsWith(`${name}-`)) rmSync(join(OUT, old));
  for (let i = 0; i < pieces.length; i++) {
    const piece = GROUND_LINES.has(name) ? trimGroundLine(img, fg, label, pieces[i]) : pieces[i];
    await exportPiece(img, fg, label, piece, join(OUT, i ? `${name}-${i + 1}.webp` : `${name}.webp`));
  }
  console.log(`  ${name}: paper rgb(${paper.join(",")}), ${pieces.length} piece(s)`);
}

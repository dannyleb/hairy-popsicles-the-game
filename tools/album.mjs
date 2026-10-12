// Web-sized copies of the original scans for the Self-Portrait Album:
// assets/concept/<name>.jpg -> assets/album/<name>.jpg (900px long edge).
// These are what a filled album page shows; they load only when opened.
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SRC = "assets/concept", OUT = "assets/album";
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
  await sharp(join(SRC, f)).rotate().resize(900, 900, { fit: "inside" }).jpeg({ quality: 76, mozjpeg: true })
    .toFile(join(OUT, `${basename(f, extname(f))}.jpg`));
}
console.log(`  album scans written to ${OUT}/`);

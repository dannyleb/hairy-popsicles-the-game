# Assets

| Folder | What | Shipped to the site? |
|---|---|---|
| `concept/` | Original scans, one drawing per file, named by character | No (build skips it) |
| `sprites/` | Processed sprites made from `concept/` | Yes |

## Adding a new drawing

1. Scan it (white/off-white paper, the more blank margin the better) and
   drop it in `concept/` as `<name>.jpg`.
2. `npm run sprites -- <name>` (or plain `npm run sprites` to redo all).
3. Check `sprites/<name>.webp`. If one page had several separate drawings
   on it, they come out as `<name>.webp`, `<name>-2.webp`, ... largest first.
4. Add the character to `src/roster.js` (height, stick or not, position).

## What the pipeline does

1. **Cut out** (`tools/cutout.mjs`): flood-fills the paper away from the
   edges, so pale skin inside an ink outline survives; removes paper
   trapped between lines; splits separate drawings. Per-scan options at
   the top of the file handle drawn ground lines (`GROUND_LINES`), pencil
   glows (`HALOS`) and figures drawn inside a scene (`ISOLATE`, e.g. Toad).
2. **Trace** (`tools/trace.mjs`): rebuilds the drawing instead of cleaning
   up the scan. Pen lines are found (faint ones included), given a minimum
   weight and vector-traced. Color areas are found, then each is replaced
   by an entry from the fixed character palette (`PALETTE`): flesh tones
   only for base colors, plus red, blue and ink accents. A cel-shade
   crescent and a thin outline are added, and the layers are traced and
   stacked into an SVG that's rendered to the sprite. Tune with `STYLE`.

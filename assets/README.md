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
2. **Flatten** (`tools/stylize.mjs`): smooths the pencil grain away,
   groups colors by hue so shading becomes one solid fill, keeps small
   distinct spots (pimples, pupils), turns pen lines into solid ink, and
   adds one thick dark outline around the whole figure. Tune with `STYLE`.

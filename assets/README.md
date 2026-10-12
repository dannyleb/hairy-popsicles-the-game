# Assets

| Folder | What | Shipped to the site? |
|---|---|---|
| `concept/` | Original scans, one drawing per file, named by character | No (build skips it) |
| `sprites/` | Cut-out transparent WebP sprites made from `concept/` | Yes |
| `textures/` | `paper.jpg`, a blank patch of real paper used as the ground | Yes |

## Adding a new drawing

1. Scan it (white/off-white paper, the more blank margin the better) and
   drop it in `concept/` as `<name>.jpg`.
2. `npm run sprites -- <name>` (or plain `npm run sprites` to redo all).
3. Check `sprites/<name>.webp`. If one page had several separate drawings
   on it, they come out as `<name>.webp`, `<name>-2.webp`, ... largest first.
4. Add the character to `src/roster.js` (height, stick or not, position).

The cut-out keys out the paper by flood-filling from the edges, so pale
skin inside an ink outline survives. Paper fully enclosed by lines (between
legs, between hairs) gets removed too. If a sprite comes out wrong, hand
fixing the WebP in an image editor is fine; just don't re-run the script
over it afterwards.

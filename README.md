# Hairy Popsicles

A flat 2D browser game built from hand-drawn ink-and-colored-pencil
characters, turned into flat illustration and set loose in a world made of
skin. Design inspiration:
[The Good Time Garden](https://store.steampowered.com/app/1200860/The_Good_Time_Garden/)
by Coal Supper: a short, gross, surreal garden where you slap, water and
carry things to feed a friend who's always hungry. Fully static site, no
framework, no server code, deployed to GitHub Pages like
[Eagle Lake: Green Dog Run](https://github.com/dannyleb/eagle-lake-3d).

## Art direction

- **The world is skin.** Side-on 2D stage: a pale, yellowing skin wall
  behind, a flushed peach-and-pink skin floor in front with jaundiced
  patches, pores, creases and stray hairs, split by a thick ink horizon.
  The camera scrolls left and right; you can also walk into and out of the
  floor, and things further back are painted behind.
- **Swollen pimples everywhere**, random sizes: domes on the floor and
  round ones on the wall.
- **Flat 2D illustration.** The scanned drawings are processed into solid
  colors, solid ink lines and one consistent thick dark outline
  (`tools/stylize.mjs`); no pencil texture survives. Their colors are
  pulled toward the world's skin palette and outlines are a warm
  maroon-black, so the cast sits in the same world as the ground.
  Everything the game draws itself (`src/ink.js`) uses the same rules.
- **Floating heads are popsicles**, planted on wooden sticks and swaying.

## Tech stack

| Area | Choice |
|---|---|
| Rendering | Canvas 2D, no engine |
| Language | Plain JavaScript (ES modules), no framework, no runtime dependencies |
| Bundler | esbuild: one IIFE bundle targeting ES2019 |
| Art pipeline | `tools/cutout.mjs` + `tools/stylize.mjs` with [sharp](https://sharp.pixelplumbing.com/) (dev only) |
| Linting | ESLint 9 (flat config, `eslint.config.js`) |
| Hosting | GitHub Pages, deployed by GitHub Actions on push to `main` |
| Runtime | Node 20+ (build only) |

## Running locally

```bash
npm install
npm run dev       # dev server at http://localhost:8080, rebuilds on reload
npm run build     # production build into dist/
npm run lint      # ESLint over src/, tools/ and the build script
npm run sprites   # re-cut sprites from assets/concept/ (see assets/README.md)
```

Edits to `public/` or `assets/` need a dev server restart. `dist/` is
generated and not committed.

## How it plays

Toad sits in his corner of the page, starving. Three verbs:

| Verb | Keyboard | Touch | Does |
|---|---|---|---|
| Slap | Space | SLAP | Whack whoever is nearest, or pop a pimple |
| Grab | E | GRAB | Pick up / drop / feed Toad / talk |
| Water | Q | WATER | Splash from your can; walk into blue drips to refill it |

Walk with WASD / arrows (Shift to run) or the D-pad. The page is split
into three zones walled by hedges of hair; each meal Toad eats makes the
next hedge wither:

1. **Hub.** Slap Pimples until what's growing in him pops out. Feed it to Toad.
2. **West.** Roast is too dry to eat. Water him until he's juicy. Feed him.
3. **East.** Slap Big Eye's loose eye out. Feed it to Toad. He's full. For now.

**Pus points.** Slap a floor pimple to pop it (bubble-pop sound). Pus
globs spray out; walk over them to slurp them up. Each glob is one pus
point, shown top-left and saved in the browser (`localStorage`), to be
spent on something later. Popped pimples swell back up after 40-75 s.
Walking on the skin squelches.

All names and dialogue are placeholders. `?debug` in the URL exposes
`window.game` (player, world, story) for testing.

## Project structure

```
src/main.js          image loading, game loop, start screen wiring
src/config.js        stage size, walkable area, player, colors
src/roster.js        every character: sprite, size, stick, position, lines; drip spots
src/story.js         the puzzle chain: what slapping/watering/feeding does to whom
src/interact.js      the verbs: slap, grab/give/talk, water; carrying; spray and feeding arcs
src/stage.js         the 2D renderer: skin wall and floor, horizon, depth-sorted drawing, camera
src/world.js         entities (cast, items, drips, pimples), squash-and-stretch, sway
src/gates.js         hair hedges: page edges and the two zone gates
src/ink.js           everything drawn at runtime: skin tiles, pimples, stick, shadow, hair, drip, eyeball
src/player.js        movement, zone bounds, collisions, waddle and slap lunge
src/controls.js      keyboard, D-pad and verb buttons
src/pus.js           pus globs, pus points (saved), pimple regrowth
src/sfx.js           procedural sound: slap, splash, gulp, burp, bubble pop, squish, bloop
src/ui/hud.js        objective, can meter, verb prompt, speech bubbles, bursts, end card
public/              index.html, style.css
assets/              scans and processed sprites (see assets/README.md)
tools/cutout.mjs     paper keying, splitting, sprite export
tools/stylize.mjs    flat-illustration pass: solid colors, solid ink, thick outline
build.mjs            esbuild build and dev server; cache-busting hashes
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```

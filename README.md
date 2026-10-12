# Hairy Popsicles

A browser-based 3D game built with Three.js, where every character is a
hand-drawn ink-and-colored-pencil drawing cut out of the page. Design
inspiration: [The Good Time Garden](https://store.steampowered.com/app/1200860/The_Good_Time_Garden/)
by Coal Supper: a short, gross, surreal garden where you slap, water and
carry things to feed a friend who's always hungry. Fully static site, no framework, no server code; same stack and
layout as [Eagle Lake: Green Dog Run](https://github.com/dannyleb/eagle-lake-3d).

## Art direction

- **The world is the sketchbook page.** The ground is a real scanned paper
  texture, and the fog is paper-white, so the world fades back into blank
  paper at the edges.
- **Characters are the scans themselves**, cut out of the paper and stood
  up as flat billboards (the Don't Starve / Paper Mario approach). The
  camera holds a fixed three-quarter angle so the art always faces you.
- **Floating heads are popsicles**, planted on wooden sticks and swaying.
- **Props are drawn in the same vocabulary** at runtime (`src/ink.js`):
  pen-hatched shadows like the ones in the balloon-gang drawing, stray
  hairs sprouting from the paper, blue drips, the sticks.
- **Unlit.** Everything uses flat, unlit materials so pencil colors render
  exactly as drawn. The ink is already in the art, so there's no outline
  shader.

## Tech stack

| Area | Choice |
|---|---|
| Rendering | [Three.js](https://threejs.org/) (WebGL) |
| Language | Plain JavaScript (ES modules), no framework |
| Bundler | esbuild: one IIFE bundle targeting ES2019 |
| Art pipeline | `tools/cutout.mjs` with [sharp](https://sharp.pixelplumbing.com/) (dev only) |
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
| Slap | Space | SLAP | Whack whoever is nearest |
| Grab | E | GRAB | Pick up / drop / feed Toad / talk |
| Water | Q | WATER | Splash from your can; walk into blue drips to refill it |

Walk with WASD / arrows (Shift to run) or the D-pad. The page is split
into three zones walled by hedges of hair; each meal Toad eats makes the
next hedge wither:

1. **Hub.** Slap Pimples until what's growing in him pops out. Feed it to Toad.
2. **West.** Roast is too dry to eat. Water him until he's juicy. Feed him.
3. **East.** Slap Big Eye's loose eye out. Feed it to Toad. He's full. For now.

All names and dialogue are placeholders. `?debug` in the URL exposes
`window.game` (player, world, story) for testing.

## Project structure

```
src/main.js          texture loading, game loop, start screen wiring
src/config.js        world, player, camera, paper/ink colors
src/roster.js        every character: sprite, size, stick, position, lines; drip spots
src/story.js         the puzzle chain: what slapping/watering/feeding does to whom
src/interact.js      the verbs: slap, grab/give/talk, water; carrying; spray and feeding arcs
src/gates.js         hair hedges: page edges and the two zone gates
src/cutout.js        a drawing standing in the world (art + stick + shadow)
src/ink.js           runtime-drawn props: stick, hatched shadow, hair, drip, eyeball
src/world.js         paper ground, fog, cast, items, drips, moon, squash-and-stretch
src/player.js        movement, zone bounds, collisions, waddle and slap lunge
src/camera.js        fixed three-quarter follow camera
src/controls.js      keyboard, D-pad and verb buttons
src/sfx.js           procedural sound: slap, splash, gulp, burp, pop, splort
src/ui/hud.js        objective, can meter, verb prompt, speech bubbles, bursts, end card
public/              index.html, style.css
assets/              scans, sprites, paper texture (see assets/README.md)
tools/cutout.mjs     paper keying + sprite export
build.mjs            esbuild build and dev server; cache-busting hashes
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```

# Hairy Popsicles

A browser-based 3D free-roam game built with Three.js, where every
character is a hand-drawn ink-and-colored-pencil drawing cut out of the
page. Fully static site, no framework, no server code; same stack and
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

## Current gameplay

- Walk the page (WASD / arrows, Shift to run, D-pad on touch).
- You play Antenna; the other 22 characters from the drawings stand around the field.
- One mission: mop up 12 blue drips.

## Project structure

```
src/main.js          texture loading, game loop, start screen wiring
src/config.js        world, player, camera, paper/ink colors
src/roster.js        every character: sprite, size, stick or not, position
src/cutout.js        a drawing standing in the world (art + stick + shadow)
src/ink.js           runtime-drawn props: stick, hatched shadow, hair tufts, drip
src/world.js         paper ground, fog, tufts, cast, drips, moon
src/player.js        player movement, collisions, paper-puppet waddle
src/camera.js        fixed three-quarter follow camera
src/controls.js      keyboard + on-screen D-pad input
src/missions/        data-driven missions
src/ui/hud.js        objective card + toast
public/              index.html, style.css
assets/              scans, sprites, paper texture (see assets/README.md)
tools/cutout.mjs     paper keying + sprite export
build.mjs            esbuild build and dev server; cache-busting hashes
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```

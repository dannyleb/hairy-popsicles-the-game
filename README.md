# Hairy Popsicles

A browser-based 3D free-roam game, built with Three.js. Fully static site,
no framework, no server code — just like
[Eagle Lake: Green Dog Run](https://github.com/dannyleb/eagle-lake-3d), which
this project's tech stack and project layout are deliberately modeled on.

This is a **framework scaffold**, not a finished game: a flat placeholder
world, a placeholder player capsule, and a one-mission scaffold ("collect
the popsicles"). The real visual style, world and missions are TBD, to be
defined once hand-drawn reference art is dropped into `assets/`.

## Tech stack

| Area | Choice |
|---|---|
| Rendering | [Three.js](https://threejs.org/) (WebGL) |
| Language | Plain JavaScript (ES modules), no framework |
| Bundler | esbuild: one IIFE bundle targeting ES2019 |
| Linting | ESLint 9 (flat config, `eslint.config.js`) |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Runtime | Node 20+ (build only) |

## Running locally

```bash
npm install
npm run dev       # dev server at http://localhost:8080, rebuilds on reload
npm run build     # production build into dist/
npm run lint      # ESLint over src/ and the build script
```

Edits to `public/` or `assets/` need a dev server restart. `dist/` is
generated and not committed.

## Build and deploy

`build.mjs` does the whole build:

1. Wipes `dist/` and copies `public/` (page, styles) and `assets/` into it.
2. Bundles `src/main.js` with esbuild into `dist/bundle.js`.
3. Stamps content hashes onto the script and stylesheet links so a browser
   never pairs a fresh `index.html` with a stale cached bundle.

`.github/workflows/pages.yml` runs on every push to `main`: `npm ci`, lint,
build, then deploy `dist/` to GitHub Pages. Turn on Pages for this repo
under **Settings → Pages → Source: GitHub Actions** once this is pushed.

## Current (placeholder) gameplay

- Free-roam on foot over a flat checkered field.
- WASD / arrow keys to move, Shift to run, on-screen D-pad on touch devices.
- Third-person follow camera.
- One scaffold mission: walk into all 12 placeholder popsicle cones.

## Project structure

```
src/main.js          scene setup, animation loop, start screen wiring
src/config.js        world/player/camera constants
src/controls.js      keyboard + on-screen D-pad input
src/world.js         ground, lighting, fog, placeholder pickups
src/player.js        placeholder player mesh and movement
src/camera.js        third-person follow camera
src/missions/        data-driven mission scaffold
src/ui/hud.js        objective banner + toast
public/              static files: index.html, style.css
assets/              hand-drawn art goes here once it exists (see assets/README.md)
build.mjs            esbuild build and dev server; cache-busting hashes
eslint.config.js     lint rules
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```

## Next steps

1. Drop hand-drawn reference art into `assets/concept/`.
2. Settle on art direction (texture style, character look) from that art.
3. Replace the procedural placeholders in `src/world.js` / `src/player.js`
   with real textures/sprites.
4. Flesh out `src/missions/index.js` with real missions once the setting
   and story are defined.

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
- **Traced 2D illustration.** The scans aren't shown as-is: each one is
  rebuilt (`tools/trace.mjs`). Its pen lines are extracted and vector-traced
  into crisp, even ink; its colored areas are replaced by one fixed,
  shared palette so every character uses the same colors; and every
  character gets the same cel-shading (a darker tone along the lower-right
  edge) and a thin maroon-black outline.
- **Characters are flesh-toned only:** peach, pale yellow, pink and tan for
  base tones. Greens become jaundiced yellow, whites and greys become pale
  peach; small accents stay (blood red, drip blue, ink). The world is a
  dustier, deeper flesh so the cast reads on top of it.
- **Floating heads are popsicles**, planted on wooden sticks and swaying.

## Tech stack

| Area | Choice |
|---|---|
| Rendering | Canvas 2D, no engine |
| Language | Plain JavaScript (ES modules), no framework, no runtime dependencies |
| Bundler | esbuild: one IIFE bundle targeting ES2019 |
| Art pipeline | `tools/cutout.mjs` + `tools/trace.mjs` with [sharp](https://sharp.pixelplumbing.com/) and [potrace](https://www.npmjs.com/package/potrace) (dev only) |
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
| Slap | Space | SLAP | Whack whoever is nearest, swat a fly, or pop a pimple |
| Grab | E | GRAB | Feed Toad / pick up / drop / talk |
| Water | Q | WATER | Splash from your can; walk into blue teardrops to refill it |

Walk with WASD / arrows (Shift to run) or the D-pad.

**Feeding Toad.** Walk over crumbs and curly pubic hairs to pocket them;
swat house flies out of the air (Space) and pick them up. Pockets hold 12.
Press E next to Toad to feed him everything you're carrying. Values are in
`FOOD` in `src/config.js` (crumb/hair 1, fly 3). Scraps respawn in their
zone after a while. Big meals, carried over by hand:

- Slap Pimples until what's growing in him pops out (5).
- Roast is too dry; water him until he's juicy (8).
- Slap Big Eye's loose eye out (10).

**Opening the page.** Fill Toad's belly (meter in the objective card) and
he's full: he burps, the next hair wall evaporates, the camera shows you
the opening, and his appetite comes back bigger. `STAGES` in
`src/config.js`: 15 opens the west, 22 the east, 30 and he's full for good.
New zones are a new stage entry plus a gate in `src/gates.js`.

**Pus points.** Pop a floor pimple by tapping/clicking it (you walk over),
or by walking up to it and pressing E or Space (bubble-pop sound). Pus
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
src/story.js         Toad's belly and appetite stages, big meals, who says what
src/interact.js      the verbs: slap, grab/give/talk, water; carrying; spray and feeding arcs
src/stage.js         the 2D renderer: skin wall and floor, horizon, depth-sorted drawing, camera
src/world.js         entities (cast, items, drips, pimples), squash-and-stretch, sway
src/gates.js         hair hedges: page edges and the zone gates (evaporate when opened)
src/ink.js           everything drawn at runtime: skin tiles, pimples, stick, shadow, hair, drip, eyeball
src/player.js        movement, zone bounds, collisions, waddle and slap lunge
src/controls.js      keyboard, D-pad and verb buttons
src/pus.js           pus globs, pus points (saved), pimple regrowth
src/scraps.js        Toad food: crumbs, hairs, flies (buzz, swat), pockets, respawn
src/music.js         background music: menu + gameplay loop, "tap to enter" if autoplay is blocked, mute
src/sfx.js           procedural sound: slap, splash, gulp, burp, bubble pop, squish, bloop
src/ui/hud.js        objective, can meter, verb prompt, speech bubbles, bursts, end card
public/              index.html, style.css, audio/theme.mp3 (background music)
assets/              scans and processed sprites (see assets/README.md)
tools/cutout.mjs     paper keying, splitting, sprite export
tools/trace.mjs      rebuild as vector art: traced lines, fixed flesh palette, cel shade, outline
build.mjs            esbuild build and dev server; cache-busting hashes
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```

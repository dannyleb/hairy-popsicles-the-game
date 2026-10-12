# Assets

Drop hand-drawn reference and production art here. Nothing currently reads
from this folder — it's wired into the build (`build.mjs` copies it into
`dist/assets/`) so that once real art lands, code can load it with a plain
relative path like `assets/textures/grass.png`.

Suggested layout, create as needed:

- `concept/` — reference drawings/photos used to define the look, not
  shipped art. Fine to keep large/messy here.
- `textures/` — tileable ground/wall/sky textures.
- `sprites/` — characters, pickups, UI icons.

Everything in the game right now (ground checker, player capsule, popsicle
cones) is a procedural placeholder in `src/world.js` and `src/player.js`.
Once art arrives, swap those for texture/sprite loads and we'll settle on
the real visual style and missions from there.

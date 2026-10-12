// Pus economy. Popping a pimple sprays globs of pus; walk over them to
// slurp them up for pus points. Points are saved in the browser and will be
// spent on something later. Popped pimples swell back up after a while.
import { AREA } from "./config.js";
import { pusGlobTexture } from "./ink.js";
import { floorDist, makeEntity, squash } from "./world.js";
import { sfx } from "./sfx.js";

const SAVE_KEY = "hairy-popsicles-pus";
const GRAVITY = 22;
const MAGNET = 1.9;      // floor distance at which a landed glob flies to you
const REGROW = [40, 75]; // seconds before a popped pimple swells back

function load() {
  try { return Math.max(0, parseInt(localStorage.getItem(SAVE_KEY), 10) || 0); } catch { return 0; }
}
function save(n) {
  try { localStorage.setItem(SAVE_KEY, String(n)); } catch {}
}

export function createPus({ world, player, hud }) {
  const globImgs = Array.from({ length: 4 }, (_, i) => pusGlobTexture(500 + i));
  let points = load();
  let streak = 0, streakT = 0;
  world.globs = [];
  hud.setPus(points, false);

  function burst(pimple) {
    const n = 3 + Math.round(pimple.h * 5);
    for (let i = 0; i < n; i++) {
      const size = 0.32 + Math.random() * 0.2 + pimple.h * 0.06;
      const g = makeEntity(globImgs[i % globImgs.length], size, pimple.x, pimple.g, { kind: "glob", shadow: false });
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
      g.vx = Math.cos(a) * sp;
      g.vg = Math.sin(a) * sp * 0.35;
      g.vy = 5 + Math.random() * 5 + pimple.h * 2;
      g.lift = pimple.h * 0.6;
      g.state = "air";
      world.globs.push(g);
    }
    pimple.regrow = REGROW[0] + Math.random() * (REGROW[1] - REGROW[0]);
  }

  function collect(g) {
    world.globs.splice(world.globs.indexOf(g), 1);
    points++;
    save(points);
    streak++;
    streakT = 1.2;
    sfx.bloop(streak);
    hud.setPus(points, true);
  }

  function update(dt) {
    streakT -= dt;
    if (streakT <= 0) streak = 0;

    for (let i = world.globs.length - 1; i >= 0; i--) {
      const g = world.globs[i];
      if (g.state === "air") {
        g.x += g.vx * dt;
        g.g = Math.max(0.3, Math.min(AREA.front, g.g + g.vg * dt));
        g.vy -= GRAVITY * dt;
        g.lift += g.vy * dt;
        g.rot += g.vx * dt * 2;
        if (g.lift <= 0) {
          g.lift = 0;
          g.rot = 0;
          g.state = "ground";
          squash(g, 1.2);
        }
      } else if (g.state === "ground") {
        if (floorDist(player, g) < MAGNET) g.state = "fly";
      } else {
        // Fly into the player.
        const k = Math.min(1, dt * 12);
        g.x += (player.x - g.x) * k;
        g.g += (player.g - g.g) * k;
        g.lift += (player.top * 0.5 - g.lift) * k;
        g.scale = Math.max(0.3, g.scale - dt * 2);
        if (floorDist(player, g) < 0.35) collect(g);
      }
    }

    for (const p of world.pimples) {
      if (p.kind !== "popped") continue;
      p.regrow -= dt;
      if (p.regrow <= 0) {
        unpop(p);
        squash(p, 1.4);
      }
    }
  }

  return {
    burst,
    update,
    get points() { return points; },
  };
}

export function unpop(p) {
  Object.assign(p, p.orig, { kind: "pimple" });
}

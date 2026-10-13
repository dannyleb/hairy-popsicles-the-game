// Giant warts: extremely rare. At most one is on the page at a time; the
// first turns up a couple of minutes in, the next a few minutes after you
// deal with it, somewhere in ground you've opened and away from you. It
// twinkles (stage.js) and takes HITS slaps to burst. Bursting one is a
// jackpot: a big spray of rich pus, a guaranteed curio, and its seeds turn
// the nearest pimples golden.
import { AREA, DEPTH } from "./config.js";
import { wartTexture } from "./ink.js";
import { floorDist, makeEntity, squash } from "./world.js";
import { sfx } from "./sfx.js";

const HITS = 8;               // slaps to burst one
const FIRST = [120, 180];     // seconds of play before the first wart
const NEXT = [240, 420];      // seconds after one bursts before the next
const SIZE = 1.8;             // world units tall
const GLOBS = 30, GLOB_VALUE = 3, SEEDS = 3;

const rand = (a, b) => a + Math.random() * (b - a);

export function createWarts({ world, player, hud, progress, pus, stage }) {
  const img = wartTexture(4401), cracked = wartTexture(4401, true);
  let wartIn = rand(...FIRST);
  world.warts = [];

  const zones = () => [
    [-AREA.gateX + 2, AREA.gateX - 2],
    ...(world.gates.west.open ? [[AREA.minX + 2, -AREA.gateX - 2]] : []),
    ...(world.gates.east.open ? [[AREA.gateX + 2, AREA.maxX - 2]] : []),
  ];

  // A clear spot in open ground, not right next to you.
  function spot() {
    const open = zones();
    for (let i = 0; i < 60; i++) {
      const [x0, x1] = open[Math.floor(Math.random() * open.length)];
      const x = rand(x0, x1), g = rand(1.2, AREA.front - 0.8);
      const at = { x, g };
      if (floorDist(player, at) < 5) continue;
      if (world.people.some((p) => floorDist(p, at) < p.radius + 3.5)) continue;
      // Not where Toad wanders, so E means "slap the wart", not "feed him".
      const toad = world.byId.toad, home = toad.home || [toad.x, toad.g];
      if (Math.hypot(x - home[0], (g - home[1]) * DEPTH) < 9) continue;
      if (world.pimples.some((p) => Math.hypot(p.x - x, (p.g - g) * DEPTH) < 1.6)) continue;
      return at;
    }
    return null;
  }

  function grow() {
    const at = spot();
    if (!at) { wartIn = 10; return; }
    const w = makeEntity(img, SIZE, at.x, at.g, { kind: "wart", radius: 0.9 });
    w.hits = 0;
    world.warts.push(w);
    squash(w, 1.5);
  }

  function burst(w) {
    world.warts.splice(world.warts.indexOf(w), 1);
    pus.gush({ x: w.x, g: w.g, h: SIZE }, GLOBS, GLOB_VALUE);
    const seeded = pus.goldenNear(w.x, w.g, SEEDS);
    progress.add("warts");
    sfx.splort();
    sfx.jackpot();
    stage.shake(0.9);
    hud.burst("WART BUSTED!", w);
    hud.banner("GIANT WART", "Busted wide open", `${GLOBS * GLOB_VALUE} pus, a curio${seeded.length ? `, ${seeded.length} golden pimples nearby` : ""}`);
    wartIn = rand(...NEXT);
  }

  return {
    // The wart within reach, if any (interact.js slaps it).
    near(reach) {
      for (const w of world.warts) if (floorDist(player, w) - w.radius < reach) return w;
      return null;
    },

    hit(w) {
      w.hits++;
      if (w.hits >= HITS) return burst(w);
      sfx.slap();
      squash(w, 1.1);
      w.scale = 1 - w.hits * 0.04;
      if (w.hits >= HITS / 2) w.img = w.baseImg = cracked;
      if (w.hits >= HITS - 2) stage.shake(0.15);
      hud.floatText(`${w.hits}/${HITS}`, w, "#f1c56c");
    },

    update(dt) {
      if (world.warts.length) return;
      wartIn -= dt;
      if (wartIn <= 0) grow();
    },

    // Debug/testing: grow one now (window.game.warts.growNow()).
    growNow: grow,
  };
}

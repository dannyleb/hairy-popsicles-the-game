// Pus economy. Popping a pimple sprays globs of pus; walk over them to
// slurp them up for pus points (saved by progress.js, spent at Mirror's
// shop). Pops in quick succession build a combo that multiplies every glob.
// About 1 pimple in 40 is a golden whitehead that gushes; now and then a
// glob has a curio in it. Pops leave stains; popped pimples swell back.
import { AREA, MAX_STAINS } from "./config.js";
import { CURIOS, goldenPimpleTexture, mysteryGlobTexture, pusGlobTexture, stainTexture } from "./ink.js";
import { floorDist, makeEntity, squash } from "./world.js";
import { sfx } from "./sfx.js";

const GRAVITY = 22;
const REGROW = [40, 75];   // seconds before a popped pimple swells back
const GOLDEN_ODDS = 1 / 40;
const MYSTERY_ODDS = 1 / 22; // per pop
const STAIN_LIFE = 45;

export function createPus({ world, player, hud, progress, upgrades, stage }) {
  const globImgs = Array.from({ length: 4 }, (_, i) => pusGlobTexture(500 + i));
  const mysteryImg = mysteryGlobTexture();
  const goldenImg = goldenPimpleTexture(101);
  const stainImgs = Array.from({ length: 4 }, (_, i) => stainTexture(800 + i));
  let streak = 0, streakT = 0;
  world.globs = [];
  world.stains = [];
  hud.setPus(progress.pus, false);

  function maybeGolden(p) {
    p.golden = Math.random() < GOLDEN_ODDS;
    if (p.golden) { p.plainImg = p.img; p.img = goldenImg; }
  }
  for (const p of world.pimples) maybeGolden(p);

  function spawn(pimple, img, value, extra = {}) {
    const size = 0.32 + Math.random() * 0.2 + pimple.h * 0.06;
    const g = makeEntity(img, size, pimple.x, pimple.g, { kind: "glob", shadow: false, value, ...extra });
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * (pimple.golden ? 6 : 3.5);
    g.vx = Math.cos(a) * sp;
    g.vg = Math.sin(a) * sp * 0.35;
    g.vy = 5 + Math.random() * (pimple.golden ? 9 : 5) + pimple.h * 2;
    g.lift = pimple.h * 0.6;
    g.state = "air";
    world.globs.push(g);
  }

  function burst(pimple, mult = 1) {
    if (pimple.golden) {
      for (let i = 0; i < 24; i++) spawn(pimple, globImgs[i % 4], 2 * mult);
      progress.add("golden");
      sfx.jackpot();
      stage.shake(0.6);
      hud.burst("JACKPOT!", pimple);
    } else {
      const n = 3 + Math.round(pimple.h * 5);
      for (let i = 0; i < n; i++) spawn(pimple, globImgs[i % 4], mult);
    }
    if (Math.random() < MYSTERY_ODDS) spawn(pimple, mysteryImg, 1, { curio: true });
    world.stains.push({ img: stainImgs[Math.floor(Math.random() * 4)], x: pimple.x, g: pimple.g + 0.05, size: 0.9 + pimple.h * 0.8, t: 0, life: STAIN_LIFE, kind: "pus" });
    if (world.stains.length > MAX_STAINS) world.stains.shift();
    pimple.regrow = REGROW[0] + Math.random() * (REGROW[1] - REGROW[0]);
  }

  function findCurio() {
    const fresh = CURIOS.filter((c) => !progress.hasCurio(c.id));
    const pool = fresh.length && Math.random() < 0.75 ? fresh : CURIOS;
    const c = pool[Math.floor(Math.random() * pool.length)];
    const isNew = progress.addCurio(c.id);
    hud.banner(isNew ? "NEW CURIO" : "CURIO", c.name, isNew ? "added to your album" : "you already have one");
    sfx.chime();
  }

  function collect(g) {
    world.globs.splice(world.globs.indexOf(g), 1);
    progress.addPus(g.value);
    streak++;
    streakT = 1.2;
    sfx.bloop(streak);
    hud.setPus(progress.pus, true);
    hud.floatText(`+${g.value}`, player, g.value > 1 ? "#f1c56c" : "#fbe5a6");
    if (g.curio) findCurio();
  }

  function update(dt) {
    streakT -= dt;
    if (streakT <= 0) streak = 0;
    const magnet = upgrades().magnet;

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
        if (floorDist(player, g) < magnet) g.state = "fly";
      } else {
        const k = Math.min(1, dt * 12);
        g.x += (player.x - g.x) * k;
        g.g += (player.g - g.g) * k;
        g.lift += (player.top * 0.5 - g.lift) * k;
        g.scale = Math.max(0.3, g.scale - dt * 2);
        if (floorDist(player, g) < 0.35) collect(g);
      }
    }

    for (let i = world.stains.length - 1; i >= 0; i--) {
      world.stains[i].t += dt;
      if (world.stains[i].t > world.stains[i].life) world.stains.splice(i, 1);
    }

    for (const p of world.pimples) {
      if (p.kind !== "popped") continue;
      p.regrow -= dt;
      if (p.regrow <= 0) {
        unpop(p);
        if (p.golden && p.plainImg) p.img = p.plainImg;
        maybeGolden(p);
        squash(p, 1.4);
      }
    }
  }

  return { burst, update };
}

function unpop(p) {
  Object.assign(p, p.orig, { kind: "pimple" });
}

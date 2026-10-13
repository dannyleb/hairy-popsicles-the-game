// Idle life for everyone on the page, so nobody is a static cut-out:
//   - everyone breathes; Toad heaves
//   - heads on sticks bob, tilt toward you when you're near, and shudder
//   - walkers wander around their spot, waddling and facing where they go
//   - hoppers hop, floaters hover
//   - criers, sweaters and droolers shed drops that land as teardrops you
//     can collect for your watering can
//   - people mutter to themselves as you walk past
//   - Toad gets excited when you're carrying food
// The player gets breathing, a lean into movement and a squash on each step.
import { AREA, DEPTH } from "./config.js";
import { floorDist, makeEntity, squash } from "./world.js";
import { puddleTexture } from "./ink.js";

const WALK_SPEED = 1.3;
const SHED = [9, 18];           // seconds between drops (only near you)
const DROP_LIFE = 25;           // seconds a shed drop stays on the ground
const MUTTER_GAP = [6, 11];     // seconds between anyone muttering
const MUTTER_ALONE = 30;        // seconds before the same person mutters again

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createLife({ world, player, hud, story, scraps, isNight = () => false }) {
  // Red Eye only comes out at night, somewhere near you.
  const redeye = world.byId.redeye;
  function nightOwl() {
    if (!redeye) return;
    const night = isNight();
    if (night && !redeye.out) {
      const lo = Math.max(AREA.minX + 2, -AREA.gateX + 1.5 - (world.gates.west.open ? 40 : 0));
      const hi = Math.min(AREA.maxX - 2, AREA.gateX - 1.5 + (world.gates.east.open ? 40 : 0));
      for (let i = 0; i < 30; i++) {
        const x = Math.max(lo, Math.min(hi, player.x + (Math.random() < 0.5 ? -1 : 1) * rand(5, 11)));
        const g = rand(1, AREA.front - 1);
        if (world.people.every((p) => p === redeye || Math.hypot(p.x - x, (p.g - g) * DEPTH) > p.radius + 2)) {
          Object.assign(redeye, { x, g, home: [x, g], out: true, visible: true, scale: 1 });
          squash(redeye, 1.5);
          break;
        }
      }
    } else if (!night && redeye.out) {
      Object.assign(redeye, { out: false, visible: false, x: 9999 });
    }
  }
  if (redeye) Object.assign(redeye, { out: false, visible: false, x: 9999 });

  const toad = story.toad;
  const dripImg = world.drips[0].img;
  let mutterIn = rand(4, 7);
  const puddles = [0, 1, 2].map((i) => puddleTexture(900 + i));
  let excitedT = 0;

  for (const p of world.people) {
    p.home = [p.x, p.g];
    p.shedIn = rand(...SHED);
    p.shudderIn = rand(6, 16);
    p.shudder = 0;
    p.mutterAt = -MUTTER_ALONE;
    p.walkT = 0;
    p.wait = rand(1, 4);
    p.goal = null;
    p.hopT = 0;
    p.hopIn = rand(2, 6);
  }

  function zoneBounds(x) {
    if (x < -AREA.gateX) return [AREA.minX + 1, -AREA.gateX - 1.5];
    if (x > AREA.gateX) return [AREA.gateX + 1.5, AREA.maxX - 1];
    return [-AREA.gateX + 1.5, AREA.gateX - 1.5];
  }

  function wander(p, dt) {
    if (!p.goal) {
      p.wait -= dt;
      p.walkT = 0;
      p.lift = 0;
      if (p.wait <= 0) {
        const [lo, hi] = zoneBounds(p.home[0]);
        p.goal = [
          Math.max(lo, Math.min(hi, p.home[0] + rand(-3.5, 3.5))),
          Math.max(0.6, Math.min(AREA.front - 0.4, p.home[1] + rand(-1.5, 1.5))),
        ];
      }
      return;
    }
    // Stand still while you're right next to them.
    if (floorDist(player, p) < p.radius + 1.4) return;
    const dx = p.goal[0] - p.x, dg = p.goal[1] - p.g;
    const d = Math.hypot(dx, dg * DEPTH);
    if (d < 0.1) {
      p.goal = null;
      p.wait = rand(2, 6);
      p.lift = 0;
      return;
    }
    const step = Math.min(d, WALK_SPEED * dt);
    p.x += (dx / d) * step;
    p.g += (dg / d) * step / DEPTH;
    if (Math.abs(dx) > 0.05) p.flip = dx < 0;
    const before = Math.floor(p.walkT / Math.PI);
    p.walkT += dt * 8;
    if (Math.floor(p.walkT / Math.PI) !== before) squash(p, 0.18);
    p.rot += Math.sin(p.walkT) * 0.09;
    p.lift = Math.abs(Math.sin(p.walkT)) * 0.12;
  }

  function shed(p) {
    const [ox, oy] = p.drip;
    const d = makeEntity(dripImg, 0.5, p.x + ox * p.w * (p.flip ? -1 : 1), p.g + 0.05, { shadow: false, kind: "drip" });
    d.lift = p.stickH + p.h * (1 - oy) + (p.headBob || 0);
    d.vy = 0;
    d.falling = true;
    d.temp = true;
    d.life = DROP_LIFE;
    d.phase = Math.random() * 6;
    d.respawn = 0;
    world.drips.push(d);
  }

  function updateDrops(dt) {
    for (let i = world.drips.length - 1; i >= 0; i--) {
      const d = world.drips[i];
      if (!d.temp) continue;
      if (d.falling) {
        d.vy -= 18 * dt;
        d.lift += d.vy * dt;
        if (d.lift <= 0.2) {
          d.lift = 0.2;
          d.falling = false;
          squash(d, 1);
          if (world.stains) {
            world.stains.push({ img: pick(puddles), x: d.x, g: d.g + 0.02, size: 0.9 + Math.random() * 0.4, t: 0, life: DROP_LIFE + 5, kind: "water" });
            if (world.stains.length > 40) world.stains.shift();
          }
        }
        continue;
      }
      d.life -= dt;
      d.scale = Math.min(1, d.life / 2);
      if (d.life <= 0) world.drips.splice(i, 1);
    }
  }

  function mutter(t) {
    let best = null, bd = 4.5;
    for (const p of world.people) {
      if (!p.mutter || t - p.mutterAt < MUTTER_ALONE) continue;
      const d = floorDist(player, p) - p.radius;
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    best.mutterAt = t;
    hud.say(best, pick(best.mutter));
  }

  return {
    update(dt, t, input) {
      nightOwl();
      for (const p of world.people) {
        p.breath = Math.sin(t * (p === toad ? 1.1 : 1.7) + p.phase) * (p === toad ? 0.045 : 0.018);
        const near = floorDist(player, p) < 5.5;

        if (p.stickH) {
          p.headBob = Math.sin(t * 1.3 + p.phase) * 0.06;
          const want = near ? Math.max(-0.28, Math.min(0.28, (player.x - p.x) * 0.07)) : 0;
          p.lean = (p.lean || 0) + (want - (p.lean || 0)) * Math.min(1, dt * 3);
          p.shudderIn -= dt;
          if (p.shudderIn <= 0) { p.shudder = 0.6; p.shudderIn = rand(7, 18); }
          p.shudder = Math.max(0, p.shudder - dt);
          p.headTilt = p.lean + (p.shudder ? Math.sin(t * 45) * 0.1 * (p.shudder / 0.6) : 0);
        } else if (!p.move && p !== toad) {
          const want = near ? Math.max(-0.1, Math.min(0.1, (player.x - p.x) * 0.03)) : 0;
          p.headTilt = (p.headTilt || 0) + (want - (p.headTilt || 0)) * Math.min(1, dt * 3);
        }

        if (p.move === "walk") wander(p, dt);
        else if (p.move === "float") {
          p.lift = 0.25 + Math.sin(t * 1.4 + p.phase) * 0.2;
          p.rot += Math.sin(t * 0.8 + p.phase) * 0.04;
        } else if (p.move === "hop") {
          p.hopIn -= dt;
          if (p.hopIn <= 0 && !p.hopT) p.hopT = 0.001;
          if (p.hopT) {
            p.hopT += dt * 3.2;
            p.lift = Math.abs(Math.sin(p.hopT * Math.PI)) * 0.45;
            if (p.hopT >= 2) { p.hopT = 0; p.lift = 0; p.hopIn = rand(2.5, 7); squash(p, 0.6); }
          }
        }

        if (p.drip && Math.abs(p.x - player.x) < 14) {
          p.shedIn -= dt;
          if (p.shedIn <= 0) { shed(p); p.shedIn = rand(...SHED); }
        }
      }

      // Toad perks up when you've got food for him.
      const hasFood = scraps.pockets.length > 0;
      if (hasFood && floorDist(player, toad) < 10 && !story.done) {
        excitedT -= dt;
        if (excitedT <= 0) { squash(toad, 0.7); excitedT = 0.7; }
      }

      updateDrops(dt);

      mutterIn -= dt;
      if (mutterIn <= 0) { mutter(t); mutterIn = rand(...MUTTER_GAP); }

      // Player: breathe when still, lean into movement, squash each step.
      player.breath = input.moving ? 0 : Math.sin(t * 2) * 0.015;
      if (input.moving) player.rot += input.x * 0.07;
      if (player.squash > 0.01) { player.squashT += dt; player.squash *= Math.exp(-6 * dt); } else player.squash = 0;
      const step = Math.floor(player.walk / Math.PI);
      if (input.moving && step !== player.lastStep) squash(player, 0.22);
      player.lastStep = step;
    },
  };
}

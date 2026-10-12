// Toad food lying around the page: crumbs and curly pubic hairs to walk
// over, and house flies that buzz about (swat them, then pick them up).
// Everything goes in your pockets until you feed it to Toad. Eaten scraps
// turn up again somewhere in the same zone after a while.
import { AREA, DEPTH, POCKETS } from "./config.js";
import { crumbTexture, flyTexture, pubeTexture, rng } from "./ink.js";
import { floorDist, makeEntity, squash } from "./world.js";
import { sfx } from "./sfx.js";

const ZONES = [
  { name: "hub", x0: -15, x1: 15 },
  { name: "west", x0: AREA.minX, x1: -17 },
  { name: "east", x0: 17, x1: AREA.maxX },
];
const PER_ZONE = { crumb: 9, pube: 7, fly: 3 };
const RESPAWN = [35, 70];
const PICK_RADIUS = 1;

export function createScraps({ world, player, hud }) {
  const rand = rng(4242);
  const img = {
    crumb: Array.from({ length: 4 }, (_, i) => crumbTexture(600 + i)),
    pube: Array.from({ length: 4 }, (_, i) => pubeTexture(700 + i)),
    flyUp: flyTexture(true), flyDown: flyTexture(false), flyDead: flyTexture(false, true),
  };
  const pockets = [];
  world.scraps = [];

  const clear = (x, g) =>
    world.people.every((p) => Math.hypot(x - p.x, (g - p.g) * DEPTH) > p.radius + 1.2) &&
    world.pimples.every((p) => Math.hypot(x - p.x, (g - p.g) * DEPTH) > 1);

  function spot(zone) {
    for (let i = 0; i < 40; i++) {
      const x = zone.x0 + 1 + rand() * (zone.x1 - zone.x0 - 2);
      const g = 0.7 + rand() * (AREA.front - 1);
      if (clear(x, g)) return [x, g];
    }
    return [(zone.x0 + zone.x1) / 2, AREA.front / 2];
  }

  function place(s) {
    const [x, g] = spot(s.zone);
    Object.assign(s, { x, g, lift: 0, visible: true, gone: false, respawn: 0, scale: 1 });
    if (s.kind === "fly") Object.assign(s, { dead: false, img: img.flyUp, state: "air", lift: 1.2 + rand(), t: rand() * 10, home: [x, g] });
  }

  function make(kind, zone) {
    const size = { crumb: 0.62 + rand() * 0.22, pube: 0.5 + rand() * 0.12, fly: 0.85 }[kind];
    const pic = kind === "fly" ? img.flyUp : img[kind][Math.floor(rand() * img[kind].length)];
    const s = makeEntity(pic, size, 0, 0, { kind, zone, shadow: kind === "fly", radius: 0.3 });
    place(s);
    world.scraps.push(s);
  }

  for (const zone of ZONES) for (const [kind, n] of Object.entries(PER_ZONE)) for (let i = 0; i < n; i++) make(kind, zone);

  function flyUpdate(f, dt, t) {
    if (f.dead) return;
    f.t += dt;
    f.img = Math.floor(t * 26) % 2 ? img.flyUp : img.flyDown;
    if (f.state === "air") {
      // Wander around home in loops; now and then land.
      const [hx, hg] = f.home;
      f.x = hx + Math.sin(f.t * 0.9) * 2.2 + Math.sin(f.t * 2.7) * 0.6;
      f.g = Math.max(0.5, Math.min(AREA.front, hg + Math.cos(f.t * 1.3) * 0.9));
      f.lift = 1.1 + Math.sin(f.t * 3.1) * 0.5;
      f.rot = Math.sin(f.t * 5) * 0.15;
      if (Math.sin(f.t * 0.37) > 0.985) { f.state = "landing"; }
      // Flies scatter when you run at them.
      if (floorDist(player, f) < 1.6 && player.walk > 0) f.home = [f.x + (f.x - player.x) * 0.8, f.g];
    } else if (f.state === "landing") {
      f.lift = Math.max(0, f.lift - dt * 2.5);
      f.rot = 0;
      if (!f.lift) { f.state = "landed"; f.rest = 2 + Math.random() * 3; f.img = img.flyDown; }
    } else if (f.state === "landed") {
      f.img = img.flyDown;
      f.rest -= dt;
      if (f.rest <= 0) { f.state = "air"; f.home = [f.x, f.g]; }
    }
  }

  return {
    pockets,
    picture: (kind) => (kind === "fly" ? img.flyDead : img[kind][0]),

    // Slap target among live flies in reach (they can be up in the air).
    swatTarget(reach) {
      let best = null, bd = Infinity;
      for (const f of world.scraps) {
        if (f.kind !== "fly" || f.dead || f.gone) continue;
        const d = floorDist(player, f);
        if (d < reach && f.lift < player.top + 0.5 && d < bd) { best = f; bd = d; }
      }
      return best;
    },

    swat(f) {
      f.dead = true;
      f.img = img.flyDead;
      f.state = "falling";
      f.rot = 0;
      squash(f, 1.2);
      hud.burst("SWAT!", f);
    },

    // How far the nearest live fly is (for the buzz).
    nearestFly() {
      let d = Infinity;
      for (const f of world.scraps) if (f.kind === "fly" && !f.dead && !f.gone) d = Math.min(d, floorDist(player, f));
      return d;
    },

    takeAll() {
      return pockets.splice(0, pockets.length);
    },

    update(dt, t) {
      for (const s of world.scraps) {
        if (s.gone) {
          s.respawn -= dt;
          if (s.respawn <= 0) place(s);
          continue;
        }
        if (s.kind === "fly") {
          if (s.dead && s.lift > 0) s.lift = Math.max(0, s.lift - dt * 6);
          else flyUpdate(s, dt, t);
        }
        // Pick up: crumbs, hairs and dead flies on the ground.
        const ground = s.kind !== "fly" || (s.dead && s.lift === 0);
        if (ground && floorDist(player, s) < PICK_RADIUS) {
          if (pockets.length >= POCKETS) {
            if (!s.warned) { hud.toast("Your pockets are full. Go feed Toad."); s.warned = true; }
            continue;
          }
          s.warned = false;
          pockets.push(s.kind);
          s.gone = true;
          s.visible = false;
          s.respawn = RESPAWN[0] + Math.random() * (RESPAWN[1] - RESPAWN[0]);
          sfx.pick();
          hud.setPockets(pockets.length, POCKETS);
        }
      }
    },
  };
}

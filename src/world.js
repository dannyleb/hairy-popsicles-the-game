// Everything on the stage is an entity: a drawing with feet at (x, g),
// optionally on a popsicle stick, lifted `lift` off the floor, with
// squash-and-stretch, sway and a flat contact shadow.
import { AREA, DEPTH } from "./config.js";
import { DRIP_SPOTS, ROSTER } from "./roster.js";
import { dripTexture, pimpleTexture, poppedTexture, rng, tuftTexture } from "./ink.js";
import { buildHedges } from "./gates.js";

const DRIP_RESPAWN = 20;

export function makeEntity(img, height, x, g, props = {}) {
  const w = height * (img.width / img.height);
  const stickH = props.stick ? height * 0.75 : 0;
  return {
    img, baseImg: img, w, h: height, x, g, lift: 0, stickH, top: stickH + height,
    rot: 0, sway: 0, phase: 0, scale: 1, scaleY: 1, squash: 0, squashT: 0,
    radius: Math.max(0.5, Math.min(w, 2.5) * 0.35),
    shadow: true, visible: true,
    ...props,
  };
}

// Floor distance, with depth weighted so it matches what you see.
export const floorDist = (a, b) => Math.hypot(a.x - b.x, (a.g - b.g) * DEPTH);

function cast(img) {
  return ROSTER.map((c, i) => makeEntity(img[c.sprite], c.height, c.at[0], c.at[1], {
    anim: img.anim && img.anim[c.sprite],
    ...c,
    kind: "person",
    ...(c.radius ? { radius: c.radius } : {}),
    phase: i * 1.7,
    sway: c.stick ? 0.05 : 0.02,
  }));
}

function tufts() {
  const kinds = Array.from({ length: 4 }, () => tuftTexture());
  return Array.from({ length: 260 }, () => ({
    img: kinds[Math.floor(Math.random() * kinds.length)],
    x: AREA.minX - 4 + Math.random() * (AREA.maxX - AREA.minX + 8),
    g: 0.3 + Math.random() * (AREA.front - 0.3),
    size: 0.5 + Math.random() * 0.6,
    flip: Math.random() < 0.5,
  }));
}

// Swollen pimples everywhere: domes on the floor (slap to pop) and round
// ones on the skin wall behind. Random sizes, fixed by seed.
function pimples(people) {
  const rand = rng(1234);
  const side = Array.from({ length: 8 }, (_, i) => pimpleTexture(100 + i));
  const face = Array.from({ length: 6 }, (_, i) => pimpleTexture(200 + i, { faceOn: true }));
  const popped = Array.from({ length: 4 }, (_, i) => poppedTexture(300 + i));
  const blocked = [...people.map((p) => [p.x, p.g, p.radius + 3.4]), ...DRIP_SPOTS.map(([x, g]) => [x, g, 1.2]), [0, 6.7, 2]];
  const floor = [];
  for (let tries = 0; floor.length < 46 && tries < 2000; tries++) {
    const x = AREA.minX + rand() * (AREA.maxX - AREA.minX);
    const g = 0.5 + rand() * (AREA.front - 0.7);
    if (blocked.some(([bx, bg, r]) => Math.hypot(x - bx, (g - bg) * 2.5) < r)) continue;
    if (floor.some((p) => Math.hypot(x - p.x, (g - p.g) * 2.5) < 1.2 + p.h)) continue;
    const h = 0.3 + rand() ** 2.2 * 1.9;
    const e = makeEntity(side[Math.floor(rand() * side.length)], h, x, g, { kind: "pimple", shadow: false, radius: 0.4 });
    e.popped = popped[Math.floor(rand() * popped.length)];
    floor.push(e);
  }
  const wall = Array.from({ length: 34 }, () => {
    const img = face[Math.floor(rand() * face.length)];
    return { img, x: AREA.minX - 8 + rand() * (AREA.maxX - AREA.minX + 16), y: -0.8 - rand() * 6, size: 0.35 + rand() ** 2 * 2.2 };
  });
  return { floor, wall };
}

export function popPimple(p) {
  p.orig = { img: p.img, h: p.h, w: p.w, top: p.top };
  p.kind = "popped";
  p.img = p.popped;
  p.h = p.h * 0.6 + 0.15;
  p.w = p.h * (p.img.width / p.img.height);
  p.top = p.h;
}

function drips() {
  const img = dripTexture();
  return DRIP_SPOTS.map(([x, g], i) => ({ ...makeEntity(img, 0.8, x, g, { shadow: false, kind: "drip" }), phase: i, respawn: 0 }));
}

export function buildWorld(img) {
  const people = cast(img);
  const pim = pimples(people);
  return {
    people,
    pimples: pim.floor,
    wallPimples: pim.wall,
    byId: Object.fromEntries(people.map((p) => [p.id, p])),
    items: [],
    fx: [],
    drips: drips(),
    tufts: tufts(),
    gates: buildHedges(),
    moon: img.moon,
  };
}

export function createItem(world, kind, img, height, x, g) {
  const item = makeEntity(img, height, x, g, { kind, radius: 0.5, carried: false });
  world.items.push(item);
  return item;
}

export function squash(e, amount = 1) {
  e.squash = amount;
  e.squashT = 0;
}

export function animateWorld(world, t, dt) {
  const wobble = (e) => {
    if (e.squash > 0.01) {
      e.squashT += dt;
      e.squash *= Math.exp(-5 * dt);
    } else {
      e.squash = 0;
    }
  };
  for (const p of world.people) {
    p.rot = Math.sin(t * 0.9 + p.phase) * p.sway;
    wobble(p);
  }
  for (const it of world.items) wobble(it);
  for (const p of world.pimples) wobble(p);
  for (const g of world.globs || []) wobble(g);
  for (const d of world.drips) {
    wobble(d);
    if (d.falling) continue;
    if (d.respawn > 0) {
      d.respawn -= dt;
      if (d.respawn <= 0) d.visible = true;
      continue;
    }
    d.lift = 0.2 + Math.sin(t * 3 + d.phase) * 0.15;
  }
}

// Returns how many drips the player walked into this frame.
export function collectDrips(world, pos, room) {
  let got = 0;
  for (let i = world.drips.length - 1; i >= 0; i--) {
    const d = world.drips[i];
    if (!d.visible || d.falling || got >= room) continue;
    if (floorDist(pos, d) < 1.1) {
      got++;
      if (d.temp) { world.drips.splice(i, 1); continue; }
      d.visible = false;
      d.respawn = DRIP_RESPAWN;
    }
  }
  return got;
}

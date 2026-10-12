// Everything on the stage is an entity: a drawing with feet at (x, g),
// optionally on a popsicle stick, lifted `lift` off the floor, with
// squash-and-stretch, sway and a pen-hatched shadow.
import { AREA, DEPTH } from "./config.js";
import { DRIP_SPOTS, ROSTER } from "./roster.js";
import { dripTexture, tuftTexture } from "./ink.js";
import { buildHedges } from "./gates.js";

const DRIP_RESPAWN = 20;

export function makeEntity(img, height, x, g, props = {}) {
  const w = height * (img.width / img.height);
  const stickH = props.stick ? height * 0.75 : 0;
  return {
    img, w, h: height, x, g, lift: 0, stickH, top: stickH + height,
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

function drips() {
  const img = dripTexture();
  return DRIP_SPOTS.map(([x, g], i) => ({ ...makeEntity(img, 0.8, x, g, { shadow: false, kind: "drip" }), phase: i, respawn: 0 }));
}

export function buildWorld(img) {
  const people = cast(img);
  return {
    people,
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
  for (const d of world.drips) {
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
  for (const d of world.drips) {
    if (!d.visible || got >= room) continue;
    if (floorDist(pos, d) < 1.1) {
      d.visible = false;
      d.respawn = DRIP_RESPAWN;
      got++;
    }
  }
  return got;
}

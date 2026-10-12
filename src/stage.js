// Flat 2D renderer on a plain canvas. The world is skin: a pale,
// yellowing skin wall behind, a flushed peach skin floor in front, split by
// a wobbly ink horizon; everything on the floor is painted back-to-front.
import { AREA, INK, VIEW } from "./config.js";
import { FLOOR_SKIN, WALL_SKIN, shadowTexture, skinTile, stickTexture } from "./ink.js";
import { gateScale } from "./gates.js";

const SHADOW = shadowTexture();
const STICK = stickTexture();

const TILE_UNITS = 7; // world units per skin tile

export function createStage(canvas) {
  const ctx = canvas.getContext("2d");
  const floorTile = skinTile(FLOOR_SKIN);
  const wallTile = skinTile(WALL_SKIN);
  let floorPat = null, wallPat = null;
  let W = 0, H = 0, U = 40;
  const cam = { x: 0, g: 4 };

  const horizon = Array.from({ length: Math.ceil(AREA.maxX - AREA.minX + 20) }, () => (Math.random() - 0.5) * 0.06);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    U = Math.min(H / VIEW.height, W / VIEW.minWidth);
    floorPat = ctx.createPattern(floorTile, "repeat");
    wallPat = ctx.createPattern(wallTile, "repeat");
  }

  const X = (x) => (x - cam.x) * U + W / 2;
  const Y = (g) => (g - cam.g) * U + H / 2;

  function follow(target, dt) {
    const viewW = W / U, viewH = H / U;
    const tx = Math.max(AREA.minX - 3 + viewW / 2, Math.min(AREA.maxX + 3 - viewW / 2, target.x));
    const top = -6.5, bottom = AREA.front + 1.2;
    let tg = target.g - 2;
    const lo = top + viewH / 2, hi = bottom - viewH / 2;
    tg = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, tg));
    const k = dt < 0 ? 1 : 1 - Math.exp(-5 * dt);
    cam.x += (tx - cam.x) * k;
    cam.g += (tg - cam.g) * k;
  }

  function onScreen(x, w) {
    const sx = X(x);
    return sx + w * U > -40 && sx - w * U < W + 40;
  }

  function drawShadow(e) {
    const sw = Math.max(1.2, Math.min(e.w, 3)) * 0.9 * (e.scale ?? 1);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(SHADOW, X(e.x) - sw * 0.2 * U, Y(e.g) - sw * 0.12 * U, sw * U, sw * 0.32 * U);
    ctx.globalAlpha = 1;
  }

  function drawEntity(e) {
    if (!e.visible || !onScreen(e.x, e.w)) return;
    if (e.shadow) drawShadow(e);
    const s = e.squash ? e.squash * Math.cos(e.squashT * 28) : 0;
    ctx.save();
    ctx.translate(X(e.x), Y(e.g) - e.lift * U);
    ctx.rotate(e.rot);
    ctx.scale((1 + s * 0.25) * e.scale, (1 - s * 0.22) * e.scale * e.scaleY);
    if (e.stickH) {
      const sw = e.h * 0.12, sl = e.stickH + e.h * 0.25;
      ctx.drawImage(STICK, -sw / 2 * U, -sl * U, sw * U, sl * U);
    }
    ctx.drawImage(e.img, -e.w / 2 * U, -(e.stickH + e.h) * U, e.w * U, e.h * U);
    ctx.restore();
  }

  function drawClump(c, k) {
    if (k <= 0.01 || !onScreen(c.x, c.w)) return;
    const h = c.h * k;
    ctx.save();
    ctx.translate(X(c.x), Y(c.g));
    if (c.flip) ctx.scale(-1, 1);
    ctx.drawImage(c.img, -c.w / 2 * U, -h * U, c.w * U, h * U);
    ctx.restore();
  }

  function draw(world, player, carried) {
    // Skin, scrolling with the camera: wall above the horizon, floor below.
    const hy = Y(0);
    const m = new DOMMatrix().translate(-cam.x * U + W / 2, -cam.g * U + H / 2).scale(TILE_UNITS * U / floorTile.width);
    wallPat.setTransform(m);
    floorPat.setTransform(m);
    ctx.fillStyle = wallPat;
    ctx.fillRect(0, 0, W, Math.max(0, hy));
    ctx.fillStyle = floorPat;
    ctx.fillRect(0, Math.max(0, hy), W, H);

    // Pimples swelling out of the wall.
    for (const p of world.wallPimples) {
      if (!onScreen(p.x, p.size)) continue;
      const s = p.size * U;
      ctx.drawImage(p.img, X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
    }

    // The moon, drifting slowly behind everything.
    if (world.moon) {
      const mh = 2.6 * U, mw = mh * world.moon.width / world.moon.height;
      ctx.drawImage(world.moon, W * 0.08 - cam.x * U * 0.06, Y(-5.6) - mh / 2, mw, mh);
    }

    // Horizon: a hand-wobbly ink line.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    horizon.forEach((j, i) => {
      const x = AREA.minX - 10 + i;
      const px = X(x), py = Y(j);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.stroke();

    // Stray hairs on the floor (tiny, so they go under everything).
    for (const t of world.tufts) {
      if (!onScreen(t.x, t.size)) continue;
      ctx.save();
      ctx.translate(X(t.x), Y(t.g));
      if (t.flip) ctx.scale(-1, 1);
      ctx.drawImage(t.img, -t.size / 2 * U, -t.size * U, t.size * U, t.size * U);
      ctx.restore();
    }

    // Everything else, back to front.
    const list = [];
    for (const c of world.gates.edges) list.push([c.g, () => drawClump(c, 1)]);
    for (const gate of [world.gates.west, world.gates.east]) {
      const k = gateScale(gate);
      if (k > 0.01) for (const c of gate.clumps) list.push([c.g, () => drawClump(c, k)]);
    }
    for (const e of world.people) list.push([e.g, () => drawEntity(e)]);
    for (const e of world.items) if (e !== carried) list.push([e.g, () => drawEntity(e)]);
    for (const e of world.drips) list.push([e.g, () => drawEntity(e)]);
    for (const e of world.pimples) list.push([e.g, () => drawEntity(e)]);
    list.push([player.g, () => drawEntity(player)]);
    if (carried) list.push([player.g + 0.001, () => drawEntity(carried)]);
    for (const e of world.fx) list.push([e.g + 0.002, () => drawEntity(e)]);
    for (const e of world.globs) list.push([e.g + 0.001, () => drawEntity(e)]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of list) fn();
  }

  return {
    resize, follow, draw,
    toScreen: (x, g, lift) => ({ x: X(x), y: Y(g) - lift * U }),
    // Frontmost entity whose drawing covers screen point (sx, sy), with a
    // little slack so small pimples are easy to tap.
    hit(list, sx, sy, slack = 14) {
      let best = null;
      for (const e of list) {
        const cx = X(e.x), by = Y(e.g), hw = (e.w / 2) * U + slack, ht = e.top * U + slack;
        if (sx >= cx - hw && sx <= cx + hw && sy <= by + slack && sy >= by - ht && (!best || e.g > best.g)) best = e;
      }
      return best;
    },
  };
}

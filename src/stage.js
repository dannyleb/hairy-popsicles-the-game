// Flat 2D renderer on a plain canvas. The world is skin: a pale,
// yellowing skin wall behind, a flushed peach skin floor in front, split by
// a wobbly ink horizon; everything on the floor is painted back-to-front.
import { AREA, INK, VIEW } from "./config.js";
import { FLOOR_SKIN, WALL_SKIN, hedgeTexture, pimpleTexture, rng, shadowTexture, skinTile, stickTexture } from "./ink.js";
import { environment } from "./daynight.js";
import { gateAlpha, gateScale } from "./gates.js";

const SHADOW = shadowTexture();
const STICK = stickTexture();

const TILE_UNITS = 7; // world units per skin tile

// Parallax: how fast each layer scrolls relative to the ground (1).
const PARALLAX = { moon: 0.06, wall: 0.25, wallPimples: 0.4, hills: 0.6, fore: 1.35 };

// Distant lumpy flesh hills on the horizon, with a few giant hairs.
function makeHills() {
  const rand = rng(77);
  const pts = [];
  const span = 140;
  let h = 1.2;
  for (let x = -span; x <= span; x += 0.8) {
    h += (rand() - 0.5) * 0.7;
    h = Math.max(0.5, Math.min(2.4, h * 0.94 + 1.2 * 0.06));
    pts.push([x, h]);
  }
  const hairs = [];
  for (let x = -span; x <= span; x += 3 + rand() * 6) {
    hairs.push({ x, len: 1.2 + rand() * 2.4, lean: (rand() - 0.5) * 1.6, curl: (rand() - 0.5) * 1.2 });
  }
  return { pts, hairs };
}

function makeForeground() {
  const rand = rng(91);
  const kinds = Array.from({ length: 3 }, () => hedgeTexture());
  const out = [];
  for (let x = -90; x <= 90; x += 6 + rand() * 7) {
    const img = kinds[Math.floor(rand() * kinds.length)];
    const h = 1.6 + rand() * 1.4;
    out.push({ img, x, h, w: h * (img.width / img.height) * 1.3, flip: rand() < 0.5 });
  }
  return out;
}

export function createStage(canvas) {
  // Two passes per frame: the sky (wall, stars, sun/moon) straight onto the
  // screen, the world (everything else) onto `worldCanvas`, which is tinted
  // for the time of day and laid over the sky. `ctx` points at whichever
  // pass is being drawn.
  const screen = canvas.getContext("2d");
  const worldCanvas = document.createElement("canvas");
  const wctx = worldCanvas.getContext("2d");
  const tintCanvas = document.createElement("canvas");
  const tctx = tintCanvas.getContext("2d");
  let ctx = screen;
  const sun = pimpleTexture(999, { faceOn: true });
  const stars = Array.from({ length: 80 }, (_, i) => {
    const r = rng(1000 + i);
    return { x: r(), y: r(), s: 1.2 + r() * 2.2, tw: r() * 6, cross: r() < 0.15 };
  });
  const motes = Array.from({ length: 26 }, (_, i) => {
    const r = rng(2000 + i);
    return { x: r() * 40 - 20, g: 0.5 + r() * 7.5, h: 0.4 + r() * 2.5, a: r() * 6, b: r() * 6, sp: 0.4 + r() * 0.6 };
  });
  const mote = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const m = c.getContext("2d");
    const gr = m.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255, 246, 190, 1)");
    gr.addColorStop(0.3, "rgba(245, 220, 120, 0.8)");
    gr.addColorStop(1, "rgba(245, 200, 90, 0)");
    m.fillStyle = gr;
    m.fillRect(0, 0, 32, 32);
    return c;
  })();
  const floorTile = skinTile(FLOOR_SKIN);
  const hills = makeHills();
  const fore = makeForeground();
  const wallTile = skinTile(WALL_SKIN);
  let floorPat = null, wallPat = null;
  let W = 0, H = 0, U = 40;
  const cam = { x: 0, g: 4 };

  const horizon = Array.from({ length: Math.ceil(AREA.maxX - AREA.minX + 20) }, () => (Math.random() - 0.5) * 0.06);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const [c, x] of [[canvas, screen], [worldCanvas, wctx], [tintCanvas, tctx]]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.imageSmoothingQuality = "high";
    }
    U = Math.min(H / VIEW.height, W / VIEW.minWidth);
    floorPat = wctx.createPattern(floorTile, "repeat");
    wallPat = screen.createPattern(wallTile, "repeat");
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
    const br = e.breath || 0;
    ctx.scale((1 + s * 0.25 - br * 0.5) * e.scale * (e.flip ? -1 : 1), (1 - s * 0.22 + br) * e.scale * e.scaleY);
    if (e.stickH) {
      // Heads on sticks: the stick stays put, the head bobs and tilts on top.
      const sw = e.h * 0.12, sl = e.stickH + e.h * 0.25;
      ctx.drawImage(STICK, -sw / 2 * U, -sl * U, sw * U, sl * U);
      ctx.translate(0, -(e.stickH + e.h * 0.25) * U);
      ctx.rotate(e.headTilt || 0);
      ctx.translate(0, -(e.headBob || 0) * U);
      ctx.drawImage(e.img, -e.w / 2 * U, -e.h * 0.75 * U, e.w * U, e.h * U);
    } else {
      ctx.rotate(e.headTilt || 0);
      ctx.drawImage(e.img, -e.w / 2 * U, -e.h * U, e.w * U, e.h * U);
    }
    ctx.restore();
  }

  function drawClump(c, k, alpha = 1) {
    if (k <= 0.01 || alpha <= 0.01 || !onScreen(c.x, c.w)) return;
    const h = c.h * k;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(X(c.x), Y(c.g));
    if (c.flip) ctx.scale(-1, 1);
    ctx.drawImage(c.img, -c.w / 2 * U, -h * U, c.w * U, h * U);
    ctx.restore();
  }

  // Steam puffs rising off an evaporating hair wall.
  function drawSteam(gate) {
    const w = gate.wither, a = Math.sin(w * Math.PI) * 0.55;
    ctx.fillStyle = `rgba(255, 246, 236, ${a})`;
    for (let i = 0; i < 14; i++) {
      const g = (i / 13) * AREA.front, rise = (w * 3 + (i % 3) * 0.6) % 3.5;
      const r = (0.35 + (i % 4) * 0.12 + w * 0.4) * U;
      ctx.beginPath();
      ctx.arc(X(gate.x + Math.sin(i * 1.7 + w * 6) * 0.5), Y(g) - (0.8 + rise) * U, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Multiply `tint` ([css color, strength]) over the drawn pixels of src.
  function tintOver(src, tint) {
    if (tint[1] < 0.01) return;
    tctx.save();
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = "copy";
    tctx.drawImage(src, 0, 0);
    tctx.globalCompositeOperation = "source-atop";
    tctx.fillStyle = tint[0];
    tctx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
    tctx.restore();
    screen.save();
    screen.setTransform(1, 0, 0, 1, 0, 0);
    screen.globalCompositeOperation = "multiply";
    screen.globalAlpha = tint[1];
    screen.drawImage(tintCanvas, 0, 0);
    screen.restore();
  }

  function draw(world, player, carried, time = 0) {
    // Screen x for a layer scrolling at `k` times the ground's speed.
    const PX = (x, k) => (x - cam.x * k) * U + W / 2;
    const tileScale = TILE_UNITS * U / floorTile.width;
    const env = environment(world.clock ?? 0.1);

    // ----- Sky pass, straight onto the screen -----
    ctx = screen;
    const hy = Y(0);
    wallPat.setTransform(new DOMMatrix().translate(-cam.x * PARALLAX.wall * U + W / 2, -cam.g * PARALLAX.wall * U + H / 2).scale(tileScale));
    ctx.fillStyle = wallPat;
    ctx.fillRect(0, 0, W, Math.max(0, hy));
    // Pimples swelling out of the wall.
    for (const p of world.wallPimples) {
      const s = p.size * U, sx = PX(p.x, PARALLAX.wallPimples);
      if (sx + s < 0 || sx - s > W) continue;
      ctx.drawImage(p.img, sx - s / 2, Y(p.y) - s / 2, s, s);
    }

    if (env.sky[1] > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = env.sky[1];
      ctx.fillStyle = env.sky[0];
      ctx.fillRect(0, 0, W, Math.max(0, hy));
      ctx.restore();
    }

    // Stars.
    if (env.stars > 0.02) {
      ctx.fillStyle = "#fff6e6";
      ctx.strokeStyle = "#fff6e6";
      ctx.lineWidth = 1.5;
      for (const st of stars) {
        const sx = ((st.x * W * 1.6 - cam.x * U * 0.04) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3;
        const sy = st.y * hy * 0.92;
        ctx.globalAlpha = env.stars * (0.55 + 0.45 * Math.sin(time * 2 + st.tw));
        if (st.cross) {
          ctx.beginPath();
          ctx.moveTo(sx - st.s * 2, sy); ctx.lineTo(sx + st.s * 2, sy);
          ctx.moveTo(sx, sy - st.s * 2); ctx.lineTo(sx, sy + st.s * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, st.s / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Sun (a giant pimple) by day, moon by night, arcing across the sky.
    const arc = (prog) => {
      const peak = Math.min(hy * 0.4, Math.max(56, Y(-7)));
      return [W * (0.06 + 0.88 * prog) - cam.x * U * PARALLAX.moon, hy - Math.sin(prog * Math.PI) * (hy - peak)];
    };
    if (env.sun !== null) {
      const sz = 2.8 * U, [sx, sy] = arc(env.sun);
      const glow = ctx.createRadialGradient(sx, sy, sz * 0.2, sx, sy, sz * 1.2);
      glow.addColorStop(0, "rgba(255, 238, 170, 0.85)");
      glow.addColorStop(1, "rgba(255, 238, 170, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - sz * 1.2, sy - sz * 1.2, sz * 2.4, sz * 2.4);
      ctx.drawImage(sun, sx - sz / 2, sy - sz / 2, sz, sz);
    }
    if (env.moon !== null && world.moon) {
      const mh = 2.2 * U, mw = mh * world.moon.width / world.moon.height, [mx, my] = arc(env.moon);
      ctx.drawImage(world.moon, mx - mw / 2, my - mh / 2, mw, mh);
    }

    // ----- World pass, onto worldCanvas -----
    ctx = wctx;
    ctx.clearRect(0, 0, W, H);


    // Distant flesh hills sitting on the horizon.
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PX(hills.pts[0][0], PARALLAX.hills), hy);
    for (const [x, h] of hills.pts) ctx.lineTo(PX(x, PARALLAX.hills), hy - h * U);
    ctx.lineTo(PX(hills.pts[hills.pts.length - 1][0], PARALLAX.hills), hy);
    ctx.closePath();
    ctx.fillStyle = "#cf9a7e";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3;
    for (const hr of hills.hairs) {
      const bx = PX(hr.x, PARALLAX.hills);
      if (bx < -80 || bx > W + 80) continue;
      const i = Math.round((hr.x - hills.pts[0][0]) / 0.8);
      const base = hy - (hills.pts[Math.max(0, Math.min(hills.pts.length - 1, i))][1] - 0.1) * U;
      ctx.beginPath();
      ctx.moveTo(bx, base);
      ctx.bezierCurveTo(bx + hr.curl * U, base - hr.len * 0.4 * U, bx + (hr.lean - hr.curl) * U, base - hr.len * 0.8 * U, bx + hr.lean * U, base - hr.len * U);
      ctx.stroke();
    }

    // Ground: moves 1:1 with the world.
    floorPat.setTransform(new DOMMatrix().translate(-cam.x * U + W / 2, -cam.g * U + H / 2).scale(tileScale));
    ctx.fillStyle = floorPat;
    ctx.fillRect(0, Math.max(0, hy), W, H);

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

    // Where you last tapped to walk.
    const tm = world.tapMark;
    if (tm && tm.t < 0.7) {
      tm.t += 1 / 60;
      const k = tm.t / 0.7;
      ctx.strokeStyle = `rgba(46, 22, 22, ${0.8 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(X(tm.x), Y(tm.g), (0.3 + k * 0.5) * U, (0.12 + k * 0.2) * U, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Everything else, back to front.
    const list = [];
    for (const c of world.gates.edges) list.push([c.g, () => drawClump(c, 1)]);
    for (const gate of [world.gates.west, world.gates.east]) {
      const k = gateScale(gate), a = gateAlpha(gate);
      if (a > 0.01) for (const c of gate.clumps) list.push([c.g, () => drawClump(c, k, a)]);
      if (gate.open && gate.wither < 1) list.push([AREA.front, () => drawSteam(gate)]);
    }
    for (const e of world.scraps) list.push([e.g, () => drawEntity(e)]);
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

    // Foreground hair, closest to the camera: sweeps past faster than you,
    // only along the bottom edge of the screen.
    const baseY = Math.max(Y(AREA.front + 1.4), H - 0.5 * U);
    for (const f of fore) {
      const fx = (f.x - cam.x * PARALLAX.fore) * U + W / 2;
      if (fx + f.w * U < 0 || fx - f.w * U > W) continue;
      ctx.save();
      ctx.translate(fx, baseY + 0.5 * U);
      if (f.flip) ctx.scale(-1, 1);
      ctx.drawImage(f.img, -f.w / 2 * U, -f.h * U, f.w * U, f.h * U);
      ctx.restore();
    }

    // ----- Composite: world over sky, tinted for the time of day -----
    ctx = screen;
    screen.save();
    screen.setTransform(1, 0, 0, 1, 0, 0);
    screen.drawImage(worldCanvas, 0, 0);
    screen.restore();
    tintOver(worldCanvas, env.world);

    // Glowing pus-flies at night.
    if (env.stars > 0.15) {
      screen.save();
      screen.globalCompositeOperation = "lighter";
      for (const m of motes) {
        const span = 40;
        const wx = ((m.x + Math.sin(time * m.sp + m.a) * 1.5 - cam.x) % span + span * 1.5) % span - span / 2 + cam.x;
        const sx = X(wx), sy = Y(m.g) - (m.h + Math.sin(time * m.sp * 1.7 + m.b) * 0.4) * U;
        const r = (0.18 + 0.06 * Math.sin(time * 3 + m.a)) * U;
        screen.globalAlpha = env.stars * (0.6 + 0.4 * Math.sin(time * 2.3 + m.b));
        screen.drawImage(mote, sx - r, sy - r, r * 2, r * 2);
      }
      screen.restore();
    }
  }

  return {
    resize, follow, draw,
    toScreen: (x, g, lift) => ({ x: X(x), y: Y(g) - lift * U }),
    toWorld: (sx, sy) => ({ x: (sx - W / 2) / U + cam.x, g: (sy - H / 2) / U + cam.g }),
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

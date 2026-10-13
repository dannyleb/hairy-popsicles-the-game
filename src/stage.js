// Flat 2D renderer on a plain canvas. The world is skin: a pale,
// yellowing skin wall behind, a flushed peach skin floor in front, split by
// a wobbly ink horizon; everything on the floor is painted back-to-front.
import { AREA, INK, VIEW } from "./config.js";
import { FLOOR_SKIN, WALL_SKIN, drawCosmetic, hedgeTexture, pimpleTexture, rng, shadowTexture, skinTile, stickTexture } from "./ink.js";
import { environment } from "./daynight.js";
import { drawSplashes } from "./splash.js";
import { gateAlpha, gateScale } from "./gates.js";

const SHADOW = shadowTexture();
const STICK = stickTexture();

const TILE_UNITS = 7; // world units per skin tile
const TAP_MARK_LIFE = 0.7; // seconds the tap-to-walk ring shows
// Visual hierarchy: backdrop and decoration sit back so the things you can
// use (characters, pimples, pickups) read first.
const BACKDROP_HAZE = "rgba(246, 218, 190, 0.42)";
const DECOR_ALPHA = 0.45;

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
    const portrait = H > W * 1.2;
    U = Math.min(H / VIEW.height, W / (portrait ? VIEW.portraitWidth : VIEW.minWidth));
    floorPat = wctx.createPattern(floorTile, "repeat");
    wallPat = screen.createPattern(wallTile, "repeat");
  }

  const X = (x) => (x - cam.x) * U + W / 2;
  const Y = (g) => (g - cam.g) * U + H / 2;

  // Screen pixels along the bottom covered by on-screen controls (touch);
  // the floor's front edge is framed above them.
  let insetBottom = 0;
  const setInsets = ({ bottom = 0 } = {}) => { insetBottom = bottom; };

  function follow(target, dt) {
    const viewW = W / U, viewH = H / U;
    const tx = Math.max(AREA.minX - 3 + viewW / 2, Math.min(AREA.maxX + 3 - viewW / 2, target.x));
    const top = -6.5, bottom = AREA.front + 1.2 + insetBottom / U;
    let tg = target.g - 2;
    const lo = top + viewH / 2, hi = bottom - viewH / 2;
    // A tall screen shows the whole depth with room to spare: sit the floor
    // on the bottom (above any controls) and give the spare room to the sky.
    tg = lo > hi ? hi : Math.max(lo, Math.min(hi, tg));
    const k = dt === Infinity ? 1 : 1 - Math.exp(-5 * dt);
    cam.x += (tx - cam.x) * k;
    cam.g += (tg - cam.g) * k;
  }
  // Jump straight to the target (no easing), e.g. on the first frame.
  const snap = (target) => follow(target, Infinity);

  // One matrix reused for the tiled skin patterns (no allocation per frame).
  const tileM = new DOMMatrix();
  function placeTile(pat, x, y, scale) {
    tileM.a = tileM.d = scale;
    tileM.b = tileM.c = 0;
    tileM.e = x;
    tileM.f = y;
    pat.setTransform(tileM);
  }

  function onScreen(x, w) {
    const sx = X(x);
    return sx + w * U > -40 && sx - w * U < W + 40;
  }

  function drawShadow(e) {
    if (e.w < 1) {
      // Small pickups: a small, soft shadow right under them.
      const sw = e.w * 0.95 * (e.scale ?? 1);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(SHADOW, X(e.x) - sw / 2 * U, Y(e.g) - sw * 0.1 * U, sw * U, sw * 0.3 * U);
      ctx.globalAlpha = 1;
      return;
    }
    const sw = Math.max(1.2, Math.min(e.w, 3)) * 0.9 * (e.scale ?? 1);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(SHADOW, X(e.x) - sw * 0.2 * U, Y(e.g) - sw * 0.12 * U, sw * U, sw * 0.32 * U);
    ctx.globalAlpha = 1;
  }

  // The drawing itself: a frame of its idle-animation strip if it has one.
  let clock = 0;
  const ANIM_FPS = 5;
  function art(e, x, y, w, h) {
    const a = e.anim;
    if (!a || e.img !== e.baseImg) return ctx.drawImage(e.img, x, y, w, h);
    const fw = a.img.width / a.n;
    const f = Math.floor(clock * ANIM_FPS + (e.phase || 0) * 3) % a.n;
    ctx.drawImage(a.img, f * fw, 0, fw, a.img.height, x, y, w, h);
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
      art(e, -e.w / 2 * U, -e.h * 0.75 * U, e.w * U, e.h * U);
    } else {
      ctx.rotate(e.headTilt || 0);
      art(e, -e.w / 2 * U, -e.h * U, e.w * U, e.h * U);
      if (e.cosmetics) for (const c of e.cosmetics) drawCosmetic(ctx, c, -e.w / 2 * U, -e.h * U, e.w * U, e.h * U);
    }
    ctx.restore();
    if (GLINT.has(e.kind)) glint(e);
  }

  // Rare finds (toenails, mouse droppings, giant warts) twinkle so they
  // catch your eye.
  const GLINT = new Set(["toenail", "dropping", "wart"]);
  function glint(e) {
    const k = Math.max(0, Math.sin(clock * 3.2 + e.x * 1.7));
    if (k < 0.05) return;
    const x = X(e.x) + e.w * 0.35 * U, y = Y(e.g) - (e.h + e.lift) * U - 0.05 * U, r = (0.22 + k * 0.2) * U;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.translate(x, y);
    ctx.rotate(clock * 0.8);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.28 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#fff6c8";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
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
    clock = time;
    // Screen x for a layer scrolling at `k` times the ground's speed.
    const PX = (x, k) => (x - cam.x * k) * U + W / 2;
    const tileScale = TILE_UNITS * U / floorTile.width;
    const env = environment(world.clock);

    // ----- Sky pass, straight onto the screen -----
    ctx = screen;
    const hy = Y(0);
    placeTile(wallPat, -cam.x * PARALLAX.wall * U + W / 2, -cam.g * PARALLAX.wall * U + H / 2, tileScale);
    ctx.fillStyle = wallPat;
    ctx.fillRect(0, 0, W, Math.max(0, hy));
    // Pimples swelling out of the wall.
    for (const p of world.wallPimples) {
      const s = p.size * U, sx = PX(p.x, PARALLAX.wallPimples);
      if (sx + s < 0 || sx - s > W) continue;
      ctx.drawImage(p.img, sx - s / 2, Y(p.y) - s / 2, s, s);
    }
    // Haze over the wall: it's backdrop, so it sits back and the floor reads
    // as where things happen. (The sun and moon are drawn after, crisp.)
    ctx.fillStyle = BACKDROP_HAZE;
    ctx.fillRect(0, 0, W, Math.max(0, hy));

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
    ctx.fillStyle = "#d8ad94";
    ctx.fill();
    // Distant, so softer ink than anything you can walk up to.
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 2.5;
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
    ctx.restore();

    // Ground: moves 1:1 with the world.
    placeTile(floorPat, -cam.x * U + W / 2, -cam.g * U + H / 2, tileScale);
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

    // Stray hairs on the floor (tiny, so they go under everything). Faded:
    // they're texture, and shouldn't look like the hairs you can pick up.
    for (const t of world.tufts) {
      if (!onScreen(t.x, t.size)) continue;
      ctx.save();
      ctx.globalAlpha = DECOR_ALPHA;
      ctx.translate(X(t.x), Y(t.g));
      if (t.flip) ctx.scale(-1, 1);
      ctx.drawImage(t.img, -t.size / 2 * U, -t.size * U, t.size * U, t.size * U);
      ctx.restore();
    }

    // Pus stains and puddles, flat on the skin; they fade before vanishing.
    for (const st of world.stains || []) {
      const w = st.size, h = st.size * 0.4;
      if (!onScreen(st.x, w)) continue;
      ctx.globalAlpha = Math.min(1, (st.life - st.t) / 5, st.t * 6) * (st.splash ? 1 - st.splash * 0.3 : 1);
      ctx.drawImage(st.img, X(st.x) - (w / 2) * U, Y(st.g) - (h / 2) * U, w * U, h * U);
    }
    ctx.globalAlpha = 1;

    // Where you last tapped to walk (its age is advanced by the game loop).
    const tm = world.tapMark;
    if (tm && tm.t < TAP_MARK_LIFE) {
      const k = tm.t / TAP_MARK_LIFE;
      ctx.strokeStyle = `rgba(46, 22, 22, ${0.8 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(X(tm.x), Y(tm.g), (0.3 + k * 0.5) * U, (0.12 + k * 0.2) * U, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Everything else, back to front. Off-screen things are skipped before
    // sorting, and the queue's slots are reused frame to frame.
    queueLen = 0;
    // The hair along the horizon and the front edge is backdrop (faded); the
    // side walls and gates are barriers you bump into, so they stay solid.
    for (const c of world.gates.edges) if (onScreen(c.x, c.w)) enqueue(c.g, CLUMP, c, 1, c.g < 0 || c.g > AREA.front ? DECOR_ALPHA : 1);
    for (const gate of [world.gates.west, world.gates.east]) {
      const k = gateScale(gate), a = gateAlpha(gate);
      if (a > 0.01) for (const c of gate.clumps) if (onScreen(c.x, c.w)) enqueue(c.g, CLUMP, c, k, a);
      if (gate.open && gate.wither < 1) enqueue(AREA.front, STEAM, gate);
    }
    queueAll(world.scraps, 0);
    queueAll(world.people, 0);
    for (const e of world.items) if (e !== carried) queueEntity(e, 0);
    queueAll(world.drips, 0);
    queueAll(world.pimples, 0);
    queueAll(world.warts, 0);
    queueEntity(player, 0);
    if (carried) enqueue(player.g + 0.001, ENTITY, carried);
    queueAll(world.fx, 0.002);
    queueAll(world.globs, 0.001);
    const order = queue.slice(0, queueLen).sort(byDepth);
    for (const q of order) {
      if (q.type === CLUMP) drawClump(q.ref, q.k, q.a);
      else if (q.type === STEAM) drawSteam(q.ref);
      else drawEntity(q.ref);
    }

    drawSplashes(ctx, world, X, Y, U);

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

  // Depth-sorted draw queue (see draw()).
  const CLUMP = 0, STEAM = 1, ENTITY = 2;
  const queue = [];
  let queueLen = 0;
  const byDepth = (a, b) => a.g - b.g;
  function enqueue(g, type, ref, k = 1, a = 1) {
    const q = queue[queueLen] || (queue[queueLen] = {});
    q.g = g; q.type = type; q.ref = ref; q.k = k; q.a = a;
    queueLen++;
  }
  function queueEntity(e, dg) {
    if (e.visible && onScreen(e.x, e.w)) enqueue(e.g + dg, ENTITY, e);
  }
  function queueAll(list, dg) {
    for (const e of list) queueEntity(e, dg);
  }

  // Screen shake: the whole canvas jolts and settles.
  let shakeT = 0, shakePow = 0;
  function shake(power) {
    shakePow = Math.max(shakePow * (shakeT > 0 ? 1 : 0), power);
    shakeT = 0.35;
  }
  function applyShake(dt) {
    if (shakeT <= 0) return;
    shakeT -= dt;
    if (shakeT <= 0) { canvas.style.transform = ""; shakePow = 0; return; }
    const k = shakePow * U * (shakeT / 0.35);
    canvas.style.transform = `translate(${(Math.random() - 0.5) * k}px, ${(Math.random() - 0.5) * k}px)`;
  }

  return {
    resize, setInsets, follow, snap, draw, shake, applyShake,
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

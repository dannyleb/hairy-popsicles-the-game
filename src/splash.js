// Stepping in a puddle (pus from a popped pimple, or a fallen tear) makes
// a wet splash: a sound, a ring, and droplets flicked out of it.
import { INK } from "./config.js";
import { sfx } from "./sfx.js";

const COLORS = { pus: "#f2dc8a", water: "#9fd0f0" };

export function createSplash({ world, player }) {
  world.splashes = [];

  function splash(st) {
    st.splash = 1;
    sfx.splish(st.kind === "pus");
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.2;
      world.splashes.push({
        x: player.x, g: player.g, lift: 0.05,
        vx: Math.cos(a) * sp, vg: Math.sin(a) * sp * 0.3, vy: 2.5 + Math.random() * 3,
        r: 0.05 + Math.random() * 0.07, life: 0.7, color: COLORS[st.kind] || COLORS.pus,
      });
    }
  }

  return {
    update(dt, moving) {
      for (const st of world.stains) {
        if (st.splash) st.splash = Math.max(0, st.splash - dt * 2.5);
        const inside = Math.abs(player.x - st.x) < st.size * 0.42 && Math.abs(player.g - st.g) < st.size * 0.22;
        if (inside && !st.inside && moving && st.t > 0.3) splash(st);
        st.inside = inside;
      }
      for (let i = world.splashes.length - 1; i >= 0; i--) {
        const p = world.splashes[i];
        p.life -= dt;
        p.vy -= 16 * dt;
        p.x += p.vx * dt;
        p.g += p.vg * dt;
        p.lift = Math.max(0, p.lift + p.vy * dt);
        if (p.life <= 0) world.splashes.splice(i, 1);
      }
    },
  };
}

// Drawn by stage.js: droplets plus a ring on each splashed puddle.
export function drawSplashes(ctx, world, X, Y, U) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  for (const p of world.splashes) {
    ctx.globalAlpha = Math.min(1, p.life / 0.3);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.g) - p.lift * U, p.r * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const st of world.stains) {
    if (!st.splash) continue;
    const k = 1 - st.splash;
    ctx.globalAlpha = st.splash;
    ctx.strokeStyle = COLORS[st.kind] || COLORS.pus;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(X(st.x), Y(st.g), st.size * (0.4 + k * 0.5) * U, st.size * (0.16 + k * 0.2) * U, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

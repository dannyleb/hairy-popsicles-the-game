// Extra props drawn at runtime on canvas, in the same pen-and-colored-pencil
// vocabulary as the scans: popsicle sticks, hatched pen shadows, hair
// sprouting out of the paper, blue drips.
import * as THREE from "three";
import { INK } from "./config.js";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Colored-pencil grain: lots of short, faint diagonal strokes.
function pencil(ctx, w, h, color, count, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w, y = Math.random() * h, l = 4 + Math.random() * 10;
    ctx.globalAlpha = alpha * Math.random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.7, y - l * 0.7); ctx.stroke();
  }
  ctx.restore();
}

export function stickTexture() {
  const [c, ctx] = canvas(64, 512);
  const r = 26;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(6, 512 - r - 6);
  ctx.arc(32, 512 - r - 6, r, Math.PI, 0, true);
  ctx.lineTo(58, 0);
  ctx.fillStyle = "#dcb57c";
  ctx.fill();
  pencil(ctx, 64, 512, "#a9783f", 900, 0.5);
  pencil(ctx, 64, 512, "#f1d7a6", 500, 0.6);
  ctx.strokeStyle = "#8a5a2b";
  ctx.globalAlpha = 0.5;
  for (const x of [20, 37, 46]) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x - 3, 160, x + 4, 320, x - 1, 470); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(6, 512 - r - 6);
  ctx.arc(32, 512 - r - 6, r, Math.PI, 0, true);
  ctx.lineTo(58, 0);
  ctx.stroke();
  return texture(c);
}

// Pen hatching clipped to a ragged ellipse, like the shadows under the
// balloon-gang drawing.
export function shadowTexture() {
  const [c, ctx] = canvas(256, 96);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(128, 48, 120, 40, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  for (let x = -60; x < 300; x += 5 + Math.random() * 3) {
    ctx.globalAlpha = 0.55 + Math.random() * 0.4;
    const j = (Math.random() - 0.5) * 18;
    ctx.beginPath(); ctx.moveTo(x + j, 96); ctx.lineTo(x + 50 + j, 0); ctx.stroke();
  }
  ctx.restore();
  // Fade the far edge so it reads as a cast shadow, not a hole.
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.75, "rgba(0,0,0,0.85)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 96);
  return texture(c);
}

// A few stray hairs growing out of the page.
export function tuftTexture() {
  const s = 96;
  const [c, ctx] = canvas(s, s);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const bx = s / 2 + (Math.random() - 0.5) * 14;
    const len = 30 + Math.random() * 55;
    const lean = (Math.random() - 0.5) * 50;
    ctx.lineWidth = 1.6 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, s - 2);
    ctx.bezierCurveTo(bx + lean * 0.2, s - len * 0.5, bx + lean * 0.9, s - len * 0.7, bx + lean, s - len);
    ctx.stroke();
  }
  return texture(c);
}

// The blue drip that runs off half the cast.
export function dripTexture() {
  const [c, ctx] = canvas(128, 192);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.bezierCurveTo(70, 50, 112, 92, 112, 132);
    ctx.bezierCurveTo(112, 162, 90, 184, 64, 184);
    ctx.bezierCurveTo(38, 184, 16, 162, 16, 132);
    ctx.bezierCurveTo(16, 92, 58, 50, 64, 8);
  };
  path();
  ctx.fillStyle = "#5f8fd0";
  ctx.fill();
  pencil(ctx, 128, 192, "#2f5a9c", 700, 0.55);
  pencil(ctx, 128, 192, "#a9c6ee", 300, 0.5);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(46, 128, 8, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  path();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  return texture(c);
}

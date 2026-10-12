// Keyboard + on-screen D-pad merged into one per-frame poll() result.
const keys = new Set();
const pad = { up: false, down: false, left: false, right: false };

window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function bindPadButton(el, dir) {
  if (!el) return;
  const set = (v) => (pad[dir] = v);
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
  el.addEventListener("pointerup", () => set(false));
  el.addEventListener("pointerleave", () => set(false));
  el.addEventListener("pointercancel", () => set(false));
}

export function initControls() {
  bindPadButton(document.querySelector("#dpad .up"), "up");
  bindPadButton(document.querySelector("#dpad .down"), "down");
  bindPadButton(document.querySelector("#dpad .left"), "left");
  bindPadButton(document.querySelector("#dpad .right"), "right");
}

export function poll() {
  const up = keys.has("w") || keys.has("arrowup") || pad.up;
  const down = keys.has("s") || keys.has("arrowdown") || pad.down;
  const left = keys.has("a") || keys.has("arrowleft") || pad.left;
  const right = keys.has("d") || keys.has("arrowright") || pad.right;
  const run = keys.has("shift");

  let x = 0, z = 0;
  if (up) z -= 1;
  if (down) z += 1;
  if (left) x -= 1;
  if (right) x += 1;
  const len = Math.hypot(x, z);
  if (len > 0) { x /= len; z /= len; }

  return { x, z, moving: len > 0, run };
}

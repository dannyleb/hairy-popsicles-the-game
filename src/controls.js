// Keyboard + on-screen D-pad and verb buttons, merged into one per-frame
// poll(): analog movement plus one-shot verb presses.
const keys = new Set();
const pad = { up: false, down: false, left: false, right: false };
const pressed = new Set();

const VERB_KEYS = { " ": "slap", e: "grab", q: "water" };

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (VERB_KEYS[k]) {
    e.preventDefault();
    if (!e.repeat) pressed.add(VERB_KEYS[k]);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

function bindPadButton(el, dir) {
  if (!el) return;
  const set = (v) => (pad[dir] = v);
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
  el.addEventListener("pointerup", () => set(false));
  el.addEventListener("pointerleave", () => set(false));
  el.addEventListener("pointercancel", () => set(false));
}

export function initControls() {
  for (const dir of ["up", "down", "left", "right"]) bindPadButton(document.querySelector(`#dpad .${dir}`), dir);
  for (const el of document.querySelectorAll("[data-verb]")) {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); pressed.add(el.dataset.verb); });
  }
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

  const verbs = { slap: pressed.has("slap"), grab: pressed.has("grab"), water: pressed.has("water") };
  pressed.clear();
  return { x, z, moving: len > 0, run, ...verbs };
}

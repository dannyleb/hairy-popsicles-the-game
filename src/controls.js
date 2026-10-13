// Keyboard and on-screen verb buttons, merged into one per-frame poll():
// a normalized 8-way movement vector plus one-shot verb presses.
const keys = new Set();
const pressed = new Set();

const VERB_KEYS = { " ": "slap", e: "grab", q: "water" };
const DIALOGS = "#startOverlay, #menu, #pageView, #confirm, #endCard";

// Inside an open menu or dialog, Space/E/Q belong to the focused button.
// (Focus can stay on a button after its dialog closes; that doesn't count.)
function inOpenDialog(target) {
  const d = target instanceof Element && target.closest(DIALOGS);
  return !!d && !d.hidden && !d.classList.contains("hidden");
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (VERB_KEYS[k] && !inOpenDialog(e.target)) {
    e.preventDefault();
    if (!e.repeat) pressed.add(VERB_KEYS[k]);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

export function initControls() {
  // No long-press menus on touch.
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  for (const el of document.querySelectorAll("[data-verb]")) {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); pressed.add(el.dataset.verb); });
  }
}

// Forget presses made while the game wasn't running (title, menus), so they
// don't all fire on the first frame back.
export function clearPresses() {
  pressed.clear();
}

export function poll() {
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
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

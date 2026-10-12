// Background music: one looping track for the menu and gameplay. Starts on
// the first tap/keypress (browsers block sound before that), dips a little
// once the game starts so sound effects cut through, remembers mute, and
// pauses while the tab is hidden. If the file isn't there, the music
// buttons stay hidden.
const SRC = "audio/theme.mp3";
const MUTE_KEY = "hairy-popsicles-muted";
const LEVEL = { menu: 0.6, game: 0.38 };

export function createMusic(buttons) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0;
  let available = false, wanted = false, target = LEVEL.menu, fadeRaf = 0;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch {}

  const render = () => {
    for (const b of buttons) {
      b.hidden = !available;
      b.classList.toggle("off", muted);
      b.setAttribute("aria-label", muted ? "Turn music on" : "Turn music off");
    }
  };

  function fadeTo(v, secs = 0.8) {
    cancelAnimationFrame(fadeRaf);
    const from = audio.volume, start = performance.now();
    const step = (now) => {
      const k = Math.max(0, Math.min(1, (now - start) / (secs * 1000)));
      audio.volume = Math.max(0, Math.min(1, from + (v - from) * k));
      if (k < 1) fadeRaf = requestAnimationFrame(step);
      else if (v === 0) audio.pause();
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function play() {
    wanted = true;
    if (!available || muted || document.hidden) return;
    if (!audio.src) audio.src = SRC;
    if (!audio.paused) return fadeTo(target);
    audio.play().then(() => fadeTo(target)).catch(() => {});
  }

  function setMode(mode) {
    target = LEVEL[mode];
    if (!audio.paused) fadeTo(target);
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch {}
    render();
    if (muted) fadeTo(0, 0.3);
    else play();
  }

  for (const b of buttons) b.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else if (wanted && !muted && available) play();
  });

  fetch(SRC, { method: "HEAD" })
    .then((r) => { available = r.ok; render(); if (available && wanted) play(); })
    .catch(() => render());
  render();

  return { play, setMode };
}

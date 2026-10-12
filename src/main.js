import { GAME_TITLE, PLAYER } from "./config.js";
import { BLOB, MOON, SPRITES } from "./roster.js";
import { initControls, poll } from "./controls.js";
import { animateWorld, buildWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { createStage } from "./stage.js";
import { createHud } from "./ui/hud.js";
import { createStory } from "./story.js";
import { createInteractions } from "./interact.js";
import { createPus } from "./pus.js";
import { updateGates } from "./gates.js";
import { eyeballTexture } from "./ink.js";
import { unlock } from "./sfx.js";

document.title = GAME_TITLE;

const pressStart = document.getElementById("pressStart");

function loadImages() {
  const entries = SPRITES.map((s) => [s, `assets/sprites/${s}.webp`]);
  let done = 0;
  return Promise.all(entries.map(async ([key, url]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    pressStart.textContent = `LOADING ${++done}/${entries.length}`;
    return [key, img];
  })).then(Object.fromEntries);
}

async function boot() {
  const img = await loadImages();
  img.blob = img[BLOB];
  img.moon = img[MOON];

  const stage = createStage(document.getElementById("gameCanvas"));
  const world = buildWorld(img);
  const player = createPlayer(img[PLAYER.sprite]);
  const hud = createHud(stage);
  const story = createStory({ world, hud, img, eyeballImg: eyeballTexture() });
  const pus = createPus({ world, player, hud });
  const verbs = createInteractions({ world, player, hud, story, pus });

  window.addEventListener("resize", stage.resize);
  stage.resize();
  initControls();
  document.getElementById("gameCanvas").addEventListener("pointerdown", (e) => {
    if (!running) return;
    const zit = stage.hit(world.pimples.filter((p) => p.kind === "pimple"), e.clientX, e.clientY);
    if (zit) verbs.tapPimple(zit);
  });

  if (new URLSearchParams(location.search).has("debug")) window.game = { player, world, story, pus, stage };

  let last = performance.now();
  let running = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (running) {
      const input = verbs.steer(poll());
      updatePlayer(player, input, dt, world.people, world.gates);
      verbs.update(input, dt);
      pus.update(dt);
      story.update(dt, player);
    }
    updateGates(world.gates, dt);
    animateWorld(world, t, dt);
    stage.follow(player, dt);
    stage.draw(world, player, verbs.carrying);
    hud.update(dt);
    requestAnimationFrame(tick);
  }

  stage.follow(player, -1);
  requestAnimationFrame(tick);

  const startOverlay = document.getElementById("startOverlay");
  pressStart.textContent = "▶ PRESS START";
  pressStart.disabled = false;
  pressStart.addEventListener("click", () => {
    unlock();
    window.scrollTo(0, 0);
    startOverlay.classList.add("hidden");
    story.start();
    running = true;
  }, { once: true });

  document.getElementById("endKeep").addEventListener("click", () => {
    document.getElementById("endCard").classList.remove("show");
  });
}

boot();

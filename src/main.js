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
import { createScraps } from "./scraps.js";
import { CYCLE_SECONDS, START_PHASE } from "./daynight.js";
import { AREA, POCKETS } from "./config.js";
import { updateGates } from "./gates.js";
import { eyeballTexture } from "./ink.js";
import { sfx, unlock } from "./sfx.js";
import { createMusic } from "./music.js";

document.title = GAME_TITLE;

const pressStart = document.getElementById("pressStart");

// Menu music from the moment the menu shows. Browsers block sound until
// the first tap, so if autoplay is refused, a "tap to enter" gate takes
// that tap and the menu opens with music already playing.
const music = createMusic([...document.querySelectorAll(".musicBtn")]);
const gate = document.getElementById("enterGate");
music.autoplay().then((state) => {
  if (state !== "blocked") return;
  gate.hidden = false;
  const enter = () => {
    unlock();
    music.play();
    gate.classList.add("gone");
    setTimeout(() => (gate.hidden = true), 450);
    window.removeEventListener("keydown", enter);
  };
  gate.addEventListener("click", enter, { once: true });
  window.addEventListener("keydown", enter);
});

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
  world.clock = START_PHASE;
  const player = createPlayer(img[PLAYER.sprite]);
  const hud = createHud(stage);
  // When a hair wall evaporates, the camera swings over to show the
  // opening, a sign points the way, then it comes back to you.
  let peek = null;
  const onOpen = (gate, stage) => {
    peek = { x: gate.x, g: 4, t: 2.6 };
    hud.sign(gate.x, 4.5, 2.4, gate.x < 0 ? `\u2190 ${stage.zone}` : `${stage.zone} \u2192`, 9);
  };
  const story = createStory({ world, hud, img, eyeballImg: eyeballTexture(), onOpen });
  const pus = createPus({ world, player, hud });
  const scraps = createScraps({ world, player, hud });
  const verbs = createInteractions({ world, player, hud, story, pus, scraps });
  hud.setPockets(0, POCKETS);

  window.addEventListener("resize", stage.resize);
  stage.resize();
  initControls();
  // Tap/click the stage: small things first (pimples, scraps, items),
  // then characters, else open ground.
  document.getElementById("gameCanvas").addEventListener("pointerdown", (e) => {
    if (!running) return;
    e.preventDefault();
    const small = [
      ...world.pimples.filter((p) => p.kind === "pimple"),
      ...world.scraps.filter((s) => !s.gone),
      ...world.items.filter((i) => !i.carried && !i.eaten),
    ];
    const hit = stage.hit(small, e.clientX, e.clientY, 16) || stage.hit(world.people, e.clientX, e.clientY, 0);
    const p = stage.toWorld(e.clientX, e.clientY);
    verbs.tap(hit, p.x, Math.max(0.4, Math.min(AREA.front, p.g)));
  });

  if (new URLSearchParams(location.search).has("debug")) window.game = { player, world, story, pus, stage, scraps };

  let last = performance.now();
  let running = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (running) {
      const input = verbs.steer(poll(), dt);
      updatePlayer(player, input, dt, world.people, world.gates);
      verbs.update(input, dt);
      pus.update(dt);
      scraps.update(dt, t);
      story.update(dt, player);
      sfx.buzz(Math.max(0, 1 - scraps.nearestFly() / 7));
    }
    updateGates(world.gates, dt);
    animateWorld(world, t, dt);
    if (peek) {
      peek.t -= dt;
      stage.follow(peek, dt);
      if (peek.t <= 0) peek = null;
    } else {
      stage.follow(player, dt);
    }
    if (running) world.clock = (world.clock + dt / CYCLE_SECONDS) % 1;
    stage.draw(world, player, verbs.carrying, t);
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
    music.play();
    music.setMode("game");
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

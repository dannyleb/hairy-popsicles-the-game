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
import { createLife } from "./life.js";
import { createSplash } from "./splash.js";
import { createTips } from "./tips.js";
import { CYCLE_SECONDS, START_PHASE } from "./daynight.js";
import { AREA } from "./config.js";
import { createProgress } from "./progress.js";
import { upgrades } from "./shop.js";
import { createAlbum } from "./album.js";
import { cravingFor } from "./story.js";
import { createMenus } from "./ui/menus.js";
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

// Sprites, plus idle-animation strips (swaying hair, dripping faces) for
// the ones tools/animate.mjs made strips for.
async function loadImages() {
  let anim = {};
  try { anim = await (await fetch("assets/sprites/anim.json")).json(); } catch {}
  const entries = [
    ...SPRITES.map((s) => [s, `assets/sprites/${s}.webp`]),
    ...SPRITES.filter((s) => anim[s]).map((s) => [`${s}:anim`, `assets/sprites/${s}-anim.webp`]),
  ];
  let done = 0;
  return Promise.all(entries.map(async ([key, url]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    pressStart.textContent = `LOADING ${++done}/${entries.length}`;
    return [key, img];
  })).then((pairs) => {
    const img = Object.fromEntries(pairs);
    img.anim = Object.fromEntries(SPRITES.filter((s) => anim[s] && img[`${s}:anim`]).map((s) => [s, { img: img[`${s}:anim`], n: anim[s] }]));
    return img;
  });
}

async function boot() {
  const img = await loadImages();
  img.blob = img[BLOB];
  img.moon = img[MOON];

  const progress = createProgress();
  const gift = progress.visit();
  const ups = () => upgrades(progress);

  const stage = createStage(document.getElementById("gameCanvas"));
  const world = buildWorld(img);
  world.clock = START_PHASE;
  const isNight = () => world.clock > 0.53 && world.clock < 0.95;
  const player = createPlayer(img[PLAYER.sprite]);
  const hud = createHud(stage);

  // When a hair wall evaporates, the camera swings over to show the
  // opening, a sign points the way, then it comes back to you.
  let peek = null;
  const onOpen = (gate, stage) => {
    peek = { x: gate.x, g: 4, t: 2.6 };
    hud.sign(gate.x, 4.5, 2.4, gate.x < 0 ? `\u2190 ${stage.zone}` : `${stage.zone} \u2192`, 9);
  };
  const album = createAlbum({ progress, hud, world, player, isNight });
  const story = createStory({
    world, hud, img, eyeballImg: eyeballTexture(), onOpen,
    onEvent: album.onEvent, progress, craving: cravingFor(progress.today()),
  });
  const pus = createPus({ world, player, hud, progress, upgrades: ups, stage });
  const scraps = createScraps({ world, player, hud, progress, upgrades: ups });

  let running = false, paused = false;
  const applyShop = () => {
    const u = ups();
    player.cosmetics = u.cosmetics;
    player.speedMul = u.speed;
    hud.setPockets(scraps.pockets.length, u.pockets);
  };
  const tips = createTips({ progress, hud, story, scraps, upgrades: ups, isNight });
  const menus = createMenus({
    progress, hud, img, onShopChange: applyShop, onView: tips.onView,
    setPaused: (v) => { paused = v; if (v) { press = null; verbs.stop(); } },
  });
  const verbs = createInteractions({
    world, player, hud, story, pus, scraps, album, progress, upgrades: ups, stage, isNight, openShop: menus.openShop,
    onTalk: tips.onTalk,
  });
  const life = createLife({ world, player, hud, story, scraps, isNight });
  const splash = createSplash({ world, player });
  applyShop();

  progress.on((type, a) => {
    if (type !== "achievement") return;
    hud.banner("ACHIEVEMENT", a.name, a.text);
    sfx.chime();
  });

  window.addEventListener("resize", stage.resize);
  stage.resize();
  initControls();

  // Touch/click the stage. Press and hold: the character follows your
  // finger. A quick tap: walk to whatever you tapped and use it (small
  // things first: pimples, scraps, items; then characters; else ground).
  const canvas = document.getElementById("gameCanvas");
  let press = null;
  // Pausing (or losing the finger) mid-hold must not leave the player
  // steering toward a thumb that's gone.
  function dropPress() {
    press = null;
    verbs.release();
  }
  const floorAt = (e) => {
    const p = stage.toWorld(e.clientX, e.clientY);
    return [p.x, Math.max(0.4, Math.min(AREA.front, p.g))];
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (!running || paused) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    const small = [
      ...world.pimples.filter((p) => p.kind === "pimple"),
      ...world.scraps.filter((s) => !s.gone),
      ...world.items.filter((i) => !i.carried && !i.eaten),
    ];
    const hit = stage.hit(small, e.clientX, e.clientY, 16) || stage.hit(world.people.filter((p) => p.visible), e.clientX, e.clientY, 0);
    press = { id: e.pointerId, t: performance.now(), x: e.clientX, y: e.clientY, hit, moved: false };
    verbs.holdAt(...floorAt(e), true);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) press.moved = true;
    verbs.holdAt(...floorAt(e), false);
  });
  const endPress = (e) => {
    if (!press || e.pointerId !== press.id) return;
    verbs.release();
    if (!press.moved && performance.now() - press.t < 260) verbs.tap(press.hit, ...floorAt(e));
    press = null;
  };
  canvas.addEventListener("pointerup", endPress);
  canvas.addEventListener("pointercancel", endPress);
  canvas.addEventListener("lostpointercapture", (e) => { if (press && e.pointerId === press.id) dropPress(); });

  // Escape or P pauses (the menu closes itself on Escape).
  window.addEventListener("keydown", (e) => {
    if (!running || menus.isOpen) return;
    if (e.key === "Escape" || e.key.toLowerCase() === "p") menus.openPause();
  });

  if (new URLSearchParams(location.search).has("debug")) {
    window.game = { player, world, story, pus, stage, scraps, progress, album, menus, verbs, tips };
  }

  let last = performance.now();
  let lastInput = { moving: false, x: 0 };
  let zone = "";
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const live = running && !paused;

    if (live) {
      const input = verbs.steer(poll(), dt);
      lastInput = input;
      updatePlayer(player, input, dt, world.people.filter((p) => p.visible), world.gates);
      verbs.update(input, dt);
      pus.update(dt);
      splash.update(dt, input.moving);
      scraps.update(dt, t);
      story.update(dt, player);
      album.update();
      tips.update(dt);
      sfx.buzz(Math.max(0, 1 - scraps.nearestFly() / 7));
      const z = player.x < -AREA.gateX ? "west" : player.x > AREA.gateX ? "east" : "hub";
      if (z !== zone) { zone = z; sfx.zone(z); }
      world.clock = (world.clock + dt / CYCLE_SECONDS) % 1;
    } else {
      sfx.buzz(0);
    }
    updateGates(world.gates, dt);
    if (!paused) {
      animateWorld(world, t, dt);
      life.update(dt, t, live ? lastInput : { moving: false, x: 0 });
    }
    if (peek) {
      peek.t -= dt;
      stage.follow(peek, dt);
      if (peek.t <= 0) peek = null;
    } else {
      stage.follow(player, dt);
    }
    stage.applyShake(dt);
    stage.draw(world, player, verbs.carrying, t);
    hud.update(dt);
    requestAnimationFrame(tick);
  }

  stage.follow(player, -1);
  requestAnimationFrame(tick);

  const startOverlay = document.getElementById("startOverlay");
  pressStart.textContent = "\u25B6 PRESS START";
  pressStart.disabled = false;
  pressStart.addEventListener("click", () => {
    unlock();
    music.play();
    music.setMode("game");
    window.scrollTo(0, 0);
    startOverlay.classList.add("hidden");
    story.start();
    running = true;
    hud.setPus(progress.pus, false);
    if (gift) setTimeout(() => hud.banner("WELCOME BACK", `Toad left you ${gift} pus`, `day ${progress.stat("days")} on the skin`), 900);
  }, { once: true });

  document.getElementById("endKeep").addEventListener("click", () => {
    document.getElementById("endCard").classList.remove("show");
  });
}

boot();

import { AREA, GAME_TITLE, PLAYER } from "./config.js";
import { BLOB, MOON, SPRITES } from "./roster.js";
import { clearPresses, initControls, poll } from "./controls.js";
import { animateWorld, buildWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { createStage } from "./stage.js";
import { createHud } from "./ui/hud.js";
import { cravingFor, createStory } from "./story.js";
import { createInteractions } from "./interact.js";
import { createPus } from "./pus.js";
import { createScraps } from "./scraps.js";
import { createLife } from "./life.js";
import { createSplash } from "./splash.js";
import { createTips } from "./tips.js";
import { startOver } from "./ui/confirm.js";
import { PAGES, createAlbum } from "./album.js";
import { CYCLE_SECONDS, isNightPhase } from "./daynight.js";
import { ACHIEVEMENTS, createProgress } from "./progress.js";
import { upgrades } from "./shop.js";
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
    try {
      await img.decode();
    } catch (err) {
      // A missing idle strip just means no animation; a missing sprite is fatal.
      if (key.endsWith(":anim")) return [key, null];
      throw new Error(`couldn't load ${url}`, { cause: err });
    }
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
  // Upgrade numbers are read every frame, so they're worked out once and
  // refreshed when something is bought (applyShop).
  let upgraded = upgrades(progress);
  const ups = () => upgraded;

  const stage = createStage(document.getElementById("gameCanvas"));
  const world = buildWorld(img);
  const isNight = () => isNightPhase(world.clock);
  const player = createPlayer(img[PLAYER.sprite]);
  const hud = createHud(stage);

  // When a hair wall evaporates, the camera swings over to show the
  // opening, a sign points the way, then it comes back to you.
  let peek = null;
  const onOpen = (hedge, opened) => {
    peek = { x: hedge.x, g: 4, t: 2.6 };
    hud.sign(hedge.x, 4.5, 2.4, hedge.x < 0 ? `\u2190 ${opened.zone}` : `${opened.zone} \u2192`, 9);
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
    const u = upgraded = upgrades(progress);
    player.cosmetics = u.cosmetics;
    player.speedMul = u.speed;
    hud.setPockets(scraps.used(), u.pockets);
  };
  const tips = createTips({ progress, hud, story, scraps, upgrades: ups, isNight, guide: (to) => menus.setGuide(to) });
  const menus = createMenus({
    progress, hud, img, onShopChange: applyShop, onView: tips.onView,
    setPaused: (v) => { paused = v; if (v) { press = null; verbs.stop(); } },
  });
  const verbs = createInteractions({
    world, player, hud, story, pus, scraps, album, progress, upgrades: ups, stage, isNight,
    onTalk: tips.onTalk,
  });
  const life = createLife({ world, player, hud, story, scraps, isNight });
  const splash = createSplash({ world, player });
  applyShop();

  // Achievement banners; any earned before you press start (e.g. the visit
  // streak) wait for the game to begin.
  const waiting = [];
  const announce = (a) => { hud.banner("ACHIEVEMENT", a.name, a.text); sfx.chime(); };
  progress.on((type, a) => {
    if (type !== "achievement") return;
    if (running) announce(a);
    else waiting.push(a);
  });
  // Counts today's visit (after the listeners above, so a visit achievement
  // isn't lost) and returns the welcome-back gift.
  const gift = progress.visit();

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
  const TAP_MS = 260, TAP_SLOP = 14; // a press this short and still is a tap
  const floorAt = (e) => {
    const p = stage.toWorld(e.clientX, e.clientY);
    return [p.x, Math.max(AREA.back, Math.min(AREA.front, p.g))];
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
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > TAP_SLOP) press.moved = true;
    verbs.holdAt(...floorAt(e), false);
  });
  const endPress = (e) => {
    if (!press || e.pointerId !== press.id) return;
    verbs.release();
    if (!press.moved && performance.now() - press.t < TAP_MS) verbs.tap(press.hit, ...floorAt(e));
    press = null;
  };
  canvas.addEventListener("pointerup", endPress);
  // A cancelled touch (the browser took over the gesture) is never a tap.
  canvas.addEventListener("pointercancel", (e) => { if (press && e.pointerId === press.id) dropPress(); });
  canvas.addEventListener("lostpointercapture", (e) => { if (press && e.pointerId === press.id) dropPress(); });

  // Escape or P pauses. (When a menu or dialog handles Escape itself it
  // calls preventDefault, so this never reopens what was just closed.)
  window.addEventListener("keydown", (e) => {
    if (!running || menus.isOpen || e.defaultPrevented) return;
    if (e.key === "Escape" || e.key.toLowerCase() === "p") menus.openPause();
  });

  if (new URLSearchParams(location.search).has("debug")) {
    window.game = { player, world, story, pus, stage, scraps, progress, album, menus, verbs, tips };
  }

  let last = performance.now();
  let lastInput = { moving: false, x: 0 };
  let zone = "";
  function tick(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const t = now / 1000;
    const live = running && !paused;

    if (live) {
      const input = verbs.steer(poll(), dt);
      lastInput = input;
      updatePlayer(player, input, dt, world.people, world.gates);
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
      if (world.tapMark) world.tapMark.t += dt;
    } else {
      sfx.buzz(0);
      clearPresses();
    }
    if (!paused) {
      updateGates(world.gates, dt);
      animateWorld(world, t, dt);
      life.update(dt, t, live ? lastInput : { moving: false, x: 0 });
      if (peek) {
        peek.t -= dt;
        if (peek.t <= 0) peek = null;
      }
    }
    stage.follow(peek || player, dt);
    stage.applyShake(dt);
    stage.draw(world, player, verbs.carrying, t);
    hud.update(dt);
    requestAnimationFrame(tick);
  }

  stage.snap(player);
  requestAnimationFrame(tick);

  const startOverlay = document.getElementById("startOverlay");
  document.getElementById("achCount").textContent = ACHIEVEMENTS.length;
  const returning = progress.hasProgress();
  pressStart.textContent = returning ? "\u25B6 CONTINUE" : "\u25B6 PRESS START";
  pressStart.disabled = false;
  // Coming back: say what's saved, and offer a clean start as a new player.
  if (returning) {
    document.getElementById("returningSum").textContent = `${progress.pus} pus, ${progress.pageCount()}/${PAGES.length} cards saved`;
    document.getElementById("returning").hidden = false;
    document.getElementById("newPlayer").addEventListener("click", () => startOver(progress));
  }
  pressStart.addEventListener("click", () => {
    unlock();
    music.play();
    music.setMode("game");
    window.scrollTo(0, 0);
    startOverlay.classList.add("hidden");
    pressStart.blur();
    story.start();
    running = true;
    hud.setPus(progress.pus, false);
    if (gift) setTimeout(() => hud.banner("WELCOME BACK", `Toad left you ${gift} pus`, `day ${progress.stat("days")} on the skin`), 900);
    for (const a of waiting.splice(0)) setTimeout(() => announce(a), 1200);
  }, { once: true });

  document.getElementById("endKeep").addEventListener("click", () => {
    const end = document.getElementById("endCard");
    end.classList.remove("show");
    end.hidden = true;
  });
}

boot().catch((err) => {
  console.error(err);
  pressStart.textContent = "COULDN'T LOAD. REFRESH?";
});

import * as THREE from "three";
import { CAMERA, GAME_TITLE, PLAYER } from "./config.js";
import { BLOB, SPRITES } from "./roster.js";
import { initControls, poll } from "./controls.js";
import { animateWorld, buildWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { updateCamera } from "./camera.js";
import { createHud } from "./ui/hud.js";
import { createStory } from "./story.js";
import { createInteractions } from "./interact.js";
import { updateGates } from "./gates.js";
import { eyeballTexture } from "./ink.js";
import { unlock } from "./sfx.js";

document.title = GAME_TITLE;

const canvas = document.getElementById("gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 300);
scene.add(camera);

const pressStart = document.getElementById("pressStart");

function loadTextures() {
  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  const entries = [["paper", "assets/textures/paper.jpg"], ...SPRITES.map((s) => [s, `assets/sprites/${s}.webp`])];
  let done = 0;
  return Promise.all(entries.map(async ([key, url]) => {
    const tex = await load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    pressStart.textContent = `LOADING ${++done}/${entries.length}`;
    return [key, tex];
  })).then(Object.fromEntries);
}

async function boot() {
  const tex = await loadTextures();
  tex.blob = tex[BLOB];
  const world = buildWorld(scene, camera, tex);
  const player = createPlayer(tex[PLAYER.sprite]);
  scene.add(player.root);

  const hud = createHud(camera);
  const story = createStory({ world, hud, tex, eyeballTex: eyeballTexture() });
  const verbs = createInteractions({ world, player, hud, story });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    world.placeMoon();
  }
  window.addEventListener("resize", resize);
  resize();

  initControls();

  if (new URLSearchParams(location.search).has("debug")) window.game = { player, world, story };

  let last = performance.now();
  let running = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (running) {
      const input = poll();
      updatePlayer(player, input, dt, world.people, world.gates);
      verbs.update(input, dt);
      story.update(dt, player.root.position);
    }
    updateGates(world.gates, dt);
    updateCamera(camera, player.root.position, dt);
    animateWorld(world, t, dt);
    hud.update(dt);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  updateCamera(camera, player.root.position, -1);
  requestAnimationFrame(tick);

  const startOverlay = document.getElementById("startOverlay");
  pressStart.textContent = "▶ PRESS START";
  pressStart.disabled = false;
  pressStart.addEventListener("click", () => {
    unlock();
    startOverlay.classList.add("hidden");
    story.start();
    running = true;
  }, { once: true });

  document.getElementById("endKeep").addEventListener("click", () => {
    document.getElementById("endCard").classList.remove("show");
  });
}

boot();

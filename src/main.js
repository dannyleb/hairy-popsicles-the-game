import * as THREE from "three";
import { CAMERA, GAME_TITLE, PLAYER } from "./config.js";
import { SPRITES } from "./roster.js";
import { initControls, poll } from "./controls.js";
import { animateWorld, buildWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { updateCamera } from "./camera.js";
import { createHud } from "./ui/hud.js";
import { createMissionRunner } from "./missions/index.js";

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
  const world = buildWorld(scene, camera, tex);
  const player = createPlayer(tex[PLAYER.sprite]);
  scene.add(player.root);

  const hud = createHud();
  const missions = createMissionRunner(hud);

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

  const pickupRadius = 1.1;
  function checkPickups() {
    const p = player.root.position;
    for (const drip of [...world.pickups.children]) {
      if (Math.hypot(p.x - drip.position.x, p.z - drip.position.z) < pickupRadius) {
        world.pickups.remove(drip);
        missions.onPickupCollected();
      }
    }
  }

  let last = performance.now();
  let running = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (running) {
      updatePlayer(player, poll(), dt, world.people);
      checkPickups();
    }
    updateCamera(camera, player.root.position, dt);
    animateWorld(world, t);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  updateCamera(camera, player.root.position, -1);
  requestAnimationFrame(tick);

  const startOverlay = document.getElementById("startOverlay");
  pressStart.textContent = "▶ PRESS START";
  pressStart.disabled = false;
  pressStart.addEventListener("click", () => {
    startOverlay.classList.add("hidden");
    missions.start();
    running = true;
  }, { once: true });
}

boot();

import * as THREE from "three";
import { GAME_TITLE } from "./config.js";
import { initControls, poll } from "./controls.js";
import { buildWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { updateCamera } from "./camera.js";
import { createHud } from "./ui/hud.js";
import { createMissionRunner } from "./missions/index.js";

document.title = GAME_TITLE;

const canvas = document.getElementById("gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

const { pickups } = buildWorld(scene);
const player = createPlayer();
scene.add(player);

const hud = createHud();
const missions = createMissionRunner(hud);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

initControls();

const pickupRadius = 1.8;
function checkPickups() {
  for (const mesh of [...pickups.children]) {
    if (player.position.distanceTo(mesh.position) < pickupRadius) {
      pickups.remove(mesh);
      missions.onPickupCollected();
    }
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const input = poll();
  updatePlayer(player, input, dt);
  updateCamera(camera, player, dt);
  checkPickups();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

const startOverlay = document.getElementById("startOverlay");
const pressStart = document.getElementById("pressStart");
pressStart.addEventListener("click", () => {
  startOverlay.classList.add("hidden");
  missions.start();
  last = performance.now();
  requestAnimationFrame(tick);
}, { once: true });

// Render one static frame behind the start screen.
renderer.render(scene, camera);

import * as THREE from "three";
import { WORLD } from "./config.js";

// Placeholder checker texture — stand-in for hand-drawn ground art.
function checkerTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#79b85f";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#6fae53";
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(WORLD.bounds / 4, WORLD.bounds / 4);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function buildWorld(scene) {
  scene.background = new THREE.Color(WORLD.fogColor);
  scene.fog = new THREE.Fog(WORLD.fogColor, WORLD.fogNear, WORLD.fogFar);

  const hemi = new THREE.HemisphereLight(0xffffff, WORLD.groundColor, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -WORLD.bounds;
  sun.shadow.camera.right = WORLD.bounds;
  sun.shadow.camera.top = WORLD.bounds;
  sun.shadow.camera.bottom = -WORLD.bounds;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.bounds * 2, WORLD.bounds * 2),
    new THREE.MeshStandardMaterial({ map: checkerTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Placeholder collectibles — swap for real popsicle art later.
  const pickups = new THREE.Group();
  const geo = new THREE.ConeGeometry(0.5, 1.4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5fa0 });
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    const a = (i / 12) * Math.PI * 2;
    const r = 15 + (i % 3) * 10;
    mesh.position.set(Math.cos(a) * r, 0.7, Math.sin(a) * r);
    mesh.castShadow = true;
    mesh.userData.id = `pickup-${i}`;
    pickups.add(mesh);
  }
  scene.add(pickups);

  return { ground, pickups };
}

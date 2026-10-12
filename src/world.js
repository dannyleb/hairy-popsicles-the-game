import * as THREE from "three";
import { LEAN, PAPER, WORLD } from "./config.js";
import { MOON, ROSTER } from "./roster.js";
import { createCutout, artMaterial } from "./cutout.js";
import { dripTexture, tuftTexture } from "./ink.js";

function ground(scene, paperTex) {
  paperTex.wrapS = paperTex.wrapT = THREE.MirroredRepeatWrapping;
  paperTex.colorSpace = THREE.SRGBColorSpace;
  const size = WORLD.bounds * 2;
  paperTex.repeat.set(size / WORLD.tileSize, size / WORLD.tileSize);
  paperTex.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: paperTex }));
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
}

// Hair growing out of the page, so the ground reads as moving under you.
function tufts(scene) {
  const variants = 4, per = Math.ceil(WORLD.tufts / variants);
  const geo = new THREE.PlaneGeometry(1.1, 1.1);
  geo.translate(0, 0.55, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tilt = new THREE.Euler(LEAN, 0, 0);
  for (let v = 0; v < variants; v++) {
    const mat = new THREE.MeshBasicMaterial({ map: tuftTexture(), alphaTest: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geo, mat, per);
    for (let i = 0; i < per; i++) {
      const r = Math.sqrt(Math.random()) * WORLD.bounds * 0.9;
      const a = Math.random() * Math.PI * 2;
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const k = 0.6 + Math.random() * 0.9;
      s.set(k * (Math.random() < 0.5 ? -1 : 1), k, 1);
      q.setFromEuler(tilt);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    scene.add(mesh);
  }
}

function cast(scene, tex) {
  return ROSTER.map((c, i) => {
    const cut = createCutout(tex[c.sprite], c.height, { stick: c.stick });
    cut.root.position.set(c.at[0], 0, c.at[1]);
    scene.add(cut.root);
    return {
      ...c, ...cut,
      radius: Math.max(0.5, Math.min(cut.width, 2.5) * 0.35),
      phase: i * 1.7,
      sway: c.stick ? 0.05 : 0.02,
    };
  });
}

function drips(scene, count = 12) {
  const tex = dripTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(0.55, 0.82);
  geo.translate(0, 0.41, 0);
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    const a = (i / count) * Math.PI * 2 + 0.3;
    const r = 9 + (i % 3) * 8;
    mesh.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r - 6);
    mesh.rotation.x = LEAN;
    mesh.userData.phase = i;
    group.add(mesh);
  }
  scene.add(group);
  return group;
}

function moon(camera, tex) {
  const aspect = tex.image.width / tex.image.height;
  const h = 18;
  const geo = new THREE.PlaneGeometry(h * aspect, h);
  const mat = artMaterial(tex);
  mat.fog = false;
  const mesh = new THREE.Mesh(geo, mat);
  camera.add(mesh);
  const place = () => {
    const dist = 150;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    mesh.position.set(-halfH * camera.aspect * 0.72, halfH * 0.74, -dist);
  };
  place();
  return place;
}

export function buildWorld(scene, camera, tex) {
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, WORLD.fogNear, WORLD.fogFar);
  ground(scene, tex.paper);
  tufts(scene);
  const people = cast(scene, tex);
  const pickups = drips(scene);
  const placeMoon = moon(camera, tex[MOON]);
  return { people, pickups, placeMoon };
}

export function animateWorld(world, t) {
  for (const p of world.people) {
    p.pivot.rotation.z = Math.sin(t * 0.9 + p.phase) * p.sway;
  }
  for (const d of world.pickups.children) {
    d.position.y = 0.35 + Math.sin(t * 3 + d.userData.phase) * 0.15;
  }
}

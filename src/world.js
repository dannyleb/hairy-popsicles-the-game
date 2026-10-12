import * as THREE from "three";
import { LEAN, PAPER, WORLD } from "./config.js";
import { DRIP_SPOTS, MOON, ROSTER } from "./roster.js";
import { createCutout, artMaterial } from "./cutout.js";
import { dripTexture, tuftTexture } from "./ink.js";
import { buildHedges } from "./gates.js";

const DRIP_RESPAWN = 20;

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

// Anything standing in the world that reacts to being slapped/watered.
function entity(cut, props) {
  return { ...cut, ...props, squash: 0, squashT: 0 };
}

function cast(scene, tex) {
  return ROSTER.map((c, i) => {
    const cut = createCutout(tex[c.sprite], c.height, { stick: c.stick });
    cut.root.position.set(c.at[0], 0, c.at[1]);
    scene.add(cut.root);
    return entity(cut, {
      ...c,
      kind: "person",
      radius: c.radius ?? Math.max(0.5, Math.min(cut.width, 2.5) * 0.35),
      phase: i * 1.7,
      sway: c.stick ? 0.05 : 0.02,
    });
  });
}

export function createItem(scene, kind, texture, height, x, z) {
  const cut = createCutout(texture, height);
  cut.root.position.set(x, 0, z);
  scene.add(cut.root);
  return entity(cut, { kind, height, radius: 0.5, carried: false });
}

function drips(scene) {
  const mat = new THREE.MeshBasicMaterial({ map: dripTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(0.55, 0.82);
  geo.translate(0, 0.41, 0);
  return DRIP_SPOTS.map(([x, z], i) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.3, z);
    mesh.rotation.x = LEAN;
    scene.add(mesh);
    return { mesh, phase: i, respawn: 0 };
  });
}

function moon(camera, tex) {
  const aspect = tex.image.width / tex.image.height;
  const h = 18;
  const mat = artMaterial(tex);
  mat.fog = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), mat);
  camera.add(mesh);
  return () => {
    const dist = 150;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    mesh.position.set(-halfH * camera.aspect * 0.72, halfH * 0.74, -dist);
  };
}

export function buildWorld(scene, camera, tex) {
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, WORLD.fogNear, WORLD.fogFar);
  ground(scene, tex.paper);
  tufts(scene);
  const people = cast(scene, tex);
  return {
    scene,
    people,
    byId: Object.fromEntries(people.map((p) => [p.id, p])),
    items: [],
    drips: drips(scene),
    gates: buildHedges(scene),
    placeMoon: moon(camera, tex[MOON]),
  };
}

export function squash(e, amount = 1) {
  e.squash = amount;
  e.squashT = 0;
}

export function animateWorld(world, t, dt) {
  const wobble = (e) => {
    if (e.squash > 0.01) {
      e.squashT += dt;
      e.squash *= Math.exp(-5 * dt);
      const s = e.squash * Math.cos(e.squashT * 28);
      e.pivot.scale.set(1 + s * 0.25, 1 - s * 0.22, 1);
    } else if (e.squash) {
      e.squash = 0;
      e.pivot.scale.set(1, 1, 1);
    }
  };
  for (const p of world.people) {
    p.pivot.rotation.z = Math.sin(t * 0.9 + p.phase) * p.sway;
    wobble(p);
  }
  for (const it of world.items) wobble(it);
  for (const d of world.drips) {
    if (d.respawn > 0) {
      d.respawn -= dt;
      if (d.respawn <= 0) d.mesh.visible = true;
      continue;
    }
    d.mesh.position.y = 0.35 + Math.sin(t * 3 + d.phase) * 0.15;
  }
}

// Returns how many drips the player walked into this frame.
export function collectDrips(world, pos, room) {
  let got = 0;
  for (const d of world.drips) {
    if (!d.mesh.visible || got >= room) continue;
    if (Math.hypot(pos.x - d.mesh.position.x, pos.z - d.mesh.position.z) < 1.1) {
      d.mesh.visible = false;
      d.respawn = DRIP_RESPAWN;
      got++;
    }
  }
  return got;
}

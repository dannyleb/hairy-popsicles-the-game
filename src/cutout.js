// A drawing standing in the world: the scanned art on an upright plane,
// optionally stuck on a popsicle stick, with a pen-hatched shadow on the
// ground. Everything pivots at the feet so it can sway and waddle.
import * as THREE from "three";
import { LEAN } from "./config.js";
import { shadowTexture, stickTexture } from "./ink.js";

let shared = null;
function sharedParts() {
  if (shared) return shared;
  shared = {
    stick: new THREE.MeshBasicMaterial({ map: stickTexture(), alphaTest: 0.5, side: THREE.DoubleSide }),
    shadow: new THREE.MeshBasicMaterial({
      map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.95,
      polygonOffset: true, polygonOffsetFactor: -2,
    }),
  };
  return shared;
}

function uprightPlane(width, height, material) {
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0);
  return new THREE.Mesh(geo, material);
}

export function artMaterial(tex) {
  return new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
}

export function createCutout(tex, height, { stick = false } = {}) {
  const parts = sharedParts();
  const aspect = tex.image.width / tex.image.height;
  const width = height * aspect;
  const stickH = stick ? height * 0.75 : 0;

  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.rotation.x = LEAN;
  root.add(pivot);

  if (stick) {
    const s = uprightPlane(height * 0.12, stickH + height * 0.25, parts.stick);
    s.position.z = -0.02;
    pivot.add(s);
  }

  const art = uprightPlane(width, height, artMaterial(tex));
  art.position.y = stickH;
  pivot.add(art);

  const sw = Math.max(1.2, Math.min(width, 3) * 0.9);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 0.38), parts.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(sw * 0.3, 0.02, 0.15);
  root.add(shadow);

  return { root, pivot, art, width, top: stickH + height };
}

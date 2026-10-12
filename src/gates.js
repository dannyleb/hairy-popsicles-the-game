// Hedges of hair. Permanent ones fence the edge of the page; the two gate
// hedges wither away when Toad has eaten enough.
import * as THREE from "three";
import { AREA, LEAN } from "./config.js";
import { hedgeTexture } from "./ink.js";

const GEO = (() => {
  const g = new THREE.PlaneGeometry(1.6, 2);
  g.translate(0, 1, 0);
  return g;
})();

function hedgeLine(scene, from, to, { height = 1, spacing = 0.45 } = {}) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.ceil(len / spacing);
  const mat = new THREE.MeshBasicMaterial({ map: hedgeTexture(), alphaTest: 0.4, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(GEO, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(LEAN, 0, 0));
  const p = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = (i + Math.random() * 0.8) / count;
    p.set(from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * 0.7, 0, from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * 0.7);
    const k = height * (0.75 + Math.random() * 0.6);
    s.set(k * (Math.random() < 0.5 ? -1 : 1), k, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  scene.add(mesh);
  return mesh;
}

export function buildHedges(scene) {
  const { minX, maxX, minZ, maxZ, hedgeX } = AREA;
  const e = 1.2;
  hedgeLine(scene, [minX - e, minZ - e], [maxX + e, minZ - e], { height: 1.4 });
  hedgeLine(scene, [minX - e, maxZ + e], [maxX + e, maxZ + e], { height: 0.45, spacing: 0.7 });
  hedgeLine(scene, [minX - e, minZ - e], [minX - e, maxZ + e], { height: 1.2 });
  hedgeLine(scene, [maxX + e, minZ - e], [maxX + e, maxZ + e], { height: 1.2 });

  const gate = (x) => {
    const mesh = hedgeLine(scene, [x, minZ - e], [x, maxZ + e], { height: 1.5, spacing: 0.35 });
    return { mesh, open: false, wither: 0 };
  };
  return { west: gate(-hedgeX), east: gate(hedgeX) };
}

export function openGate(gate) {
  gate.open = true;
}

export function updateGates(gates, dt) {
  for (const g of Object.values(gates)) {
    if (!g.open || !g.mesh.visible) continue;
    g.wither = Math.min(1, g.wither + dt / 1.6);
    g.mesh.scale.y = (1 - g.wither) * (1 + Math.sin(g.wither * 30) * 0.08);
    if (g.wither >= 1) g.mesh.visible = false;
  }
}

// How far the player may walk sideways, given which gates are open.
export function walkableX(gates, radius) {
  const { minX, maxX, hedgeX } = AREA;
  return [
    gates.west.open ? minX : -hedgeX + radius,
    gates.east.open ? maxX : hedgeX - radius,
  ];
}

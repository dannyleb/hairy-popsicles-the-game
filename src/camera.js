import * as THREE from "three";
import { CAMERA } from "./config.js";

const desired = new THREE.Vector3();
const look = new THREE.Vector3();

export function updateCamera(camera, target, dt) {
  desired.set(target.x, CAMERA.height, target.z + CAMERA.distance);
  camera.position.lerp(desired, dt < 0 ? 1 : 1 - Math.exp(-CAMERA.lerp * dt));
  look.set(camera.position.x, CAMERA.lookHeight, camera.position.z - CAMERA.distance);
  camera.lookAt(look);
}

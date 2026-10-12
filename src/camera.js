import * as THREE from "three";
import { CAMERA } from "./config.js";

const desired = new THREE.Vector3();

export function updateCamera(camera, player, dt) {
  const heading = player.userData.heading;
  desired.set(
    player.position.x - Math.sin(heading) * CAMERA.distance,
    CAMERA.height,
    player.position.z - Math.cos(heading) * CAMERA.distance,
  );
  const t = 1 - Math.exp(-CAMERA.lerp * dt);
  camera.position.lerp(desired, t);
  camera.lookAt(player.position.x, 1.4, player.position.z);
}

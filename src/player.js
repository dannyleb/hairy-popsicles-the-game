import * as THREE from "three";
import { PLAYER, SPAWN, WORLD } from "./config.js";

// Placeholder capsule-on-a-stick — swap for real character art later.
export function createPlayer() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.6, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2c200 }),
  );
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xff5fa0 }),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.4, 0.75);
  group.add(nose);

  group.position.set(SPAWN.player.x, 0, SPAWN.player.z);
  group.rotation.y = SPAWN.player.heading;
  group.userData.heading = SPAWN.player.heading;

  return group;
}

export function updatePlayer(player, input, dt) {
  if (input.moving) {
    const targetHeading = Math.atan2(input.x, -input.z) + Math.PI;
    let heading = player.userData.heading;
    let diff = ((targetHeading - heading + Math.PI) % (Math.PI * 2)) - Math.PI;
    heading += diff * Math.min(1, PLAYER.turnRate * dt);
    player.userData.heading = heading;
    player.rotation.y = heading;

    const speed = input.run ? PLAYER.runSpeed : PLAYER.speed;
    player.position.x += Math.sin(heading) * speed * dt;
    player.position.z += Math.cos(heading) * speed * dt;

    const b = WORLD.bounds - PLAYER.radius;
    player.position.x = Math.max(-b, Math.min(b, player.position.x));
    player.position.z = Math.max(-b, Math.min(b, player.position.z));
  }
}

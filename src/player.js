import { PLAYER, SPAWN, WORLD } from "./config.js";
import { createCutout } from "./cutout.js";

export function createPlayer(tex) {
  const cut = createCutout(tex, PLAYER.height);
  cut.root.position.set(SPAWN.player.x, 0, SPAWN.player.z);
  return { ...cut, walk: 0 };
}

// Screen-relative movement: up on the stick/keys walks into the page.
// The paper-puppet walk is a waddle and a hop.
export function updatePlayer(player, input, dt, people) {
  const pos = player.root.position;
  if (input.moving) {
    const speed = input.run ? PLAYER.runSpeed : PLAYER.speed;
    pos.x += input.x * speed * dt;
    pos.z += input.z * speed * dt;
    player.walk += dt * (input.run ? 16 : 11);
  } else {
    player.walk = 0;
  }

  for (const p of people) {
    const dx = pos.x - p.root.position.x, dz = pos.z - p.root.position.z;
    const min = p.radius + PLAYER.radius, d = Math.hypot(dx, dz);
    if (d < min && d > 1e-4) {
      pos.x = p.root.position.x + (dx / d) * min;
      pos.z = p.root.position.z + (dz / d) * min;
    }
  }

  const b = WORLD.bounds * 0.9;
  pos.x = Math.max(-b, Math.min(b, pos.x));
  pos.z = Math.max(-b, Math.min(b, pos.z));

  player.pivot.rotation.z = input.moving ? Math.sin(player.walk) * 0.12 : 0;
  player.pivot.position.y = input.moving ? Math.abs(Math.sin(player.walk)) * 0.18 : 0;
}

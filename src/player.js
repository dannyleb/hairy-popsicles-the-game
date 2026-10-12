import { AREA, PLAYER, SPAWN } from "./config.js";
import { createCutout } from "./cutout.js";
import { walkableX } from "./gates.js";

export function createPlayer(tex) {
  const cut = createCutout(tex, PLAYER.height);
  cut.root.position.set(SPAWN.player.x, 0, SPAWN.player.z);
  return { ...cut, walk: 0, lunge: 0 };
}

// Screen-relative movement: up on the stick/keys walks into the page.
// The paper-puppet walk is a waddle and a hop; a slap is a quick lunge.
export function updatePlayer(player, input, dt, people, gates) {
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

  const [minX, maxX] = walkableX(gates, PLAYER.radius);
  pos.x = Math.max(minX, Math.min(maxX, pos.x));
  pos.z = Math.max(AREA.minZ, Math.min(AREA.maxZ, pos.z));

  let tilt = input.moving ? Math.sin(player.walk) * 0.12 : 0;
  if (player.lunge > 0) {
    player.lunge = Math.max(0, player.lunge - dt);
    tilt += Math.sin((player.lunge / 0.25) * Math.PI) * -0.45;
  }
  player.pivot.rotation.z = tilt;
  player.pivot.position.y = input.moving ? Math.abs(Math.sin(player.walk)) * 0.18 : 0;
}

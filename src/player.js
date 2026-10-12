import { AREA, DEPTH, PLAYER, SPAWN } from "./config.js";
import { makeEntity } from "./world.js";
import { walkableX } from "./gates.js";

export function createPlayer(img) {
  return { ...makeEntity(img, PLAYER.height, SPAWN.x, SPAWN.g, { kind: "player", radius: PLAYER.radius }), walk: 0, lunge: 0 };
}

// Left/right walks across the page, up/down walks into/out of it.
// The paper-puppet walk is a waddle and a hop; a slap is a quick lunge.
export function updatePlayer(player, input, dt, people, gates) {
  if (input.moving) {
    const speed = input.run ? PLAYER.runSpeed : PLAYER.speed;
    player.x += input.x * speed * dt;
    player.g += input.z * speed * PLAYER.depthSpeed * dt;
    player.walk += dt * (input.run ? 16 : 11);
  } else {
    player.walk = 0;
  }

  for (const p of people) {
    const dx = player.x - p.x, dg = (player.g - p.g) * DEPTH;
    const min = p.radius + PLAYER.radius, d = Math.hypot(dx, dg);
    if (d < min && d > 1e-4) {
      player.x = p.x + (dx / d) * min;
      player.g = p.g + (dg / d) * min / DEPTH;
    }
  }

  const [minX, maxX] = walkableX(gates, PLAYER.radius);
  player.x = Math.max(minX, Math.min(maxX, player.x));
  player.g = Math.max(0.4, Math.min(AREA.front, player.g));

  let tilt = input.moving ? Math.sin(player.walk) * 0.12 : 0;
  if (player.lunge > 0) {
    player.lunge = Math.max(0, player.lunge - dt);
    tilt += Math.sin((player.lunge / 0.25) * Math.PI) * -0.45;
  }
  player.rot = tilt;
  player.lift = input.moving ? Math.abs(Math.sin(player.walk)) * 0.18 : 0;
}

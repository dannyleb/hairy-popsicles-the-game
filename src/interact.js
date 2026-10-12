// The three verbs, Good Time Garden style:
//   Slap  (Space)  whack whoever is nearest
//   Grab  (E)      pick up / drop / feed Toad / talk
//   Water (Q)      splash from your can (refill by walking into drips)
import * as THREE from "three";
import { CAN_SIZE, LEAN, REACH } from "./config.js";
import { collectDrips, squash } from "./world.js";
import { dripTexture } from "./ink.js";
import { sfx } from "./sfx.js";

const flatDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createInteractions({ world, player, hud, story }) {
  const scene = world.scene;
  let carrying = null;
  let can = 0;
  const flying = [];
  const sprayMat = new THREE.MeshBasicMaterial({ map: dripTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  const sprayGeo = new THREE.PlaneGeometry(0.22, 0.32);

  hud.setCan(can, CAN_SIZE);

  function nearest(list, extra = 0) {
    const p = player.root.position;
    let best = null, bestD = Infinity;
    for (const e of list) {
      if (e.carried || e.hop || e.eaten) continue;
      const d = flatDist(p, e.root.position) - e.radius;
      if (d < REACH + extra && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  const nearToad = () => flatDist(player.root.position, story.toad.root.position) - story.toad.radius < REACH + 1;

  function say(target, line) {
    if (line) hud.say(target, line);
  }

  function slap() {
    const target = nearest([...world.people, ...world.items]);
    player.lunge = 0.25;
    if (!target) return;
    sfx.slap();
    squash(target, 1);
    hud.burst("SLAP!", target);
    say(target, story.slap(target));
  }

  function water() {
    if (can <= 0) {
      hud.toast("Your can is empty. Walk into some drips.");
      return;
    }
    can--;
    hud.setCan(can, CAN_SIZE);
    sfx.splash();
    const target = nearest([...world.people, ...world.items], 1);
    const from = player.root.position.clone().setY(player.top * 0.8);
    const to = target ? target.root.position.clone().setY(target.top * 0.6) : from.clone().add(new THREE.Vector3(0, -1.5, -2.5));
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(sprayGeo, sprayMat);
      m.rotation.x = LEAN;
      scene.add(m);
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4);
      flying.push({ mesh: m, from, to: to.clone().add(jitter), t: -i * 0.04, dur: 0.45, arc: 1.2 });
    }
    if (target) {
      setTimeout(() => {
        squash(target, 0.5);
        say(target, story.water(target));
      }, 450);
    }
  }

  function grab() {
    if (carrying) {
      const item = carrying;
      if (nearToad() && story.edible(item)) {
        carrying = null;
        item.eaten = true;
        const mouth = story.toad.root.position.clone().add(new THREE.Vector3(0.4, story.toad.top * 0.45, 0.3));
        flying.push({
          mesh: item.root, from: item.root.position.clone(), to: mouth, t: 0, dur: 0.6, arc: 2,
          shrink: true,
          done: () => {
            scene.remove(item.root);
            world.items.splice(world.items.indexOf(item), 1);
            say(story.toad, story.fed(item));
          },
        });
        return;
      }
      carrying = null;
      item.carried = false;
      const p = player.root.position;
      item.root.position.set(p.x + 0.9, 0, p.z + 0.4);
      squash(item, 0.6);
      sfx.grab();
      return;
    }

    const item = nearest(world.items);
    if (item) {
      const no = story.refuseGrab(item);
      if (no) { say(item, no); return; }
      carrying = item;
      item.carried = true;
      sfx.grab();
      return;
    }

    const person = nearest(world.people, 0.5);
    if (person) {
      sfx.grunt();
      say(person, story.talk(person));
    }
  }

  function updateFlying(dt) {
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt;
      const k = Math.max(0, Math.min(1, f.t / f.dur));
      f.mesh.position.lerpVectors(f.from, f.to, k);
      f.mesh.position.y += Math.sin(k * Math.PI) * f.arc;
      if (f.shrink) f.mesh.scale.setScalar(1 - k * 0.8);
      if (k >= 1) {
        if (f.done) f.done();
        else scene.remove(f.mesh);
        flying.splice(i, 1);
      }
    }
  }

  return {
    update(input, dt) {
      const got = collectDrips(world, player.root.position, CAN_SIZE - can);
      if (got) {
        can += got;
        hud.setCan(can, CAN_SIZE);
        sfx.drip();
      }

      if (input.slap) slap();
      if (input.water) water();
      if (input.grab) grab();

      if (carrying) {
        const p = player.root.position;
        carrying.root.position.set(p.x, player.top + 0.1 + player.pivot.position.y, p.z + 0.05);
      }
      updateFlying(dt);

      const prompt = carrying
        ? (nearToad() && story.edible(carrying) ? "FEED TOAD" : "DROP")
        : nearest(world.items) ? "GRAB" : nearest(world.people, 0.5) ? "TALK" : "";
      hud.setPrompt(prompt);
    },
  };
}

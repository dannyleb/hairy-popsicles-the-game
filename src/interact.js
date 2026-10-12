// The three verbs, Good Time Garden style:
//   Slap  (Space)  whack whoever is nearest
//   Grab  (E)      pick up / drop / feed Toad / talk
//   Water (Q)      splash from your can (refill by walking into drips)
import { CAN_SIZE, REACH } from "./config.js";
import { collectDrips, floorDist, makeEntity, popPimple, squash } from "./world.js";
import { dripTexture } from "./ink.js";
import { sfx } from "./sfx.js";

const SPRAY = dripTexture();

export function createInteractions({ world, player, hud, story, pus }) {
  let carrying = null;
  let can = 0;
  const flying = [];

  hud.setCan(can, CAN_SIZE);

  function nearest(list, extra = 0) {
    let best = null, bestD = Infinity;
    for (const e of list) {
      if (e.carried || e.hop || e.eaten) continue;
      const d = floorDist(player, e) - e.radius;
      if (d < REACH + extra && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  const nearToad = () => floorDist(player, story.toad) - story.toad.radius < REACH + 1;

  function say(target, line) {
    if (line) hud.say(target, line);
  }

  function fly(e, to, dur, arc, done) {
    flying.push({ e, from: { x: e.x, g: e.g, lift: e.lift }, to, t: 0, dur, arc, done });
  }

  function slap() {
    player.lunge = 0.25;
    // Characters and items win unless a pimple is clearly closer.
    const who = nearest([...world.people, ...world.items]);
    const zit = nearest(world.pimples.filter((p) => p.kind === "pimple"));
    const gap = (e) => floorDist(player, e) - e.radius;
    const target = zit && (!who || gap(zit) < gap(who) - 0.6) ? zit : who;
    if (!target) return;
    if (target.kind === "pimple") {
      sfx.bubble(0.6 + target.h);
      hud.burst("POP!", target);
      pus.burst(target);
      popPimple(target);
      squash(target, 1.2);
      return;
    }
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
    const to = target
      ? { x: target.x, g: target.g + 0.05, lift: target.top * 0.6 }
      : { x: player.x + 2.5, g: player.g, lift: 0 };
    for (let i = 0; i < 7; i++) {
      const d = makeEntity(SPRAY, 0.32, player.x + 0.3, player.g, { shadow: false, kind: "spray" });
      d.lift = player.top * 0.8;
      world.fx.push(d);
      fly(d, { x: to.x + (Math.random() - 0.5) * 0.8, g: to.g, lift: to.lift + (Math.random() - 0.5) * 0.6 }, 0.45, 1.2, () => {
        world.fx.splice(world.fx.indexOf(d), 1);
      });
      flying[flying.length - 1].t = -i * 0.04;
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
        item.carried = false;
        item.eaten = true;
        const toad = story.toad;
        fly(item, { x: toad.x + 0.4, g: toad.g + 0.01, lift: toad.top * 0.45 }, 0.6, 2, () => {
          world.items.splice(world.items.indexOf(item), 1);
          say(toad, story.fed(item));
        });
        flying[flying.length - 1].shrink = true;
        return;
      }
      carrying = null;
      item.carried = false;
      item.x = player.x + 0.9;
      item.g = player.g + 0.15;
      item.lift = 0;
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
      f.e.x = f.from.x + (f.to.x - f.from.x) * k;
      f.e.g = f.from.g + (f.to.g - f.from.g) * k;
      f.e.lift = f.from.lift + (f.to.lift - f.from.lift) * k + Math.sin(k * Math.PI) * f.arc;
      if (f.shrink) f.e.scale = 1 - k * 0.8;
      if (k >= 1) {
        flying.splice(i, 1);
        if (f.done) f.done();
      }
    }
  }

  return {
    get carrying() { return carrying; },

    update(input, dt) {
      const got = collectDrips(world, player, CAN_SIZE - can);
      if (got) {
        can += got;
        hud.setCan(can, CAN_SIZE);
        sfx.drip();
      }

      if (input.slap) slap();
      if (input.water) water();
      if (input.grab) grab();

      if (carrying) {
        carrying.x = player.x;
        carrying.g = player.g;
        carrying.lift = player.top + 0.1 + player.lift;
      }
      updateFlying(dt);

      const prompt = carrying
        ? (nearToad() && story.edible(carrying) ? "FEED TOAD" : "DROP")
        : nearest(world.items) ? "GRAB" : nearest(world.people, 0.5) ? "TALK" : "";
      hud.setPrompt(prompt);
    },
  };
}

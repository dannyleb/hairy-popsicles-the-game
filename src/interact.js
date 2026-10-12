// The three verbs, Good Time Garden style:
//   Slap  (Space)  whack whoever is nearest, swat a fly, or pop a pimple
//   Grab  (E)      feed Toad / pick up / drop / talk / swat / pop
//   Water (Q)      splash from your can (refill by walking into drips)
//   Tap/click a pimple to walk over and pop it
// Crumbs, hairs and dead flies go in your pockets just by walking over them
// (scraps.js); E next to Toad feeds him everything in your pockets.
import { CAN_SIZE, DEPTH, REACH } from "./config.js";
import { collectDrips, floorDist, makeEntity, popPimple, squash } from "./world.js";
import { dripTexture } from "./ink.js";
import { sfx } from "./sfx.js";

const SPRAY = dripTexture();

export function createInteractions({ world, player, hud, story, pus, scraps }) {
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

  function pop(zit) {
    sfx.bubble(0.6 + zit.h);
    hud.burst("POP!", zit);
    pus.burst(zit);
    popPimple(zit);
    squash(zit, 1.2);
  }

  const nearestZit = () => nearest(world.pimples.filter((p) => p.kind === "pimple"));

  function swat(f) {
    player.lunge = 0.25;
    sfx.swat();
    scraps.swat(f);
  }

  function slap() {
    player.lunge = 0.25;
    // Characters and items win unless a fly or pimple is clearly closer.
    const gap = (e) => floorDist(player, e) - e.radius;
    let target = nearest([...world.people, ...world.items]);
    const f = scraps.swatTarget(REACH);
    if (f && (!target || gap(f) < gap(target) - 0.3)) target = f;
    const zit = nearestZit();
    if (zit && (!target || gap(zit) < gap(target) - 0.6)) target = zit;
    if (!target) return;
    if (target.kind === "pimple") {
      pop(target);
      return;
    }
    if (target.kind === "fly") {
      swat(target);
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

  // Empty your pockets into Toad: each scrap arcs into his mouth.
  function feedPockets() {
    const toad = story.toad;
    const items = scraps.takeAll();
    hud.setPockets(0);
    items.forEach((kind, i) => {
      const e = makeEntity(scraps.picture(kind), kind === "fly" ? 0.8 : 0.6, player.x, player.g, { shadow: false, kind: "food" });
      e.lift = player.top * 0.7;
      world.fx.push(e);
      fly(e, { x: toad.x + 0.4, g: toad.g + 0.01, lift: toad.top * 0.45 }, 0.5, 1.6, () => {
        world.fx.splice(world.fx.indexOf(e), 1);
        sfx.gulp();
        say(toad, story.eat(kind));
      });
      const f = flying[flying.length - 1];
      f.t = -i * 0.14;
      f.shrink = true;
    });
  }

  function grab() {
    if (!carrying && nearToad() && scraps.pockets.length) {
      feedPockets();
      return;
    }
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
      return;
    }

    const f = scraps.swatTarget(REACH - 0.6);
    if (f) {
      swat(f);
      return;
    }

    const zit = nearestZit();
    if (zit) {
      player.lunge = 0.25;
      pop(zit);
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

  // Tap/click to move: walk to a spot, or walk to a thing and use it.
  let walkTo = null;
  function goTo(x, g, target = null, act = null) {
    walkTo = { x, g, target, act, best: Infinity, stall: 0 };
    world.tapMark = { x, g, t: 0 };
  }

  // Where to stand to use `e`, and how close counts as arrived.
  function standFor(e) {
    if (e.kind === "pimple") return [e.x - 0.7, e.g + 0.15, 1.1];
    if (e.kind === "fly") return [e.x - 0.6, e.g, 1.4];
    if (world.items.includes(e)) return [e.x, e.g + 0.1, 0.6];
    const side = player.x < e.x ? -1 : 1;
    return [e.x + side * (e.radius + 0.6), e.g + 0.3, REACH * 0.7];
  }

  function act(w) {
    const e = w.target;
    if (w.act === "pop") { if (e.kind === "pimple") { player.lunge = 0.25; pop(e); } return; }
    if (w.act === "swat") { if (!e.dead && !e.gone) swat(e); return; }
    if (w.act === "grab") { grab(); return; }
    if (w.act === "talk") {
      if (e === story.toad) { grab(); return; }
      sfx.grunt();
      say(e, story.talk(e));
    }
  }

  // e: what was tapped (or null for open ground); x, g: the floor spot.
  function tap(e, x, g) {
    if (!e) return goTo(x, g);
    const [sx, sg] = standFor(e);
    if (e.kind === "pimple") return goTo(sx, sg, e, "pop");
    if (e.kind === "fly" && !e.dead) return goTo(sx, sg, e, "swat");
    if (world.items.includes(e)) return goTo(sx, sg, e, "grab");
    if (e === story.toad || world.people.includes(e)) return goTo(sx, sg, e, "talk");
    goTo(e.x, e.g);
  }

  // Turns a pending walk into movement input; real input cancels it.
  function steer(input, dt) {
    if (!walkTo) return input;
    if (input.moving) { walkTo = null; return input; }
    const w = walkTo, e = w.target;
    let reach = 0.3;
    if (e) {
      if ((w.act === "pop" && e.kind !== "pimple") || e.gone || (w.act === "swat" && e.dead)) { walkTo = null; return input; }
      [w.x, w.g, reach] = standFor(e);
    }
    const dx = w.x - player.x, dg = w.g - player.g;
    const d = Math.hypot(dx, dg * DEPTH);
    const near = e ? floorDist(player, e) - (e.radius || 0) < reach : d < reach;
    if (d < w.best - 0.02) { w.best = d; w.stall = 0; } else w.stall += dt;
    if (near || d < 0.25 || w.stall > 0.6) {
      walkTo = null;
      if (e && (near || floorDist(player, e) - (e.radius || 0) < REACH)) act(w);
      return input;
    }
    const len = Math.hypot(dx, dg * 2) || 1;
    return { ...input, x: dx / len, z: (dg * 2) / len, moving: true, run: d > 6 };
  }

  return {
    get carrying() { return carrying; },
    tap,
    steer,

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
        : nearToad() && scraps.pockets.length ? `FEED TOAD (${scraps.pockets.length})`
        : nearest(world.items) ? "GRAB" : nearest(world.people, 0.5) ? "TALK"
        : scraps.swatTarget(REACH - 0.6) ? "SWAT" : nearestZit() ? "POP" : "";
      hud.setPrompt(prompt);
    },
  };
}

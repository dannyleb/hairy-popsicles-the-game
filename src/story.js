// The puzzle chain, Good Time Garden style: Toad is always hungry, every
// meal opens up more of the page.
//
//   1. Slap Pimples until what's inside him pops out. Feed it to Toad.
//      -> the west hedge withers.
//   2. Roast is too dry to eat. Water him (drips fill your can). Feed him.
//      -> the east hedge withers.
//   3. Slap Big Eye's loose eye out. Feed it to Toad. He's full. For now.
//
// All dialogue here is placeholder.
import { GRUNTS } from "./roster.js";
import { openGate } from "./gates.js";
import { createItem, squash } from "./world.js";
import { sfx } from "./sfx.js";

const PIMPLE_SLAPS = 3;
const EYE_SLAPS = 2;
const ROAST_WATER = 4;

const STEPS = {
  blob: { title: "Toad is starving", sub: "Find him something to eat." },
  roast: { title: "Toad wants a roast", sub: "A juicy one. Try the west." },
  eyeball: { title: "Toad wants dessert", sub: "Something round and wet. Try the east." },
  done: { title: "Toad is full", sub: "For now." },
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createStory({ world, hud, tex, eyeballTex }) {
  const s = { step: "blob", pimpleSlaps: 0, eyeSlaps: 0, roastWater: 0, talk: {}, hungryCooldown: 2 };
  const { byId, scene } = world;
  const toad = byId.toad;

  // Roast is food, not a bystander: move him from the cast to the items.
  const roastP = byId.roast;
  world.people.splice(world.people.indexOf(roastP), 1);
  const roast = { ...roastP, kind: "roast", juicy: false, carried: false };
  world.items.push(roast);

  function setStep(step) {
    s.step = step;
    hud.setObjective(STEPS[step].title, STEPS[step].sub);
  }

  function popOut(kind, texture, height, from, dx) {
    const item = createItem(scene, kind, texture, height, from.root.position.x + dx, from.root.position.z + 1.6);
    item.hop = { t: 0, y: from.top * 0.6 };
    world.items.push(item);
    squash(item, 1.2);
    return item;
  }

  const lines = (p) => {
    if (!p.lines) return null;
    const i = s.talk[p.id] ?? 0;
    s.talk[p.id] = (i + 1) % p.lines.length;
    return p.lines[i];
  };

  return {
    start() { setStep("blob"); },
    get done() { return s.step === "done"; },

    toad,
    edible: (item) => ["blob", "roast", "eyeball"].includes(item.kind),

    talk(p) {
      if (p === toad) return s.step === "done" ? "...full." : pick(["HUNGRY.", "feed me.", "FOOOOD.", "*stomach noise*"]);
      if (p.kind === "roast") return p.juicy ? "I'm ready." : "so... dry...";
      if (p.id === "pimples" && s.pimpleSlaps >= PIMPLE_SLAPS) return "I feel lighter. Thanks.";
      if (p.id === "bigeye" && s.eyeSlaps >= EYE_SLAPS) return "I can see half as much and I'm happier.";
      return lines(p) ?? pick(GRUNTS);
    },

    slap(target) {
      if (target === toad) return "FEED ME.";
      if (target.kind === "roast") return "ow.";
      if (target.kind === "blob" || target.kind === "eyeball") return null;
      if (target.id === "pimples" && s.pimpleSlaps < PIMPLE_SLAPS) {
        s.pimpleSlaps++;
        if (s.pimpleSlaps < PIMPLE_SLAPS) return ["OW.", "it's... moving..."][s.pimpleSlaps - 1];
        sfx.splort();
        hud.burst("SPLORT!", target);
        popOut("blob", tex.blob, 0.9, target, 1.4);
        return "oh thank god.";
      }
      if (target.id === "bigeye" && s.eyeSlaps < EYE_SLAPS) {
        s.eyeSlaps++;
        if (s.eyeSlaps < EYE_SLAPS) return "Do that again. I dare you.";
        sfx.pop();
        hud.burst("POP!", target);
        popOut("eyeball", eyeballTex, 0.75, target, -1.3);
        return "...worth it.";
      }
      return pick(GRUNTS);
    },

    water(target) {
      if (target.kind === "roast" && !target.juicy) {
        s.roastWater++;
        if (s.roastWater < ROAST_WATER) return ["ahh.", "more...", "MORE."][Math.min(2, s.roastWater - 1)];
        target.juicy = true;
        hud.burst("JUICY!", target);
        hud.setObjective(STEPS.roast.title, "He's juicy now. Bring him to Toad.");
        return "I'm ready.";
      }
      if (target === toad) return "*gargle*";
      return pick(["*sputter*", "thanks, I guess.", "now I'm wet.", "*drip*"]);
    },

    // Returns a refusal line, or null if it can be picked up.
    refuseGrab(item) {
      if (item.kind === "roast" && !item.juicy) return "Too dry. Toad would choke.";
      return null;
    },

    fed(item) {
      sfx.gulp();
      setTimeout(() => sfx.burp(), 450);
      squash(toad, 1.6);
      if (item.kind === "blob") {
        openGate(world.gates.west);
        sfx.rustle();
        setStep("roast");
        hud.toast("The hair to the west fell out.");
      } else if (item.kind === "roast") {
        openGate(world.gates.east);
        sfx.rustle();
        setStep("eyeball");
        hud.toast("The hair to the east fell out.");
      } else if (item.kind === "eyeball") {
        setStep("done");
        setTimeout(() => hud.showEnd(), 1600);
      }
      return "*BUUURP*";
    },

    update(dt, playerPos) {
      for (const it of world.items) {
        if (!it.hop) continue;
        it.hop.t += dt * 1.8;
        const k = Math.min(1, it.hop.t);
        it.root.position.y = it.hop.y * (1 - k) + Math.sin(k * Math.PI) * 1.5;
        if (k >= 1) { it.root.position.y = 0; it.hop = null; }
      }
      if (s.step === "done") return;
      s.hungryCooldown -= dt;
      const near = Math.hypot(playerPos.x - toad.root.position.x, playerPos.z - toad.root.position.z) < 9;
      if (near && s.hungryCooldown <= 0) {
        hud.say(toad, pick(["HUNGRY.", "feed me.", "hhhungry."]));
        s.hungryCooldown = 7;
      }
    },
  };
}

// Toad is always hungry. Fill his belly (crumbs, hairs, flies from your
// pockets, or a big meal carried over) and he's full for a moment: he burps,
// the next hair wall evaporates, and his appetite comes back bigger.
// See STAGES in config.js.
//
// Big meals, worth a lot:
//   - Slap Pimples until what's growing in him pops out.
//   - Roast is too dry to eat; water him until he's juicy.
//   - Slap Big Eye's loose eye out.
//
// All dialogue here is placeholder.
import { FOOD, STAGES } from "./config.js";
import { GRUNTS } from "./roster.js";
import { openGate } from "./gates.js";
import { createItem, floorDist, squash } from "./world.js";
import { sfx } from "./sfx.js";

const PIMPLE_SLAPS = 3;
const EYE_SLAPS = 2;
const ROAST_WATER = 4;
const BIG = ["blob", "roast", "eyeball"];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createStory({ world, hud, img, eyeballImg, onOpen }) {
  const s = { stage: 0, belly: 0, done: false, pimpleSlaps: 0, eyeSlaps: 0, roastWater: 0, talk: {}, hungryCooldown: 2, note: 0 };
  const { byId } = world;
  const toad = byId.toad;

  // Roast is food, not a bystander: move him from the cast to the items.
  const roastP = byId.roast;
  world.people.splice(world.people.indexOf(roastP), 1);
  const roast = { ...roastP, kind: "roast", juicy: false, carried: false };
  world.items.push(roast);

  const goal = () => STAGES[s.stage].goal;

  function showObjective() {
    if (s.done) {
      hud.setObjective("Toad is full", "For now.");
    } else if (s.note > 0) {
      return;
    } else {
      hud.setObjective("Feed Toad", "Crumbs, hairs, flies, anything.");
    }
    hud.setBelly(s.done ? 1 : s.belly / goal(), s.done ? "" : `${s.belly}/${goal()}`);
  }

  function popOut(kind, image, height, from, dx) {
    const item = createItem(world, kind, image, height, from.x + dx, from.g + 0.6);
    item.hop = { t: 0, y: from.top * 0.6 };
    squash(item, 1.2);
    return item;
  }

  const lines = (p) => {
    if (!p.lines) return null;
    const i = s.talk[p.id] ?? 0;
    s.talk[p.id] = (i + 1) % p.lines.length;
    return p.lines[i];
  };

  function full() {
    const stage = STAGES[s.stage];
    setTimeout(() => sfx.burp(), 350);
    squash(toad, 2);
    if (!stage.opens) {
      s.done = true;
      showObjective();
      setTimeout(() => hud.showEnd(), 1600);
      return;
    }
    const gate = world.gates[stage.opens];
    openGate(gate);
    sfx.rustle();
    s.stage++;
    s.belly = 0;
    s.note = 5;
    hud.setObjective("Toad is full!", `The hair wall to ${stage.zone} evaporated. Go explore.`);
    hud.setBelly(1, "FULL");
    if (onOpen) onOpen(gate, stage);
  }

  // Add food to Toad's belly. Returns what he says.
  function eat(kind) {
    if (s.done) return null;
    s.belly += FOOD[kind] || 1;
    squash(toad, 0.6 + Math.min(1, (FOOD[kind] || 1) / 6));
    if (s.belly >= goal()) {
      full();
      return "*BUUUURP*";
    }
    showObjective();
    return null;
  }

  return {
    start() { showObjective(); },
    get done() { return s.done; },
    get stage() { return s.stage; },
    get belly() { return s.belly; },

    toad,
    edible: (item) => BIG.includes(item.kind),
    eat,

    talk(p) {
      if (p === toad) return s.done ? "...full." : pick(["HUNGRY.", "feed me.", "FOOOOD.", "*stomach noise*", "more."]);
      if (p.kind === "roast") return p.juicy ? "I'm ready." : "so... dry...";
      if (p.id === "pimples" && s.pimpleSlaps >= PIMPLE_SLAPS) return "I feel lighter. Thanks.";
      if (p.id === "bigeye" && s.eyeSlaps >= EYE_SLAPS) return "I can see half as much and I'm happier.";
      return lines(p) ?? pick(GRUNTS);
    },

    slap(target) {
      if (target === toad) return "FEED ME.";
      if (target.kind === "roast") return "ow.";
      if (BIG.includes(target.kind)) return null;
      if (target.id === "pimples" && s.pimpleSlaps < PIMPLE_SLAPS) {
        s.pimpleSlaps++;
        if (s.pimpleSlaps < PIMPLE_SLAPS) return ["OW.", "it's... moving..."][s.pimpleSlaps - 1];
        sfx.splort();
        hud.burst("SPLORT!", target);
        popOut("blob", img.blob, 0.9, target, 1.4);
        return "oh thank god.";
      }
      if (target.id === "bigeye" && s.eyeSlaps < EYE_SLAPS) {
        s.eyeSlaps++;
        if (s.eyeSlaps < EYE_SLAPS) return "Do that again. I dare you.";
        sfx.pop();
        hud.burst("POP!", target);
        popOut("eyeball", eyeballImg, 0.75, target, -1.3);
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
        hud.toast("Roast is juicy. Toad would love him.");
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

    // A big meal arrived in Toad's mouth.
    fed(item) {
      sfx.gulp();
      return eat(item.kind) ?? "*GULP*";
    },

    update(dt, player) {
      for (const it of world.items) {
        if (!it.hop) continue;
        it.hop.t += dt * 1.8;
        const k = Math.min(1, it.hop.t);
        it.lift = it.hop.y * (1 - k) + Math.sin(k * Math.PI) * 1.5;
        if (k >= 1) { it.lift = 0; it.hop = null; }
      }
      if (s.note > 0) {
        s.note -= dt;
        if (s.note <= 0) {
          showObjective();
          hud.say(toad, "...hungry again.");
        }
      }
      if (s.done) return;
      s.hungryCooldown -= dt;
      if (floorDist(player, toad) < 9 && s.hungryCooldown <= 0) {
        hud.say(toad, pick(["HUNGRY.", "feed me.", "hhhungry.", "bring me crumbs."]));
        s.hungryCooldown = 8;
      }
    },
  };
}

// Toad is always hungry. Fill his belly (crumbs, hairs, flies from your
// pockets, or a big meal carried over) and he's full: he burps, the next hair
// wall evaporates, and he waddles home to sleep it off. While he digests he
// won't eat (your pockets stay full). Then his appetite comes back bigger.
// After the last stage he's done with the story, but still wakes up for
// seconds now and then, worth pus each time. See STAGES in config.js.
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
const DIGEST = 25;          // seconds asleep after each stage
const DIGEST_SECONDS = 50;  // seconds asleep between helpings of seconds
const SECONDS_PUS = 25;     // pus for filling him up again after the story

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Toad's craving of the day: one scrap counts double, the same all day.
export function cravingFor(dateStr) {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ["crumb", "pube", "fly"][h % 3];
}
const CRAVE_NAME = { crumb: "crumbs", pube: "hairs", fly: "flies" };

export function createStory({ world, hud, img, eyeballImg, onOpen, onEvent = () => {}, progress, craving }) {
  const s = { stage: 0, belly: 0, done: false, digest: 0, digestFor: 1, pimpleSlaps: 0, eyeSlaps: 0, roastWater: 0, talk: {}, hungryCooldown: 2, snoreIn: 0 };
  const { byId } = world;
  const toad = byId.toad;

  // Roast is food, not a bystander: move him from the cast to the items.
  const roastP = byId.roast;
  world.people.splice(world.people.indexOf(roastP), 1);
  const roast = { ...roastP, kind: "roast", juicy: false, carried: false };
  world.items.push(roast);

  const goal = () => STAGES[s.stage].goal;

  let zoneNote = "";
  function showObjective() {
    if (s.digest > 0) {
      hud.setObjective("Toad is full", zoneNote || "He's sleeping it off. He'll want seconds.");
      hud.setBelly(s.digest / s.digestFor, "zzz");
      return;
    }
    hud.setObjective("Feed Toad", `${s.done ? "Seconds? " : ""}Today he craves ${CRAVE_NAME[craving]} (x2).`);
    hud.setBelly(s.belly / goal(), `${s.belly}/${goal()}`);
  }

  function sleep(seconds) {
    s.digest = s.digestFor = seconds;
    s.belly = 0;
    s.snoreIn = 2.5;
    toad.goal = [...toad.home];
    showObjective();
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
    toad.fat = 1.25;
    toad.deflate = true;
    progress.add("toadFills");
    if (!stage.opens) {
      zoneNote = "";
      progress.add("fullFeeds");
      if (!s.done) {
        s.done = true;
        onEvent("fedUp");
        setTimeout(() => hud.showEnd(), 1600);
      } else {
        progress.addPus(SECONDS_PUS);
        hud.setPus(progress.pus, true);
        hud.banner("SECONDS", "Toad is full again", `+${SECONDS_PUS} pus`);
      }
      sleep(DIGEST_SECONDS);
      return;
    }
    const gate = world.gates[stage.opens];
    openGate(gate);
    progress.add("zones");
    sfx.rustle();
    s.stage++;
    zoneNote = `The hair wall to ${stage.zone} evaporated. Go explore.`;
    sleep(DIGEST);
    if (onOpen) onOpen(gate, stage);
  }

  // Add food to Toad's belly. Returns what he says.
  function eat(kind) {
    if (s.digest > 0) return null;
    const worth = (FOOD[kind] || 1) * (kind === craving ? 2 : 1);
    s.belly += worth;
    if (kind === craving) hud.floatText("x2", toad, "#f1c56c");
    toad.fat = Math.min(1, s.belly / goal());
    squash(toad, 0.6 + Math.min(1, worth / 6));
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
    // False while he's full and sleeping it off: he won't eat.
    get hungry() { return s.digest <= 0; },
    get stage() { return s.stage; },
    get belly() { return s.belly; },

    toad,
    edible: (item) => BIG.includes(item.kind) && s.digest <= 0,
    eat,

    talk(p) {
      if (p === toad) return s.digest > 0 ? pick(["...full. let me sleep.", "zzz... no more...", "*snore*"]) : pick(["HUNGRY.", "feed me.", "FOOOOD.", "*stomach noise*", "more."]);
      if (p.kind === "roast") return p.juicy ? "I'm ready." : "so... dry...";
      if (p.id === "pimples" && s.pimpleSlaps >= PIMPLE_SLAPS) return "I feel lighter. Thanks.";
      if (p.id === "bigeye" && s.eyeSlaps >= EYE_SLAPS) return "I can see half as much and I'm happier.";
      return lines(p) ?? pick(GRUNTS);
    },

    slap(target) {
      if (target === toad) return s.digest > 0 ? "*snort* ...what." : "FEED ME.";
      if (target.kind === "roast") return "ow.";
      if (BIG.includes(target.kind)) return null;
      if (target.id === "pimples" && s.pimpleSlaps < PIMPLE_SLAPS) {
        s.pimpleSlaps++;
        if (s.pimpleSlaps < PIMPLE_SLAPS) return ["OW.", "it's... moving..."][s.pimpleSlaps - 1];
        sfx.splort();
        hud.burst("SPLORT!", target);
        popOut("blob", img.blob, 0.9, target, 1.4);
        onEvent("blob");
        return "oh thank god.";
      }
      if (target.id === "bigeye" && s.eyeSlaps < EYE_SLAPS) {
        s.eyeSlaps++;
        if (s.eyeSlaps < EYE_SLAPS) return "Do that again. I dare you.";
        sfx.pop();
        hud.burst("POP!", target);
        popOut("eyeball", eyeballImg, 0.75, target, -1.3);
        onEvent("eyeball");
        return "...worth it.";
      }
      return pick(GRUNTS);
    },

    water(target) {
      if (target.kind === "roast" && !target.juicy) {
        s.roastWater++;
        if (s.roastWater < ROAST_WATER) return ["ahh.", "more...", "MORE."][Math.min(2, s.roastWater - 1)];
        target.juicy = true;
        onEvent("juicy");
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
      // Toad swells as he eats; after a full meal he deflates back down.
      const fat = toad.fat || 0;
      toad.scale += (1 + Math.min(fat, 1.25) * 0.2 - toad.scale) * Math.min(1, dt * 3);
      if (toad.deflate) {
        toad.fat = Math.max(s.belly / goal(), fat - dt * 0.4);
        if (toad.fat <= s.belly / goal()) toad.deflate = false;
      }
      for (const it of world.items) {
        if (!it.hop) continue;
        it.hop.t += dt * 1.8;
        const k = Math.min(1, it.hop.t);
        it.lift = it.hop.y * (1 - k) + Math.sin(k * Math.PI) * 1.5;
        if (k >= 1) { it.lift = 0; it.hop = null; }
      }
      if (s.digest > 0) {
        s.digest = Math.max(0, s.digest - dt);
        hud.setBelly(s.digest / s.digestFor, "zzz");
        s.snoreIn -= dt;
        if (s.snoreIn <= 0 && floorDist(player, toad) < 12) { hud.say(toad, pick(["zzz...", "*snore*", "zzzz...", "*gurgle* zzz"])); s.snoreIn = 7; }
        if (s.digest <= 0) {
          zoneNote = "";
          showObjective();
          squash(toad, 1);
          hud.say(toad, "...hungry again.");
          s.hungryCooldown = 8;
        }
        return;
      }
      s.hungryCooldown -= dt;
      if (floorDist(player, toad) < 9 && s.hungryCooldown <= 0) {
        hud.say(toad, pick(["HUNGRY.", "feed me.", "hhhungry.", "bring me crumbs."]));
        s.hungryCooldown = 8;
      }
    },
  };
}

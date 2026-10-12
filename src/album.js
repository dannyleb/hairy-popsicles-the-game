// The Self-Portrait Album. Every character has a page that starts as a
// silhouette. Do the small, gross thing they want and the page fills in
// with the original pencil drawing (and the artist's note, from
// album-notes.js). The last page, Antenna (you), fills in when every other
// page has.
//
// Want types:
//   talk n        talk to them n times
//   nightTalk     talk to them after dark
//   slap n        slap them n times
//   water n       water them n times
//   nightWater    water them after dark
//   give kind n   bring them n of a scrap (from your pockets, with E)
//   pops n        pop n pimples near them
//   pay n         pay them n pus points (talk to them when you have it)
//   event name    something that happens in the story
import { ROSTER } from "./roster.js";
import { floorDist } from "./world.js";
import { sfx } from "./sfx.js";

const REWARD = 15; // pus points per page

export const PAGES = [
  { id: "toad", want: { type: "event", event: "fedUp", text: "Fill Toad all the way up." } },
  { id: "pimples", want: { type: "event", event: "blob", text: "Get out whatever's been growing in him." } },
  { id: "melter", want: { type: "water", n: 3, text: "Cool him down: water him 3 times." } },
  { id: "weeper", want: { type: "talk", n: 3, text: "Keep him company: talk to him 3 times." } },
  { id: "stubble", want: { type: "give", kind: "pube", n: 3, text: "Bring him 3 hairs. He's not picky." } },
  { id: "screamer", want: { type: "slap", n: 2, text: "Snap him out of it: slap him twice." } },
  { id: "shiv", want: { type: "give", kind: "crumb", n: 2, text: "Bring him 2 crumbs. Him, not Toad." } },
  { id: "roast", want: { type: "event", event: "juicy", text: "Water him until he's juicy." } },
  { id: "conehead", want: { type: "pops", n: 5, text: "Pop 5 pimples near him. It helps him smile." } },
  { id: "mirror", want: { type: "nightWater", text: "Water him after dark, so he can finally see himself." } },
  { id: "tendrils", want: { type: "give", kind: "pube", n: 5, text: "Bring him 5 more strands." } },
  { id: "redeye", want: { type: "event", event: "redeye", text: "Find him. He only comes out at night." } },
  { id: "balloon", want: { type: "give", kind: "fly", n: 1, text: "Bring him a fly to tie to his string." } },
  { id: "littleguy", want: { type: "talk", n: 5, text: "Say hi. A lot. (5 times)" } },
  { id: "bigeye", want: { type: "event", event: "eyeball", text: "Knock his loose eye out." } },
  { id: "leprechaun", want: { type: "pay", n: 30, text: "Pay him 30 pus points." } },
  { id: "droopy", want: { type: "water", n: 2, text: "Perk him up: water him twice." } },
  { id: "bricks", want: { type: "slap", n: 3, text: "Knock some sense into him: 3 slaps." } },
  { id: "snoot", want: { type: "give", kind: "fly", n: 2, text: "Let him smell 2 flies." } },
  { id: "fairy", want: { type: "nightTalk", text: "Make a wish with her after dark." } },
  { id: "sweats", want: { type: "water", n: 4, text: "Help him cool off: water him 4 times." } },
  { id: "antenna", want: { type: "all", text: "Fill every other page." } },
];

const roster = Object.fromEntries(ROSTER.map((c) => [c.id, c]));
for (const p of PAGES) {
  const c = roster[p.id];
  p.name = c ? c.name : "Antenna (you)";
  p.sprite = c ? c.sprite : "antenna";
  p.scan = p.sprite.replace(/-\d+$/, "");
}
const byId = Object.fromEntries(PAGES.map((p) => [p.id, p]));
export const wantOf = (id) => byId[id] && byId[id].want;

export function createAlbum({ progress, hud, world, player, isNight }) {
  function complete(id) {
    if (!progress.unlockPage(id)) return;
    const page = byId[id];
    progress.addPus(REWARD);
    hud.setPus(progress.pus, true);
    hud.banner("ALBUM PAGE", page.name, `+${REWARD} pus`);
    if (hud.onAlbumNews) hud.onAlbumNews();
    sfx.chime();
    if (id !== "antenna" && PAGES.every((p) => p.id === "antenna" || progress.hasPage(p.id))) {
      setTimeout(() => complete("antenna"), 2200);
    }
  }

  function bump(p, n = 1) {
    const want = wantOf(p.id);
    const count = progress.bumpWant(p.id, n);
    if (count >= (want.n || 1)) complete(p.id);
    else hud.floatText(`${count}/${want.n}`, p, "#f5e3a1");
  }

  const open = (p) => p && byId[p.id] && !progress.hasPage(p.id);

  return {
    // Returns a line to say instead of the usual one, or null.
    onTalk(p) {
      if (p.id === "mirror" && isNight()) progress.add("mirrorNight");
      if (!open(p)) return null;
      const want = wantOf(p.id);
      if (want.type === "talk") bump(p);
      else if (want.type === "nightTalk" && isNight()) { complete(p.id); return "...thank you."; }
      else if (want.type === "pay") {
        if (progress.spendPus(want.n)) { hud.setPus(progress.pus, true); complete(p.id); return "Pleasure doing business."; }
        return `${want.n} pus. I'm not a charity.`;
      }
      return null;
    },
    onSlap(p) {
      if (open(p) && wantOf(p.id).type === "slap") bump(p);
    },
    onWater(p) {
      if (!open(p)) return;
      const want = wantOf(p.id);
      if (want.type === "water") bump(p);
      else if (want.type === "nightWater" && isNight()) complete(p.id);
    },
    // The scrap kind this person wants from your pockets, if any.
    wants(p, pockets) {
      if (!open(p)) return null;
      const want = wantOf(p.id);
      return want.type === "give" && pockets.includes(want.kind) ? want.kind : null;
    },
    onGive(p) { bump(p); },
    onPop(zit) {
      for (const p of world.people) {
        if (open(p) && wantOf(p.id).type === "pops" && floorDist(zit, p) < 6) bump(p);
      }
    },
    onEvent(name) {
      for (const page of PAGES) {
        if (page.want.type === "event" && page.want.event === name) complete(page.id);
      }
    },
    update() {
      const r = world.byId.redeye;
      if (r && r.out && floorDist(player, r) < 4 && !progress.hasPage("redeye")) {
        progress.add("metRedeye");
        hud.say(r, "...you can see me?");
        complete("redeye");
      }
    },
  };
}

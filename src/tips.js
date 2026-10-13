// A gentle tutorial: short tips that show up the first time they're useful,
// one at a time, and never again once seen (saved with progress). Tips about
// cards, achievements and the shop point at the menu button and make it
// pulse, and the row they're about pulses inside the menu (go:), so players
// find Mirror's shop and the album themselves. Talking to someone whose card you haven't earned also tells you,
// once per visit, what they want.
import { wantOf } from "./album.js";
import { ITEMS, maxOf, priceOf } from "./shop.js";
import { ACHIEVEMENTS } from "./progress.js";

const FIRST = 5;      // seconds of play before the first tip
const GAP = 14;       // seconds between tips
const SHOW = 11;      // seconds a tip stays up (unless it's done sooner)
const FULL_FOR = 4;   // seconds of full pockets before the pockets tip

export function createTips({ progress, hud, story, scraps, upgrades, isNight, world, player, guide = () => {} }) {
  const touch = () => document.documentElement.classList.contains("touch");
  const viewed = new Set();   // menu screens looked at this visit
  const told = new Set();     // whose wants you've been told this visit
  let elapsed = 0, since = GAP, fullFor = 0, current = null, shownFor = 0, talkedToWanter = false;

  const pocketsFull = () => scraps.used() >= upgrades().pockets;
  const pocketsItem = ITEMS.find((i) => i.id === "pockets");
  const canAffordPockets = () => {
    const lvl = progress.owns("pockets");
    return lvl < maxOf(pocketsItem) && progress.pus >= priceOf(pocketsItem, lvl);
  };
  // Can you buy anything at all yet?
  const canShop = () => ITEMS.some((it) => {
    const lvl = progress.owns(it.id);
    return lvl < maxOf(it) && progress.pus >= priceOf(it, lvl);
  });

  // In order of priority. when: show it now? done: it's served its purpose.
  const TIPS = [
    {
      id: "pickup",
      when: () => !scraps.pockets.length && story.stage === 0 && story.belly === 0 && story.hungry,
      done: () => scraps.pockets.length > 0 || story.belly > 0,
      text: () => "Toad eats crumbs, curly hairs and flies. Walk over them to stuff your pockets. Rare toenails and mouse droppings take more room but he loves them.",
    },
    {
      id: "feed",
      when: () => scraps.pockets.length >= 4 && story.stage === 0 && story.belly === 0 && story.hungry,
      done: () => story.belly > 0 || story.stage > 0,
      text: () => (touch() ? "Tap Toad to feed him what's in your pockets." : "Walk up to Toad and press E to feed him what's in your pockets."),
    },
    {
      id: "pocketsFull",
      when: () => fullFor >= FULL_FOR,
      done: () => !pocketsFull() || viewed.has("shop"),
      menu: true,
      go: () => (canAffordPockets() ? "shop" : null),
      text: () => (canAffordPockets()
        ? "Pockets full! You've got enough pus for bigger ones at Mirror's shop, in the menu."
        : story.hungry
          ? "Pockets full! Feed Toad to empty them. Bigger pockets cost pus at Mirror's shop, in the menu."
          : "Pockets full, and Toad's asleep. Give scraps to people who want them, or get bigger pockets at Mirror's shop."),
    },
    {
      id: "pop",
      when: () => elapsed > 40 && progress.stat("pops") === 0,
      done: () => progress.stat("pops") > 0,
      text: () => (touch()
        ? "See the swollen pimples? Tap one to pop it. The pus is money."
        : "See the swollen pimples? Click one (or walk up and press E) to pop it. The pus is money."),
    },
    {
      id: "card",
      when: () => progress.pageCount() > 0,
      done: () => viewed.has("album:pages"),
      menu: true,
      go: () => "album",
      text: () => "You earned your first card! It's in your Self-Portrait Album, in the menu.",
    },
    {
      id: "achievement",
      when: () => progress.achievementCount() > 0,
      done: () => viewed.has("album:achievements"),
      menu: true,
      go: () => "achievements",
      text: () => `Achievement unlocked. There are ${ACHIEVEMENTS.length}. See them all in the menu.`,
    },
    {
      id: "shop",
      when: () => canShop() && progress.stat("bought") === 0,
      done: () => viewed.has("shop"),
      menu: true,
      go: () => "shop",
      text: () => `You've got ${progress.pus} pus! Open the menu and visit Mirror's shop: bigger pockets, a pus magnet, faster feet, things to wear.`,
    },
    {
      id: "wants",
      when: () => talkedToWanter,
      done: () => false,
      text: () => "Everyone wants something. Do it and you earn their card for your album.",
    },
    {
      id: "wart",
      when: () => world.warts.some((w) => Math.abs(w.x - player.x) < 8),
      done: () => !world.warts.length,
      text: () => "A giant wart! Slap it. Keep slapping. Something good is in there.",
    },
    {
      id: "sleep",
      when: () => !story.hungry && story.stage > 0,
      done: () => story.hungry,
      text: () => "Toad's sleeping it off. Go explore the new ground while he digests.",
    },
    {
      id: "night",
      when: () => isNight(),
      done: () => !isNight(),
      text: () => "It's getting dark. Someone around here only comes out at night.",
    },
    {
      id: "menu",
      when: () => elapsed > 150 && !viewed.size,
      done: () => viewed.size > 0,
      menu: true,
      text: () => "Your cards, achievements and Mirror's shop live in this menu.",
    },
  ];

  function show(tip) {
    current = tip;
    shownFor = 0;
    progress.markTip(tip.id);
    hud.tip(tip.text(), !!tip.menu);
    if (tip.go && tip.go()) guide(tip.go());
  }
  function hide() {
    if (!current) return;
    current = null;
    since = 0;
    hud.hideTip();
  }
  document.getElementById("tipClose").addEventListener("click", hide);

  return {
    update(dt) {
      elapsed += dt;
      since += dt;
      fullFor = pocketsFull() ? fullFor + dt : 0;
      if (current) {
        shownFor += dt;
        if (current.done() || shownFor > SHOW) hide();
        return;
      }
      if (elapsed < FIRST || since < GAP) return;
      const tip = TIPS.find((t) => !progress.tipSeen(t.id) && t.when() && !t.done());
      if (tip) show(tip);
    },

    // The menu reports what you looked at ("pause", "shop", "album:<tab>").
    onView(mode, tab) {
      viewed.add(tab ? `${mode}:${tab}` : mode);
    },

    // After someone talks: tell what they want for their card, once a visit.
    onTalk(p) {
      const want = wantOf(p.id);
      if (!want || want.type === "all" || progress.hasPage(p.id) || told.has(p.id)) return;
      told.add(p.id);
      talkedToWanter = true;
      hud.toast(`${p.name} wants: ${want.text}`, 4500);
    },
  };
}

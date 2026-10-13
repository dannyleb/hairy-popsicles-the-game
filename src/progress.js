// Everything that carries over between visits, saved in the browser:
// pus points, lifetime stats, achievements, album pages, curios, shop
// purchases and visit days. Nothing here punishes you for missing a day.
import { PAGES } from "./album.js";
import { CURIOS } from "./ink.js";

const KEY = "hairy-popsicles-progress-v1";
const HALF_ALBUM = Math.floor(PAGES.length / 2);
const OLD_PUS_KEY = "hairy-popsicles-pus";

export const ACHIEVEMENTS = [
  { id: "firstPop", name: "First Squeeze", text: "Pop your first pimple.", stat: "pops", goal: 1 },
  { id: "pop100", name: "Pop Culture", text: "Pop 100 pimples.", stat: "pops", goal: 100 },
  { id: "combo10", name: "Picking Season", text: "Pop 10 pimples in one combo.", stat: "maxCombo", goal: 10 },
  { id: "golden", name: "Golden Child", text: "Pop a golden whitehead.", stat: "golden", goal: 1 },
  { id: "flies50", name: "Lord of the Flies", text: "Swat 50 flies.", stat: "flies", goal: 50 },
  { id: "hairs100", name: "Hair Apparent", text: "Pocket 100 hairs.", stat: "hairs", goal: 100 },
  { id: "crumbs100", name: "Crumb Bum", text: "Pocket 100 crumbs.", stat: "crumbs", goal: 100 },
  { id: "nightSweats", name: "Night Sweats", text: "Collect 20 drops after dark.", stat: "nightDrops", goal: 20 },
  { id: "zones", name: "Skin in the Game", text: "Open every part of the page.", stat: "zones", goal: 2 },
  { id: "fedUp", name: "Fed Up", text: "Fill Toad all the way up.", stat: "fullFeeds", goal: 1 },
  { id: "mirrorNight", name: "Face Your Reflection", text: "Talk to Mirror at night.", stat: "mirrorNight", goal: 1 },
  { id: "nightOwl", name: "Night Owl", text: "Meet Red Eye. He only comes out at night.", stat: "metRedeye", goal: 1 },
  { id: "album11", name: "Halfway Into Your Own Skin", text: `Collect ${HALF_ALBUM} cards.`, stat: "pages", goal: HALF_ALBUM },
  { id: "albumAll", name: "Comfortable in Your Own Skin", text: "Collect every card.", stat: "pages", goal: PAGES.length },
  { id: "curiosAll", name: "Collector of Leftovers", text: "Find every curio.", stat: "curios", goal: CURIOS.length },
  { id: "pus1000", name: "Pus Baron", text: "Collect 1,000 pus points in total.", stat: "pusTotal", goal: 1000 },
  { id: "shop", name: "Treat Yourself", text: "Buy something from Mirror.", stat: "bought", goal: 1 },
  { id: "regular", name: "Regular", text: "Play on 5 different days.", stat: "days", goal: 5 },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function blank() {
  return { pus: 0, stats: {}, achievements: {}, pages: {}, wants: {}, curios: {}, owned: {}, equipped: {}, tips: {}, lastVisit: null };
}

// A save from an older build (or a mangled one) is merged over a blank save
// field by field, keeping only values of the right type.
function fromSave(saved) {
  const s = blank();
  if (!saved || typeof saved !== "object") return s;
  for (const k of Object.keys(s)) {
    const v = saved[k], want = s[k];
    if (want && typeof want === "object") { if (v && typeof v === "object" && !Array.isArray(v)) s[k] = v; }
    else if (k === "pus") { if (Number.isFinite(v) && v >= 0) s[k] = v; }
    else if (typeof v === "string") s[k] = v;
  }
  return s;
}

export function createProgress() {
  let s = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = fromSave(JSON.parse(raw));
    else {
      const old = parseInt(localStorage.getItem(OLD_PUS_KEY), 10);
      if (old > 0) { s.pus = old; s.stats.pusTotal = old; }
    }
    // The toenail curio became a kidney stone (toenails are Toad food now).
    if (s.curios.toenail) { s.curios.stone = (s.curios.stone || 0) + s.curios.toenail; delete s.curios.toenail; }
  } catch {}

  // Saves are batched (many small changes per second while playing); flush()
  // writes right away and runs when the page is hidden or closed.
  let saveTimer = 0, dirty = false, wiped = false;
  const flush = () => {
    clearTimeout(saveTimer);
    if (!dirty || wiped) return;
    dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  };
  const save = () => {
    if (wiped) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  const listeners = [];
  const emit = (type, data) => listeners.forEach((fn) => fn(type, data));

  function check() {
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      if ((s.stats[a.stat] || 0) >= a.goal) {
        s.achievements[a.id] = Date.now();
        emit("achievement", a);
      }
    }
  }

  const api = {
    on(fn) { listeners.push(fn); },
    get pus() { return s.pus; },
    stat: (k) => s.stats[k] || 0,
    add(k, n = 1) { s.stats[k] = (s.stats[k] || 0) + n; check(); save(); },
    max(k, v) { if (v > (s.stats[k] || 0)) { s.stats[k] = v; check(); save(); } },
    addPus(n) { s.pus += n; s.stats.pusTotal = (s.stats.pusTotal || 0) + n; check(); save(); emit("pus", s.pus); },
    spendPus(n) { if (s.pus < n) return false; s.pus -= n; save(); return true; },

    // Album.
    hasPage: (id) => !!s.pages[id],
    pageCount: () => Object.keys(s.pages).length,
    unlockPage(id) {
      if (s.pages[id]) return false;
      s.pages[id] = Date.now();
      s.stats.pages = Object.keys(s.pages).length;
      check(); save();
      emit("card", id);
      return true;
    },
    wantCount: (id) => s.wants[id] || 0,
    bumpWant(id, n = 1) { s.wants[id] = (s.wants[id] || 0) + n; save(); return s.wants[id]; },
    lastPage() {
      let best = null, t = 0;
      for (const [id, at] of Object.entries(s.pages)) if (at > t) { t = at; best = id; }
      return best;
    },

    // Curios.
    hasCurio: (id) => !!s.curios[id],
    addCurio(id) {
      const fresh = !s.curios[id];
      s.curios[id] = (s.curios[id] || 0) + 1;
      s.stats.curios = Object.keys(s.curios).length;
      check(); save();
      if (fresh) emit("curio", id);
      return fresh;
    },

    // Tutorial tips: each one is shown once, ever.
    tipSeen: (id) => !!s.tips[id],
    markTip(id) { s.tips[id] = Date.now(); save(); },

    // Shop.
    owns: (id) => s.owned[id] || 0,
    buy(id) { s.owned[id] = (s.owned[id] || 0) + 1; s.stats.bought = (s.stats.bought || 0) + 1; check(); save(); },
    equipped: (id) => !!s.equipped[id],
    toggle(id) { s.equipped[id] = !s.equipped[id]; save(); },

    achieved: (id) => !!s.achievements[id],
    achievementCount: () => Object.keys(s.achievements).length,

    // Anything worth keeping? (Visit days alone don't count.)
    hasProgress: () => s.pus > 0 || ["pages", "achievements", "owned", "curios"].some((k) => Object.keys(s[k]).length > 0)
      || ["pops", "talks", "toadFills"].some((k) => (s.stats[k] || 0) > 0),

    // New player: forget everything (the caller reloads the page).
    reset() {
      clearTimeout(saveTimer);
      wiped = true;
      s = blank();
      try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_PUS_KEY); } catch {}
    },

    // Called once per load: counts a new visit day and returns a gift.
    visit() {
      const d = today();
      if (s.lastVisit === d) return 0;
      s.lastVisit = d;
      s.stats.days = (s.stats.days || 0) + 1;
      const gift = s.stats.days === 1 ? 0 : 10 + 2 * Math.min(s.stats.days - 1, 10);
      if (gift) s.pus += gift;
      check(); save();
      return gift;
    },
    today,
  };
  return api;
}

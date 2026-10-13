// Everything that carries over between visits, saved in the browser:
// pus points, lifetime stats, achievements, album pages, curios, shop
// purchases and visit days. Nothing here punishes you for missing a day.
const KEY = "hairy-popsicles-progress-v1";
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
  { id: "album11", name: "Halfway Into Your Own Skin", text: "Collect 11 cards.", stat: "pages", goal: 11 },
  { id: "albumAll", name: "Comfortable in Your Own Skin", text: "Collect every card.", stat: "pages", goal: 22 },
  { id: "curiosAll", name: "Collector of Leftovers", text: "Find every curio.", stat: "curios", goal: 8 },
  { id: "pus1000", name: "Pus Baron", text: "Collect 1,000 pus points in total.", stat: "pusTotal", goal: 1000 },
  { id: "shop", name: "Treat Yourself", text: "Buy something from Mirror.", stat: "bought", goal: 1 },
  { id: "regular", name: "Regular", text: "Play on 5 different days.", stat: "days", goal: 5 },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function blank() {
  return { pus: 0, stats: {}, achievements: {}, pages: {}, wants: {}, curios: {}, owned: {}, equipped: {}, lastVisit: null };
}

export function createProgress() {
  let s = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...JSON.parse(raw) };
    else {
      const old = parseInt(localStorage.getItem(OLD_PUS_KEY), 10);
      if (old > 0) { s.pus = old; s.stats.pusTotal = old; }
    }
  } catch {}

  let saveTimer = 0;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, 250);
  };
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
    addPus(n) { s.pus += n; s.stats.pusTotal = (s.stats.pusTotal || 0) + n; check(); save(); },
    spendPus(n) { if (s.pus < n) return false; s.pus -= n; save(); return true; },

    // Album.
    hasPage: (id) => !!s.pages[id],
    pageCount: () => Object.keys(s.pages).length,
    unlockPage(id) {
      if (s.pages[id]) return false;
      s.pages[id] = Date.now();
      s.stats.pages = Object.keys(s.pages).length;
      check(); save();
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
    addCurio(id) { const fresh = !s.curios[id]; s.curios[id] = (s.curios[id] || 0) + 1; s.stats.curios = Object.keys(s.curios).length; check(); save(); return fresh; },

    // Shop.
    owns: (id) => s.owned[id] || 0,
    buy(id) { s.owned[id] = (s.owned[id] || 0) + 1; s.stats.bought = (s.stats.bought || 0) + 1; check(); save(); },
    equipped: (id) => !!s.equipped[id],
    toggle(id) { s.equipped[id] = !s.equipped[id]; save(); },

    achieved: (id) => !!s.achievements[id],
    achievementCount: () => Object.keys(s.achievements).length,

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

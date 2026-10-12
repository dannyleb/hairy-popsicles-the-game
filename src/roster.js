import { PLAYER } from "./config.js";

// Everyone drawn so far. `sprite` is a file in assets/sprites/ (made by
// `npm run sprites` from assets/concept/). Names and lines are working
// placeholders.
//
//   height  world units, feet to top of the drawing
//   stick   true = a floating head, mounted on a popsicle stick
//   at      [x, g]: x across the page (hub -15..15, west < -16, east > 16),
//           g depth on the floor (0 = back at the horizon, 8 = front)
//   lines   what they say when you press E on them
//   speakAt height of their speech bubble, if not the top of the drawing
export const ROSTER = [
  // Hub: Toad's corner.
  { id: "toad", name: "Toad", sprite: "toad", height: 5.5, at: [0, 1.8], radius: 2.6, speakAt: 3.6 },
  { id: "pimples", name: "Pimples", sprite: "pimples", height: 3.6, at: [-8, 4.5],
    lines: ["Don't look at my face.", "Something's been growing in there for weeks.", "It's ripe. I can feel it."] },
  { id: "melter", name: "Melter", sprite: "melter", height: 2.4, stick: true, at: [9, 4.7] },
  { id: "weeper", name: "Weeper", sprite: "weeper", height: 2.5, stick: true, at: [-11, 2.5] },
  { id: "stubble", name: "Stubble", sprite: "stubble", height: 2.5, stick: true, at: [11, 2.6] },
  { id: "screamer", name: "Screamer", sprite: "screamer", height: 2.6, stick: true, at: [7, 0.6] },
  { id: "shiv", name: "Shiv", sprite: "shiv", height: 4.2, at: [-6, 0.6] },

  // West.
  { id: "roast", name: "Roast", sprite: "roast", height: 1.8, at: [-31, 3.8], radius: 1.2 },
  { id: "conehead", name: "Conehead", sprite: "conehead", height: 2.8, stick: true, at: [-23, 5.1] },
  { id: "mirror", name: "Mirror", sprite: "mirror", height: 2.8, stick: true, at: [-40, 1.8] },
  { id: "tendrils", name: "Tendrils", sprite: "tendrils", height: 2.2, stick: true, at: [-22, 1.5] },
  { id: "redeye", name: "Red Eye", sprite: "redeye", height: 2.4, stick: true, at: [-43, 5.1] },
  { id: "balloon", name: "Balloon Man", sprite: "balloon-gang", height: 4.2, at: [-30, 6.8] },
  { id: "littleguy", name: "Little Guy", sprite: "balloon-gang-2", height: 2.2, at: [-38, 7.0] },

  // East.
  { id: "bigeye", name: "Big Eye", sprite: "bigeye", height: 2.6, stick: true, at: [32, 3.5],
    lines: ["What are YOU looking at?", "This eye's been loose since Tuesday."] },
  { id: "leprechaun", name: "Leprechaun", sprite: "leprechaun", height: 2.8, stick: true, at: [24, 5.1] },
  { id: "droopy", name: "Droopy", sprite: "droopy", height: 2.8, stick: true, at: [40, 1.6] },
  { id: "bricks", name: "Bricks", sprite: "bricks", height: 3.6, at: [22, 1.1] },
  { id: "snoot", name: "Snoot", sprite: "snoot", height: 3.4, at: [43, 4.9] },
  { id: "fairy", name: "Fairy", sprite: "fairy", height: 3.6, at: [30, 6.7] },
  { id: "sweats", name: "Sweats", sprite: "sweats", height: 3.0, stick: true, at: [37, 0.4] },
];

// What everyone else says when poked or slapped.
export const GRUNTS = ["hhhnnngh.", "*drip*", "...", "go away.", "hrrk.", "mm.", "don't.", "*wet noise*"];

// Blue drips: tears and sweat off the cast. They fill your watering can.
export const DRIP_SPOTS = [
  [-3, 6.5], [5, 7.0], [-12, 5.8], [13, 6.0], [3, 3.6],
  [-20, 7.0], [-26, 2.9], [-37, 4.1], [-44, 7.3], [-28, 0.9],
];

// Not people: the moon from Snoot's page hangs in the sky.
export const MOON = "snoot-2";
export const BLOB = "balloon-gang-3";

export const SPRITES = [...new Set([...ROSTER.map((c) => c.sprite), MOON, BLOB, PLAYER.sprite])];

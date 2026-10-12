import { PLAYER } from "./config.js";

// Everyone drawn so far. `sprite` is a file in assets/sprites/ (made by
// `npm run sprites` from assets/concept/). Names and lines are working
// placeholders.
//
//   height  world units, base to top of the drawing
//   stick   true = a floating head, mounted on a popsicle stick
//   at      [x, z]. Hub is x -15..15, west zone x < -16, east zone x > 16
//   lines   what they say when you press E on them
//   speakAt height of their speech bubble, if not the top of the drawing
export const ROSTER = [
  // Hub: Toad's corner.
  { id: "toad", name: "Toad", sprite: "toad", height: 5.5, at: [0, -21], radius: 2.6, speakAt: 3.6 },
  { id: "pimples", name: "Pimples", sprite: "pimples", height: 3.6, at: [-8, -6],
    lines: ["Don't look at my face.", "Something's been growing in there for weeks.", "It's ripe. I can feel it."] },
  { id: "melter", name: "Melter", sprite: "melter", height: 2.4, stick: true, at: [9, -5] },
  { id: "weeper", name: "Weeper", sprite: "weeper", height: 2.5, stick: true, at: [-12, -17] },
  { id: "stubble", name: "Stubble", sprite: "stubble", height: 2.5, stick: true, at: [12, -16] },
  { id: "screamer", name: "Screamer", sprite: "screamer", height: 2.6, stick: true, at: [7, -28] },
  { id: "shiv", name: "Shiv", sprite: "shiv", height: 4.2, at: [-7, -28] },

  // West.
  { id: "roast", name: "Roast", sprite: "roast", height: 1.8, at: [-31, -10], radius: 1.2 },
  { id: "conehead", name: "Conehead", sprite: "conehead", height: 2.8, stick: true, at: [-23, -3] },
  { id: "mirror", name: "Mirror", sprite: "mirror", height: 2.8, stick: true, at: [-40, -21] },
  { id: "tendrils", name: "Tendrils", sprite: "tendrils", height: 2.2, stick: true, at: [-22, -23] },
  { id: "redeye", name: "Red Eye", sprite: "redeye", height: 2.4, stick: true, at: [-43, -3] },
  { id: "balloon", name: "Balloon Man", sprite: "balloon-gang", height: 4.2, at: [-30, 5] },
  { id: "littleguy", name: "Little Guy", sprite: "balloon-gang-2", height: 2.2, at: [-38, 7] },

  // East.
  { id: "bigeye", name: "Big Eye", sprite: "bigeye", height: 2.6, stick: true, at: [32, -12],
    lines: ["What are YOU looking at?", "This eye's been loose since Tuesday."] },
  { id: "leprechaun", name: "Leprechaun", sprite: "leprechaun", height: 2.8, stick: true, at: [24, -3] },
  { id: "droopy", name: "Droopy", sprite: "droopy", height: 2.8, stick: true, at: [40, -22] },
  { id: "bricks", name: "Bricks", sprite: "bricks", height: 3.6, at: [22, -25] },
  { id: "snoot", name: "Snoot", sprite: "snoot", height: 3.4, at: [43, -4] },
  { id: "fairy", name: "Fairy", sprite: "fairy", height: 3.6, at: [30, 5] },
  { id: "sweats", name: "Sweats", sprite: "sweats", height: 3.0, stick: true, at: [37, -29] },
];

// What everyone else says when poked or slapped.
export const GRUNTS = ["hhhnnngh.", "*drip*", "...", "go away.", "hrrk.", "mm.", "don't.", "*wet noise*"];

// Blue drips: tears and sweat off the cast. They fill your watering can.
export const DRIP_SPOTS = [
  [-3, 5], [5, 7], [-12, 1], [13, 2], [3, -11],
  [-20, 7], [-26, -15], [-37, -9], [-44, 9], [-28, -26],
];

// Not people: the moon from Snoot's page hangs in the sky.
export const MOON = "snoot-2";
export const BLOB = "balloon-gang-3";

export const SPRITES = [...new Set([...ROSTER.map((c) => c.sprite), MOON, BLOB, PLAYER.sprite])];

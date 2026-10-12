import { PLAYER } from "./config.js";

// Everyone drawn so far. `sprite` is a file in assets/sprites/ (made by
// `npm run sprites` from assets/concept/). Names are working titles.
//
//   height  world units, base to top of the drawing
//   stick   true = a floating head, mounted on a popsicle stick
//   at      [x, z] where they stand in the field
export const ROSTER = [
  { id: "melter", name: "Melter", sprite: "melter", height: 2.4, stick: true, at: [-6, -4] },
  { id: "shiv", name: "Shiv", sprite: "shiv", height: 4.2, at: [7, -6] },
  { id: "pimples", name: "Pimples", sprite: "pimples", height: 3.6, at: [-13, -14] },
  { id: "weeper", name: "Weeper", sprite: "weeper", height: 2.5, stick: true, at: [14, -15] },
  { id: "redeye", name: "Red Eye", sprite: "redeye", height: 2.4, stick: true, at: [-20, -2] },
  { id: "bigeye", name: "Big Eye", sprite: "bigeye", height: 2.5, stick: true, at: [21, -3] },
  { id: "stubble", name: "Stubble", sprite: "stubble", height: 2.5, stick: true, at: [-4, -22] },
  { id: "sweats", name: "Sweats", sprite: "sweats", height: 3.0, stick: true, at: [6, -27] },
  { id: "conehead", name: "Conehead", sprite: "conehead", height: 2.8, stick: true, at: [-24, -20] },
  { id: "mirror", name: "Mirror", sprite: "mirror", height: 2.8, stick: true, at: [26, -22] },
  { id: "tendrils", name: "Tendrils", sprite: "tendrils", height: 2.2, stick: true, at: [-30, -8] },
  { id: "snoot", name: "Snoot", sprite: "snoot", height: 3.4, at: [31, -9] },
  { id: "screamer", name: "Screamer", sprite: "screamer", height: 2.6, stick: true, at: [-16, -32] },
  { id: "droopy", name: "Droopy", sprite: "droopy", height: 2.8, stick: true, at: [17, -34] },
  { id: "bricks", name: "Bricks", sprite: "bricks", height: 3.6, at: [-35, -26] },
  { id: "leprechaun", name: "Leprechaun", sprite: "leprechaun", height: 2.8, stick: true, at: [36, -30] },
  { id: "balloon", name: "Balloon Man", sprite: "balloon-gang", height: 4.4, at: [-9, 10] },
  { id: "littleguy", name: "Little Guy", sprite: "balloon-gang-2", height: 2.0, at: [11, 9] },
  { id: "blob", name: "Blob", sprite: "balloon-gang-3", height: 0.9, at: [3, 14] },
  { id: "fairy", name: "Fairy", sprite: "fairy", height: 3.6, at: [-22, 14] },
  { id: "roast", name: "Roast", sprite: "roast", height: 1.8, at: [24, 13] },
  { id: "toad", name: "Toad", sprite: "toad", height: 5.0, at: [0, -42] },
];

// Not people: the moon from Snoot's page hangs in the sky.
export const MOON = "snoot-2";

export const SPRITES = [...new Set([...ROSTER.map((c) => c.sprite), MOON, PLAYER.sprite])];

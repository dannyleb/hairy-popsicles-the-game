export const GAME_TITLE = "Hairy Popsicles";

export const PAPER = "#f5f6ec";
export const INK = "#2e1616";

// Flat 2D stage, side-on. Units are "world units" (a character is ~2-5
// tall). x runs left-right across the page; g is depth on the floor, from
// the horizon line (0) to the front edge (AREA.front). Further back = drawn
// higher and behind; nothing scales with depth.
export const VIEW = { height: 15, minWidth: 11 };

// The hub is open from the start; hair hedges at x = ±gateX wall off the
// west and east zones until Toad has eaten enough.
export const AREA = { minX: -47, maxX: 47, front: 8, gateX: 16 };

// Distances on the floor count depth this many times heavier than x, so
// "near" reads right on screen.
export const DEPTH = 2.5;

export const SPAWN = { x: 0, g: 6.7 };
export const PLAYER = { speed: 7, runSpeed: 12, depthSpeed: 0.5, radius: 0.6, sprite: "antenna", height: 2.7 };

export const CAN_SIZE = 5;
export const REACH = 2.6;

// Toad's appetite. Fill his belly to `goal` and the hedge to `opens`
// withers; then he's hungry again for the next stage. Add a zone (and its
// gate in gates.js) to grow the world.
export const STAGES = [
  { goal: 15, opens: "west", zone: "the west" },
  { goal: 22, opens: "east", zone: "the east" },
  { goal: 30, opens: null },
];

// What things are worth to Toad.
export const FOOD = { crumb: 1, pube: 1, fly: 3, toenail: 4, dropping: 8, blob: 5, roast: 8, eyeball: 10 };

// Pocket slots each scrap takes. Rarer finds are bigger but worth more.
export const SLOTS = { crumb: 1, pube: 1, fly: 1, toenail: 2, dropping: 3 };

// Base pocket slots and watering-can drops (shop upgrades add to these).
export const POCKETS = 12;

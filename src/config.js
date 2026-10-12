export const GAME_TITLE = "Hairy Popsicles";

// The world is the sketchbook page: paper ground, paper-white fog, so the
// edges of the world fade back into blank paper.
export const PAPER = 0xf5f6ec;
export const INK = "#1b1a17";

export const WORLD = { bounds: 120, fogNear: 22, fogFar: 72, tufts: 700, tileSize: 9 };

export const SPAWN = { player: { x: 0, z: 6 } };

export const PLAYER = { speed: 7, runSpeed: 12, radius: 0.6, sprite: "antenna", height: 2.7 };

// Fixed three-quarter camera (no orbit): billboards always face it, the way
// Don't Starve / Paper Mario stage flat art in 3D.
export const CAMERA = { fov: 50, height: 6, distance: 9.5, lookHeight: 1.9, lerp: 5 };

// Billboards lean back a little so the downward camera doesn't squash them.
export const LEAN = -0.22;

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
//   move    "walk" (wanders about), "hop" (hops in place), "float" (hovers)
//   drip    [x, y] share of the drawing where tears/sweat/drool fall from
//           (x from center, y from top); these refill your watering can
//   mutter  things they say to themselves when you walk past
export const ROSTER = [
  // Hub: Toad's corner.
  { id: "toad", name: "Toad", sprite: "toad", height: 5.5, at: [0, 1.8], drip: [0.18, 0.45], radius: 2.6, speakAt: 3.6 },
  { id: "pimples", name: "Pimples", sprite: "pimples", height: 3.6, at: [-8, 4.5], mutter: ["Don't pick. Don't pick. Don't pick."],
    lines: ["Don't look at my face.", "Something's been growing in there for weeks.", "It's ripe. I can feel it."] },
  { id: "melter", name: "Melter", sprite: "melter", height: 2.4, stick: true, at: [9, 4.7], drip: [0.15, 0.9], mutter: ["Don't look. I'm having a face day.", "I used to hold my shape.", "Is it hot, or is it just me leaking?"] },
  { id: "weeper", name: "Weeper", sprite: "weeper", height: 2.5, stick: true, at: [-11, 2.5], drip: [-0.12, 0.6], mutter: ["I'm not crying. My face is just like this.", "Everyone can see right through me.", "Do my tears look normal to you?"] },
  { id: "stubble", name: "Stubble", sprite: "stubble", height: 2.5, stick: true, at: [11, 2.6], mutter: ["I shaved this morning. It came back angrier.", "Stop looking at my pores."] },
  { id: "screamer", name: "Screamer", sprite: "screamer", height: 2.6, stick: true, at: [7, 0.6], mutter: ["AAAH. Sorry. That's just my resting face.", "I caught my reflection again."] },
  { id: "shiv", name: "Shiv", sprite: "shiv", height: 4.2, at: [-6, 0.6], move: "walk", mutter: ["Taller doesn't mean better. Trust me.", "My nose grows when I say I'm fine."] },

  // West.
  { id: "roast", name: "Roast", sprite: "roast", height: 1.8, at: [-31, 3.8], radius: 1.2 },
  { id: "conehead", name: "Conehead", sprite: "conehead", height: 2.8, stick: true, at: [-23, 5.1], drip: [0, 0.55], mutter: ["I'm smiling! Can't you tell I'm smiling?", "Happy tears. Probably."] },
  { id: "mirror", name: "Mirror", sprite: "mirror", height: 2.8, stick: true, at: [-40, 1.8], mutter: ["Look at me. No, really look.", "I only show what you bring."] },
  { id: "tendrils", name: "Tendrils", sprite: "tendrils", height: 2.2, stick: true, at: [-22, 1.5], mutter: ["Something keeps growing out of me.", "Pluck it. No, don't."] },
  { id: "redeye", name: "Red Eye", sprite: "redeye", height: 2.4, stick: true, at: [-43, 5.1], mutter: ["Haven't slept since I was drawn.", "My eyes do that on their own."] },
  { id: "balloon", name: "Balloon Man", sprite: "balloon-gang", height: 4.2, at: [-30, 6.8], move: "walk", mutter: ["I'm holding it together. Barely.", "Don't pop it. Please don't pop it."] },
  { id: "littleguy", name: "Little Guy", sprite: "balloon-gang-2", height: 2.2, at: [-38, 7.0], move: "hop", mutter: ["Am I small or is everything else big?", "Hi. Hi. Hi."] },

  // East.
  { id: "bigeye", name: "Big Eye", sprite: "bigeye", height: 2.6, stick: true, at: [32, 3.5], mutter: ["I see everything. Too much."],
    lines: ["What are YOU looking at?", "This eye's been loose since Tuesday."] },
  { id: "leprechaun", name: "Leprechaun", sprite: "leprechaun", height: 2.8, stick: true, at: [24, 5.1], mutter: ["Pot of gold? I've got a pot of pus.", "The beard's the best part of me."] },
  { id: "droopy", name: "Droopy", sprite: "droopy", height: 2.8, stick: true, at: [40, 1.6], mutter: ["Everything sags eventually.", "I'm not tired. I'm just... like this."] },
  { id: "bricks", name: "Bricks", sprite: "bricks", height: 3.6, at: [22, 1.1], mutter: ["I built myself up one block at a time.", "There's a crack. Don't mention the crack."] },
  { id: "snoot", name: "Snoot", sprite: "snoot", height: 3.4, at: [43, 4.9], drip: [-0.42, 0.62], mutter: ["I can smell how you feel.", "It's not a nose, it's a personality."] },
  { id: "fairy", name: "Fairy", sprite: "fairy", height: 3.6, at: [30, 6.7], move: "float", mutter: ["Make a wish. Make it gross.", "My planet's smaller than my problems."] },
  { id: "sweats", name: "Sweats", sprite: "sweats", height: 3.0, stick: true, at: [37, 0.4], drip: [0, 0.5], mutter: ["Is it warm in here, or is it me?", "I sweat when people look at me. Like now."] },
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

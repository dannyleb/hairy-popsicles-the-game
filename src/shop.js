// Mirror's shop (in the menu): spend pus points on upgrades and on things to
// wear. Upgrades stack up to `max`; cosmetics can be toggled on and off once
// owned.
import { CAN_SIZE, POCKETS } from "./config.js";

const POCKETS_UP = 6; // slots per Deeper Pockets level
const CAN_UP = 3;     // drops per Bigger Can level

export const ITEMS = [
  { id: "pockets", name: "Deeper Pockets", text: `${POCKETS_UP} more pocket slots.`, price: [40, 120], max: 2 },
  { id: "can", name: "Bigger Can", text: `Hold ${CAN_UP} more drops.`, price: [50], max: 1 },
  { id: "magnet", name: "Pus Magnet", text: "Pus flies to you from twice as far.", price: [60], max: 1 },
  { id: "bait", name: "Fly Bait", text: "Flies drift toward you.", price: [80], max: 1 },
  { id: "feet", name: "Squelchy Feet", text: "Walk 20% faster.", price: [90], max: 1 },
  { id: "wart", name: "Wart", text: "A hairy one, on the cheek.", price: [25], cosmetic: true },
  { id: "unibrow", name: "Unibrow", text: "Thick. Proud. Continuous.", price: [25], cosmetic: true },
  { id: "stain", name: "Mystery Stain", text: "Don't ask what it is.", price: [25], cosmetic: true },
  { id: "tuft", name: "Head Tuft", text: "Three hairs. Your best three.", price: [35], cosmetic: true },
  { id: "drool", name: "Permanent Drool", text: "It never stops.", price: [35], cosmetic: true },
];

export const priceOf = (item, level) => item.price[Math.min(level, item.price.length - 1)];
export const maxOf = (item) => (item.cosmetic ? 1 : item.max);

// Gameplay numbers that upgrades change.
export const upgrades = (progress) => ({
  pockets: POCKETS + POCKETS_UP * progress.owns("pockets"),
  can: CAN_SIZE + CAN_UP * progress.owns("can"),
  magnet: progress.owns("magnet") ? 3.8 : 1.9,
  bait: progress.owns("bait") > 0,
  speed: progress.owns("feet") ? 1.2 : 1,
  cosmetics: ITEMS.filter((i) => i.cosmetic && progress.owns(i.id) && progress.equipped(i.id)).map((i) => i.id),
});

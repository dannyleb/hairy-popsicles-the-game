// Missions are data, not code paths. Each one has an id, a title, a short
// description and a step. The only step type for now is "collect": clear
// every pickup. Add real step types (goto, talk, timed, etc.)
// once real missions take shape.
export const missions = [
  {
    id: "mop-drips",
    title: "Mop up the drips",
    description: "Everyone's melting. Walk into every blue drip in the field.",
    step: { type: "collect", total: 12 },
  },
];

export function createMissionRunner(hud) {
  let index = 0;
  let collected = 0;

  function current() {
    return missions[index];
  }

  function start() {
    const mission = current();
    if (!mission) return;
    hud.setObjective(mission.title, `${collected}/${mission.step.total}`);
  }

  function onPickupCollected() {
    const mission = current();
    if (!mission || mission.step.type !== "collect") return;
    collected += 1;
    hud.setObjective(mission.title, `${collected}/${mission.step.total}`);
    if (collected >= mission.step.total) {
      hud.toast(`Mission complete: ${mission.title}`);
      index += 1;
      collected = 0;
      start();
    }
  }

  return { start, onPickupCollected };
}

// A small in-game yes/no dialog (instead of the browser's confirm box).
// askConfirm({ title, text, yes, no }) resolves true or false.
const $ = (id) => document.getElementById(id);

export function askConfirm({ title, text, yes = "Yes", no = "No" }) {
  const box = $("confirm");
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  $("confirmYes").textContent = yes;
  $("confirmNo").textContent = no;
  box.hidden = false;
  $("confirmNo").focus();
  return new Promise((resolve) => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); done(false); } };
    window.addEventListener("keydown", onKey, true);
    const done = (answer) => {
      window.removeEventListener("keydown", onKey, true);
      box.hidden = true;
      $("confirmYes").onclick = $("confirmNo").onclick = box.onclick = null;
      resolve(answer);
    };
    $("confirmYes").onclick = () => done(true);
    $("confirmNo").onclick = () => done(false);
    box.onclick = (e) => { if (e.target === box) done(false); };
  });
}

// Wipe everything saved and start again from the title screen.
export async function startOver(progress) {
  const ok = await askConfirm({
    title: "New player?",
    text: "This wipes your pus, cards, achievements, curios, shop items and tips. It can't be undone.",
    yes: "Start over",
    no: "Keep my stuff",
  });
  if (!ok) return;
  progress.reset();
  location.reload();
}

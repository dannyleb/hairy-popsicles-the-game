export function createHud() {
  const objTitle = document.getElementById("objTitle");
  const objSub = document.getElementById("objSub");
  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function setObjective(title, sub) {
    if (objTitle) objTitle.textContent = title;
    if (objSub) objSub.textContent = sub;
  }

  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  return { setObjective, toast };
}

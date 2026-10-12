// DOM overlay: objective card, toast, watering-can meter, verb prompt,
// speech bubbles and comic bursts pinned to things in the world, end card.
export function createHud(stage) {
  const $ = (id) => document.getElementById(id);
  const objTitle = $("objTitle"), objSub = $("objSub"), toastEl = $("toast");
  const canEl = $("can"), promptEl = $("verbPrompt"), layer = $("worldLayer");
  let toastTimer = null;
  const pinned = [];

  const project = (t, lift) => stage.toScreen(t.x, t.g, (t.speakAt ?? t.top ?? 2) + lift + (t.lift ?? 0));

  function pin(el, target, life, lift, rise = 0) {
    layer.appendChild(el);
    pinned.push({ el, target, life, age: 0, lift, rise });
  }

  return {
    setObjective(title, sub) {
      objTitle.textContent = title;
      objSub.textContent = sub;
    },

    toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
    },

    setCan(n, max) {
      canEl.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < n ? "full" : ""}"></i>`).join("");
    },

    setPus(n, bump) {
      const el = $("pusCount");
      el.textContent = n;
      if (bump) {
        const wrap = $("pusWrap");
        wrap.classList.remove("bump");
        void wrap.offsetWidth;
        wrap.classList.add("bump");
      }
    },

    setPrompt(text) {
      if (promptEl.textContent !== text) promptEl.textContent = text;
      promptEl.classList.toggle("show", !!text);
    },

    say(target, text) {
      for (const p of pinned) if (p.target === target && p.el.classList.contains("bubble")) p.life = 0;
      const el = document.createElement("div");
      el.className = "bubble";
      el.textContent = text;
      pin(el, target, 2.6, 0.35);
    },

    burst(text, target) {
      const el = document.createElement("div");
      el.className = "burst";
      el.textContent = text;
      el.style.setProperty("--tilt", `${(Math.random() - 0.5) * 24}deg`);
      pin(el, target, 0.8, -1.3, 50);
    },

    showEnd() {
      $("endCard").classList.add("show");
    },

    update(dt) {
      for (let i = pinned.length - 1; i >= 0; i--) {
        const p = pinned[i];
        p.age += dt;
        if (p.age >= p.life) {
          p.el.remove();
          pinned.splice(i, 1);
          continue;
        }
        const s = project(p.target, p.lift);
        const fade = Math.min(1, (p.life - p.age) / 0.3);
        p.el.style.opacity = fade;
        p.el.style.transform = `translate(${s.x}px, ${s.y - p.rise * (p.age / p.life)}px) translate(-50%, -100%)`;
      }
    },
  };
}

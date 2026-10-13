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

  const bannerQueue = [];
  function nextBanner() {
    if (!bannerQueue.length) return;
    const [kicker, title, sub] = bannerQueue[0];
    const el = $("banner");
    el.querySelector(".bKick").textContent = kicker;
    el.querySelector(".bTitle").textContent = title;
    el.querySelector(".bSub").textContent = sub;
    el.classList.add("show");
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => { bannerQueue.shift(); nextBanner(); }, 350);
    }, 2600);
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

    // Toad's belly: k in 0..1, label like "7/15".
    setBelly(k, label) {
      $("bellyFill").style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
      $("bellyTxt").textContent = label;
    },

    setPockets(n, max = 12) {
      const el = $("pockets");
      const k = Math.min(1, n / max);
      $("pocketFill").style.width = `${Math.round(k * 100)}%`;
      $("pocketTxt").textContent = n >= max ? `FULL ${n}/${max}` : `${n}/${max}`;
      el.style.setProperty("--slots", max);
      el.dataset.level = k >= 0.75 ? "high" : k >= 0.4 ? "mid" : "low";
      el.classList.toggle("full", n >= max);
      if (n) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }
    },

    // A bubble pinned to a spot in the world (not a character).
    sign(x, g, top, text, life = 6) {
      const el = document.createElement("div");
      el.className = "bubble sign";
      el.textContent = text;
      pin(el, { x, g, top, lift: 0 }, life, 0.2);
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

    // Small text that floats up off something ("+1", "2/3", "x2").
    floatText(text, target, color = "#fbe5a6") {
      const el = document.createElement("div");
      el.className = "floatText";
      el.textContent = text;
      el.style.color = color;
      pin(el, target, 0.9, 0.2, 55);
    },

    // A banner that slides down from the top: achievements, album pages,
    // curios. Queued so they never pile on top of each other.
    banner(kicker, title, sub = "") {
      bannerQueue.push([kicker, title, sub]);
      if (bannerQueue.length === 1) nextBanner();
    },

    showEnd() {
      $("endCard").classList.add("show");
    },

    update(dt) {
      const card = $("objective").getBoundingClientRect();
      for (let i = pinned.length - 1; i >= 0; i--) {
        const p = pinned[i];
        p.age += dt;
        if (p.age >= p.life) {
          p.el.remove();
          pinned.splice(i, 1);
          continue;
        }
        const s = project(p.target, p.lift);
        // Keep bubbles from sliding under the objective card.
        if (s.x > card.left - 80 && s.x < card.right + 80) s.y = Math.max(s.y, card.bottom + 44);
        const fade = Math.min(1, (p.life - p.age) / 0.3);
        p.el.style.opacity = fade;
        p.el.style.transform = `translate(${s.x}px, ${s.y - p.rise * (p.age / p.life)}px) translate(-50%, -100%)`;
      }
    },
  };
}

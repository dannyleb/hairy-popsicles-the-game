// DOM overlay: objective card, toast, watering-can meter, verb prompt,
// speech bubbles and comic bursts pinned to things in the world, end card.
import * as THREE from "three";

const v = new THREE.Vector3();

export function createHud(camera) {
  const $ = (id) => document.getElementById(id);
  const objTitle = $("objTitle"), objSub = $("objSub"), toastEl = $("toast");
  const canEl = $("can"), promptEl = $("verbPrompt"), layer = $("worldLayer");
  let toastTimer = null;
  const pinned = [];

  function project(target, lift) {
    const p = target.root.position;
    v.set(p.x, (target.speakAt ?? target.top ?? 2) + lift + p.y, p.z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, behind: v.z > 1 };
  }

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
      pin(el, target, 0.8, -0.4, 60);
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
        p.el.style.opacity = s.behind ? 0 : fade;
        p.el.style.transform = `translate(${s.x}px, ${s.y - p.rise * (p.age / p.life)}px) translate(-50%, -100%)`;
      }
    },
  };
}

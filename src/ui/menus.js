// Full-screen menus: the Self-Portrait Album (pages, achievements, curios,
// share card) and Mirror's shop. The game pauses while one is open.
import { PAGES, wantOf } from "../album.js";
import { NOTES } from "../album-notes.js";
import { ACHIEVEMENTS } from "../progress.js";
import { ITEMS, maxOf, priceOf, upgrades } from "../shop.js";
import { CURIOS, curioTexture, drawCosmetic, skinTile, WALL_SKIN } from "../ink.js";
import { INK } from "../config.js";
import { sfx } from "../sfx.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function createMenus({ progress, hud, img, setPaused, onShopChange }) {
  const menu = $("menu"), body = $("menuBody"), tabs = $("menuTabs"), title = $("menuTitle");
  const curioUrls = Object.fromEntries(CURIOS.map((c) => [c.id, curioTexture(c.id).toDataURL()]));
  let tab = "pages", mode = null;

  function open(m, t) {
    mode = m;
    if (t) tab = t;
    menu.hidden = false;
    setPaused(true);
    $("pauseBtn").classList.remove("new");
    render();
  }
  function close() {
    menu.hidden = true;
    $("pageView").hidden = true;
    mode = null;
    setPaused(false);
  }
  $("menuClose").addEventListener("click", close);
  menu.addEventListener("click", (e) => { if (e.target === menu) close(); });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) { close(); e.stopImmediatePropagation(); }
  });
  $("pauseBtn").addEventListener("click", () => open("pause"));
  $("pageClose").addEventListener("click", () => ($("pageView").hidden = true));
  progress.on((type) => { if (type === "achievement" && menu.hidden) $("pauseBtn").classList.add("new"); });
  hud.onAlbumNews = () => { if (menu.hidden) $("pauseBtn").classList.add("new"); };

  function render() {
    if (mode === "shop") return renderShop();
    if (mode === "pause") return renderPause();
    title.textContent = "Self-Portrait Album";
    const names = { pages: `Pages ${progress.pageCount()}/${PAGES.length}`, achievements: `Achievements ${progress.achievementCount()}/${ACHIEVEMENTS.length}`, curios: `Curios ${CURIOS.filter((c) => progress.hasCurio(c.id)).length}/${CURIOS.length}`, share: "Share" };
    tabs.innerHTML = Object.entries(names).map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}">${v}</button>`).join("");
    for (const b of tabs.querySelectorAll("button")) b.addEventListener("click", () => { tab = b.dataset.tab; render(); });
    ({ pages: renderPages, achievements: renderAchievements, curios: renderCurios, share: renderShare })[tab]();
  }

  function renderPages() {
    body.innerHTML = `<div class="pageGrid">${PAGES.map((p) => {
      const got = progress.hasPage(p.id);
      const want = wantOf(p.id);
      const n = progress.wantCount(p.id);
      const prog = !got && want.n ? ` <b>${Math.min(n, want.n)}/${want.n}</b>` : "";
      return `<button class="pageCard ${got ? "got" : "locked"}" data-id="${p.id}">
        <img src="assets/sprites/${p.sprite}.webp" alt="" />
        <span class="pName">${got ? esc(p.name) : "???"}</span>
        <span class="pWant">${got ? "page filled" : esc(want.text) + prog}</span>
      </button>`;
    }).join("")}</div>`;
    for (const card of body.querySelectorAll(".pageCard.got")) card.addEventListener("click", () => showPage(card.dataset.id));
  }

  function showPage(id) {
    const p = PAGES.find((q) => q.id === id);
    const note = NOTES[id];
    $("pageImg").src = `assets/album/${p.scan}.jpg`;
    $("pageName").textContent = p.name;
    $("pageNote").textContent = note || "";
    $("pageNote").hidden = !note;
    $("pageWant").textContent = `They wanted: ${wantOf(id).text}`;
    $("pageView").hidden = false;
  }

  function renderAchievements() {
    body.innerHTML = `<div class="achList">${ACHIEVEMENTS.map((a) => {
      const got = progress.achieved(a.id);
      const k = Math.min(1, progress.stat(a.stat) / a.goal);
      return `<div class="ach ${got ? "got" : ""}">
        <span class="achMark">${got ? "&#10003;" : ""}</span>
        <span class="achTxt"><b>${got ? esc(a.name) : esc(a.name)}</b><small>${esc(a.text)}</small>
        ${got ? "" : `<i class="achBar"><i style="width:${Math.round(k * 100)}%"></i></i>`}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function renderCurios() {
    body.innerHTML = `<p class="menuHint">Sometimes a popped pimple has something in it.</p><div class="curioGrid">${CURIOS.map((c) => {
      const got = progress.hasCurio(c.id);
      return `<div class="curio ${got ? "got" : ""}"><img src="${curioUrls[c.id]}" alt="" /><span>${got ? esc(c.name) : "?"}</span></div>`;
    }).join("")}</div>`;
  }

  // ----- Share card -----
  async function makeCard() {
    try { await Promise.all([document.fonts.load('96px "Rubik Wet Paint"'), document.fonts.load('40px "Patrick Hand"')]); } catch {}
    const W = 1080, H = 1350;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = ctx.createPattern(skinTile(WALL_SKIN), "repeat");
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(80,30,30,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const big = (text, x, y, size, fill) => {
      ctx.font = `${size}px "Rubik Wet Paint", cursive`;
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.lineWidth = size / 9;
      ctx.strokeStyle = INK;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
    };
    ctx.fillStyle = INK;
    ctx.font = '34px "Patrick Hand", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("S E L F - P O R T R A I T", W / 2, 80);
    big("Hairy Popsicles", W / 2, 180, 104, "#f5e3a1");

    // You, in everything you've bought.
    const me = img.antenna, mh = 760, mw = mh * me.width / me.height, mx = 70, my = 260;
    ctx.drawImage(me, mx, my, mw, mh);
    for (const cos of upgrades(progress).cosmetics) drawCosmetic(ctx, cos, mx, my, mw, mh);

    const stats = [
      ["Pus collected", progress.stat("pusTotal")],
      ["Pimples popped", progress.stat("pops")],
      ["Best combo", progress.stat("maxCombo")],
      ["Flies swatted", progress.stat("flies")],
      ["Album pages", `${progress.pageCount()}/${PAGES.length}`],
      ["Achievements", `${progress.achievementCount()}/${ACHIEVEMENTS.length}`],
      ["Curios", `${CURIOS.filter((q) => progress.hasCurio(q.id)).length}/${CURIOS.length}`],
      ["Days on the skin", progress.stat("days")],
    ];
    let y = 330;
    for (const [k, v] of stats) {
      ctx.textAlign = "left";
      ctx.fillStyle = INK;
      ctx.font = '38px "Patrick Hand", sans-serif';
      ctx.fillText(k, 520, y);
      ctx.textAlign = "right";
      ctx.font = '50px "Rubik Wet Paint", cursive';
      ctx.fillText(String(v), 1010, y + 4);
      y += 82;
    }
    const last = progress.lastPage();
    if (last) {
      const p = PAGES.find((q) => q.id === last), pic = img[p.sprite];
      const ph = 200, pw = ph * pic.width / pic.height;
      ctx.drawImage(pic, 520, y - 10, pw, ph);
      ctx.textAlign = "left";
      ctx.font = '34px "Patrick Hand", sans-serif';
      ctx.fillText("Latest page:", 540 + pw, y + 80);
      ctx.font = '40px "Rubik Wet Paint", cursive';
      ctx.fillText(p.name, 540 + pw, y + 128);
    }
    ctx.textAlign = "center";
    ctx.font = '32px "Patrick Hand", sans-serif';
    ctx.fillText("dannyleb.github.io/hairy-popsicles-the-game", W / 2, H - 50);
    return c;
  }

  async function renderShare() {
    body.innerHTML = `<p class="menuHint">Your self-portrait, as it stands. Save it or share it.</p>
      <div class="cardWrap"><canvas id="cardPreview"></canvas></div>
      <button id="shareBtn" class="chunk">Save / Share</button>`;
    const card = await makeCard();
    const pv = $("cardPreview");
    if (!pv) return;
    pv.width = card.width; pv.height = card.height;
    pv.getContext("2d").drawImage(card, 0, 0);
    $("shareBtn").addEventListener("click", () => {
      card.toBlob(async (blob) => {
        const file = new File([blob], "hairy-popsicles-self-portrait.png", { type: "image/png" });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Hairy Popsicles" });
            return;
          }
        } catch {}
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, "image/png");
    });
  }

  // ----- Pause -----
  function renderPause() {
    title.textContent = "Paused";
    tabs.innerHTML = "";
    body.innerHTML = `<div class="pauseList">
      <button class="chunk" data-go="resume">&#9654; Resume</button>
      <button class="chunk" data-go="album">Self-Portrait Album <small>${progress.pageCount()}/${PAGES.length} pages</small></button>
      <button class="chunk" data-go="achievements">Achievements <small>${progress.achievementCount()}/${ACHIEVEMENTS.length}</small></button>
      <button class="chunk" data-go="shop">Mirror's Shop <small>${progress.pus} pus</small></button>
      <button class="chunk" data-go="share">Share your Self-Portrait</button>
    </div>`;
    for (const b of body.querySelectorAll("[data-go]")) b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "resume") return close();
      if (go === "shop") { mode = "shop"; return render(); }
      mode = "album";
      tab = go === "album" ? "pages" : go;
      render();
    });
  }

  // ----- Shop -----
  function renderShop() {
    title.textContent = "Mirror's Shop";
    tabs.innerHTML = `<span class="purse"><span class="pusDrop"></span>${progress.pus} pus</span>`;
    body.innerHTML = `<div class="shopList">${ITEMS.map((it) => {
      const lvl = progress.owns(it.id), max = maxOf(it);
      let btn;
      if (it.cosmetic && lvl) btn = `<button data-wear="${it.id}" class="chunk small">${progress.equipped(it.id) ? "TAKE OFF" : "WEAR"}</button>`;
      else if (lvl >= max) btn = `<span class="owned">OWNED</span>`;
      else {
        const price = priceOf(it, lvl);
        btn = `<button data-buy="${it.id}" class="chunk small" ${progress.pus < price ? "disabled" : ""}>${price} pus</button>`;
      }
      const level = !it.cosmetic && max > 1 ? ` <small>(${lvl}/${max})</small>` : "";
      return `<div class="shopItem"><span><b>${esc(it.name)}</b>${level}<small>${esc(it.text)}</small></span>${btn}</div>`;
    }).join("")}</div>`;
    for (const b of body.querySelectorAll("[data-buy]")) b.addEventListener("click", () => {
      const it = ITEMS.find((i) => i.id === b.dataset.buy);
      if (!progress.spendPus(priceOf(it, progress.owns(it.id)))) return;
      progress.buy(it.id);
      if (it.cosmetic) progress.toggle(it.id);
      sfx.buy();
      hud.setPus(progress.pus, true);
      onShopChange();
      renderShop();
    });
    for (const b of body.querySelectorAll("[data-wear]")) b.addEventListener("click", () => {
      progress.toggle(b.dataset.wear);
      onShopChange();
      renderShop();
    });
  }

  return {
    openShop: () => open("shop"),
    openPause: () => open("pause"),
    openAlbum: () => open("album"),
    get isOpen() { return !menu.hidden; },
  };
}

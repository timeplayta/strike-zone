/** Tela cheia de mapas — abre pelo botão acima de JOGAR */

import { getMapCardArtUrl } from "./map-card-art.js?v=72";

const MAPS = [
  { id: "dust", mode: "Jogo de tiro", name: "Dust Alley", desc: "Deserto aberto" },
  { id: "warehouse", mode: "Jogo de tiro", name: "Cold Storage", desc: "Armazém fechado" },
  { id: "horror", mode: "Terror", name: "Terror", desc: "Combate escuro", horror: true },
  { id: "labyrinth", mode: "Terror", name: "Fim das Trevas", desc: "Labirinto de escape", horror: true },
  { id: "frontier", mode: "Battle Royale", name: "Ilha Frontier", desc: "Ilha 2km • lobby + queda + 100 bots" },
];

function $(id) {
  return document.getElementById(id);
}

function selectedMapId() {
  return document.querySelector(".map-btn.selected")?.dataset?.map || "dust";
}

function buildMapCards() {
  const grid = $("ffMapCardGrid");
  if (!grid) return;
  if (grid.dataset.built === "1" && grid.children.length) return;
  try {
    grid.innerHTML = MAPS.map((m) => {
      const art = getMapCardArtUrl(m.id);
      const sel = m.id === selectedMapId() ? " selected" : "";
      const horror = m.horror ? " ff-map-card-horror" : "";
      return (
        `<button type="button" class="map-btn ff-map-card${horror}${sel}" data-map="${m.id}">` +
        `<img class="ff-map-card-img" src="${art}" alt="${m.name}" loading="lazy" />` +
        `<span class="ff-map-card-shade"></span>` +
        `<span class="ff-map-card-body">` +
        `<span class="ff-map-card-mode">${m.mode}</span>` +
        `<span class="map-name">${m.name}</span>` +
        `<span class="map-desc">${m.desc}</span>` +
        `</span></button>`
      );
    }).join("");
    grid.dataset.built = "1";
  } catch (err) {
    console.warn("[Strike Zone] Falha ao montar cards de mapa:", err);
    grid.dataset.built = "0";
  }
}

function syncCardSelection() {
  const id = selectedMapId();
  document.querySelectorAll("#ffMapCardGrid .map-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.map === id);
  });
}

export function openMapFullscreen() {
  buildMapCards();
  syncCardSelection();
  const el = $("ffMapFullscreen");
  if (!el) return;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  $("ffMapPickerBtn")?.setAttribute("aria-expanded", "true");
  document.body.classList.add("ff-map-screen-open");
}

export function closeMapFullscreen() {
  const el = $("ffMapFullscreen");
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
  $("ffMapPickerBtn")?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("ff-map-screen-open");
}

function onMapCardClick(btn) {
  if (!btn?.dataset?.map) return;
  if (typeof window.strikeZoneSelectMap === "function") {
    window.strikeZoneSelectMap(btn);
  } else {
    document.querySelectorAll(".map-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  }
  syncCardSelection();
  closeMapFullscreen();
}

export function initMapView() {
  requestAnimationFrame(buildMapCards);

  $("ffMapPickerBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMapFullscreen();
  });

  const btn = $("ffMapPickerBtn");
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMapFullscreen();
    };
  }

  $("closeMapFullscreenBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMapFullscreen();
  });

  $("ffMapFullscreen")?.addEventListener("click", (e) => {
    if (e.target.id === "ffMapFullscreen") closeMapFullscreen();
  });

  $("ffMapCardGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".map-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    onMapCardClick(btn);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("ffMapFullscreen")?.classList.contains("hidden")) {
      closeMapFullscreen();
    }
  });
}

window.openMapFullscreen = openMapFullscreen;
window.closeMapFullscreen = closeMapFullscreen;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMapView);
} else {
  initMapView();
}

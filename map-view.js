/** Tela cheia de mapas — abre pelo botão acima de JOGAR */

import { getMapCardArtUrl } from "./map-card-art.js?v=74";

const MAPS = [
  { id: "dust", category: "tiro", name: "Dust Alley", desc: "Deserto aberto" },
  { id: "warehouse", category: "tiro", name: "Cold Storage", desc: "Armazém fechado" },
  { id: "horror", category: "terror", name: "Terror", desc: "Combate escuro", horror: true },
  { id: "labyrinth", category: "esconde-esconde", name: "Fim das Trevas", desc: "Labirinto de escape", horror: true },
  { id: "frontier", category: "tiro", name: "Ilha Frontier", desc: "Ilha 2km • 10 POIs • deserto, selva e costa • 100 bots" },
  { id: "chess", category: "jogos-de-mesa", name: "Xadrez", desc: "Tabuleiro clássico · vs bot" },
  { id: "dama", category: "jogos-de-mesa", name: "Dama", desc: "Damas 8×8 · capturas obrigatórias" },
  { id: "sinuca", category: "jogos-de-mesa", name: "Sinuca", desc: "Mesa 8-ball · mira e tacada" },
  { id: "truco", category: "jogos-de-mesa", name: "Truco", desc: "Paulista · manilha · até 12" },
  { id: "domino", category: "jogos-de-mesa", name: "Dominó", desc: "Duplo-6 · vs bot" },
  { id: "lig4", category: "jogos-de-mesa", name: "Lig 4", desc: "Quatro em linha" },
  { id: "velha", category: "jogos-de-mesa", name: "Jogo da Velha", desc: "3×3 clássico" },
  { id: "blackjack", category: "jogos-de-mesa", name: "Blackjack", desc: "21 · vs dealer" },
  { id: "poker", category: "jogos-de-mesa", name: "Poker", desc: "5 cartas · heads-up" },
  { id: "memoria", category: "jogos-de-mesa", name: "Memória", desc: "Ache os pares" },
  { id: "uno", category: "jogos-de-mesa", name: "Uno", desc: "Cor ou número · 1v1" },
];

const CATEGORIES = ["tiro", "terror", "esconde-esconde", "jogos-de-mesa"];

let activeCategory = "tiro";

function $(id) {
  return document.getElementById(id);
}

function selectedMapId() {
  return document.querySelector(".map-btn.selected")?.dataset?.map || "dust";
}

function categoryForMap(mapId) {
  return MAPS.find((m) => m.id === mapId)?.category || "tiro";
}

function buildMapCards() {
  const grid = $("ffMapCardGrid");
  if (!grid) return;
  if (grid.dataset.built === "5" && grid.children.length) return;
  try {
    grid.innerHTML = MAPS.map((m) => {
      const art = getMapCardArtUrl(m.id);
      const sel = m.id === selectedMapId() ? " selected" : "";
      const horror = m.horror ? " ff-map-card-horror" : "";
      return (
        `<div class="ff-map-item" data-category="${m.category}">` +
        `<button type="button" class="map-btn ff-map-card${horror}${sel}" data-map="${m.id}">` +
        `<img class="ff-map-card-img" src="${art}" alt="${m.name}" loading="lazy" />` +
        `<span class="ff-map-card-shade"></span>` +
        `<span class="ff-map-card-body">` +
        `<span class="map-name">${m.name}</span>` +
        `<span class="map-desc">${m.desc}</span>` +
        `</span></button>` +
        `</div>`
      );
    }).join("");
    grid.dataset.built = "5";
  } catch (err) {
    console.warn("[Strike Zone] Falha ao montar cards de mapa:", err);
    grid.dataset.built = "0";
  }
}

function syncCategoryBar() {
  document.querySelectorAll("#ffMapCategoryBar .ff-map-cat-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.category === activeCategory);
    btn.setAttribute("aria-pressed", btn.dataset.category === activeCategory ? "true" : "false");
  });
}

function applyCategoryFilter() {
  document.querySelectorAll("#ffMapCardGrid .ff-map-item").forEach((item) => {
    item.classList.toggle("hidden", item.dataset.category !== activeCategory);
  });
  syncCategoryBar();
}

function setActiveCategory(category) {
  if (!CATEGORIES.includes(category)) return;
  activeCategory = category;
  applyCategoryFilter();
}

function syncCardSelection() {
  const id = selectedMapId();
  document.querySelectorAll("#ffMapCardGrid .map-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.map === id);
  });
}

export function openMapFullscreen() {
  buildMapCards();
  activeCategory = categoryForMap(selectedMapId());
  applyCategoryFilter();
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

  $("ffMapCategoryBar")?.addEventListener("click", (e) => {
    const catBtn = e.target.closest(".ff-map-cat-btn");
    if (!catBtn?.dataset?.category) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveCategory(catBtn.dataset.category);
  });

  $("ffMapCardGrid")?.addEventListener("click", (e) => {
    const mapBtn = e.target.closest(".map-btn");
    if (!mapBtn) return;
    e.preventDefault();
    e.stopPropagation();
    onMapCardClick(mapBtn);
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

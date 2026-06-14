/** Tela de mapas no hub lateral */

import { switchHubPanel, showPlayHub } from "./menu-hub.js";

const MAP_INFO = {
  dust: {
    title: "Dust Alley",
    desc: "Mapa aberto de tiro, bom para testar mira, recoil e skins de arma.",
  },
  warehouse: {
    title: "Cold Storage",
    desc: "Armazém com linhas de visão médias, cobertura e combate mais fechado.",
  },
  horror: {
    title: "Terror",
    desc: "Mapa escuro com clima de susto. Use lanterna e jogue com mais cuidado.",
  },
  labyrinth: {
    title: "Fim das Trevas",
    desc: "Labirinto de escape com monstros: Gosmento, Gigante das Mãos e Bam-Bam.",
  },
};

function $(id) {
  return document.getElementById(id);
}

function selectedMap() {
  return document.querySelector(".map-btn.selected")?.dataset?.map || "dust";
}

function refreshMapPreview() {
  const info = MAP_INFO[selectedMap()] || MAP_INFO.dust;
  const title = $("mapHubTitle");
  const desc = $("mapHubDesc");
  if (title) title.textContent = info.title;
  if (desc) desc.textContent = info.desc;
}

function openMapHub() {
  switchHubPanel("map");
  const panel = $("ffHubPanelMap");
  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
  refreshMapPreview();
}

function closeMapHub() {
  showPlayHub();
  $("ffHubPanelMap")?.setAttribute("aria-hidden", "true");
}

export function initMapView() {
  $("openMapHubBtn")?.addEventListener("click", openMapHub);
  $("closeMapHubBtn")?.addEventListener("click", closeMapHub);
  document.querySelectorAll(".map-btn").forEach((btn) => {
    btn.addEventListener("click", () => requestAnimationFrame(refreshMapPreview));
  });
  refreshMapPreview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMapView);
} else {
  initMapView();
}

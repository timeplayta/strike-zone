/** Navegação do hub no menu principal */

import { stopShopFeaturedPreview } from "./shop-item-preview.js";

const HUB_PANELS = {
  character: "ffHubPanelCharacter",
  arsenal: "ffHubPanelArsenal",
  shop: "ffHubPanelShop",
};

function syncHubOverlay(openPanel) {
  const stage = document.getElementById("ffHubStage");
  if (!stage) return;
  const open = !!openPanel && openPanel in HUB_PANELS;
  stage.classList.toggle("hub-open", open);
  stage.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("hub-panel-open", open);
}

export function switchHubPanel(panel) {
  let openPanel = null;

  for (const [key, id] of Object.entries(HUB_PANELS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const on = panel === key;
    if (on) openPanel = key;
    el.classList.toggle("hidden", !on);
    el.classList.toggle("active", on);
    el.setAttribute("aria-hidden", on ? "false" : "true");
  }

  document.getElementById("ffHubPanelPlay")?.classList.add("hidden");

  document.querySelectorAll(".ff-side-nav-btn").forEach((btn) => {
    const hub = btn.dataset.hub;
    btn.classList.toggle("selected", hub === panel);
  });

  syncHubOverlay(openPanel);
}

export function showPlayHub() {
  stopShopFeaturedPreview();
  switchHubPanel(null);
}

/** Navegação do hub no menu principal (estilo Free Fire) */

export function switchHubPanel(panel) {
  const map = {
    play: "ffHubPanelPlay",
    character: "ffHubPanelCharacter",
    arsenal: "ffHubPanelArsenal",
    shop: "ffHubPanelShop",
  };

  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const on = panel === key;
    el.classList.toggle("hidden", !on);
    el.classList.toggle("active", on);
  }

  document.querySelectorAll(".ff-side-nav-btn").forEach((btn) => {
    const hub = btn.dataset.hub;
    btn.classList.toggle("selected", hub === panel && panel !== "play");
  });
}

export function showPlayHub() {
  switchHubPanel("play");
}

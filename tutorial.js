/**
 * Tutorial interativo do hub — spotlight + chat + seta.
 * Roda uma vez por conta (localStorage) após entrar no menu.
 */

import { showPlayHub } from "./menu-hub.js";

const STORAGE_KEY = "strikezone_tutorial_v1";

const PHASE = {
  INTRO: "intro",
  ACCOUNT_CLICK: "account_click",
  ACCOUNT_EXPLAIN: "account_explain",
  OPTIONS_CLICK: "options_click",
  OPTIONS_EXPLAIN: "options_explain",
  ARSENAL_CLICK: "arsenal_click",
  ARSENAL_EXPLAIN: "arsenal_explain",
  SHOP_CLICK: "shop_click",
  SHOP_EXPLAIN: "shop_explain",
  MAPS_CLICK: "maps_click",
  MAPS_TOUR: "maps_tour",
  MAPS_PICK: "maps_pick",
  START_CLICK: "start_click",
  IN_MATCH: "in_match",
  FINALE: "finale",
};

const MAP_TOUR = [
  {
    category: "tiro",
    hole: '#ffMapCategoryBar [data-category="tiro"]',
    text:
      "Categoria TIRO: Dust Alley e Cold Storage são tiroteio clássico. A Ilha Frontier é Battle Royale gigante — loot, queda e um monte de bot!",
  },
  {
    category: "terror",
    hole: '#ffMapCategoryBar [data-category="terror"]',
    text:
      "TERROR: mapa escuro, tensão alta e monstros nas sombras. Segura a lanterna (J) e não fica parado!",
  },
  {
    category: "esconde-esconde",
    hole: '#ffMapCategoryBar [data-category="esconde-esconde"]',
    text:
      "ESCONDE-ESCONDE: Fim das Trevas — labirinto pra escapar enquanto os monstros te caçam. Coragem > GPS!",
  },
  {
    category: "jogos-de-mesa",
    hole: '#ffMapCategoryBar [data-category="jogos-de-mesa"]',
    text:
      "JOGOS DE MESA: xadrez, dama e sinuca. Pausinha tática pro cérebro (e pra zoar o bot)!",
  },
];

let active = false;
let phase = null;
let allowedSelectors = [];
let holeTargets = [];
let mapTourIndex = 0;
let matchStarted = false;
let resizeObs = null;
let rafHole = 0;
let listenersBound = false;

function $(id) {
  return document.getElementById(id);
}

function playerName() {
  return (
    $("playerName")?.value?.trim() ||
    $("accountFabName")?.textContent?.trim() ||
    "Operador"
  );
}

export function isTutorialDone() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isTutorialActive() {
  return active;
}

function markDone() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function ensureRoot() {
  let root = $("tutorialRoot");
  if (root) return root;

  root = document.createElement("div");
  root.id = "tutorialRoot";
  root.className = "tutorial-root hidden";
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div id="tutorialHole" class="tutorial-hole hidden" aria-hidden="true"></div>
    <div id="tutorialArrow" class="tutorial-arrow hidden" aria-hidden="true">
      <span class="tutorial-arrow-tip"></span>
    </div>
    <div id="tutorialChat" class="tutorial-chat">
      <div class="tutorial-chat-face" aria-hidden="true">🎯</div>
      <div class="tutorial-chat-main">
        <p id="tutorialChatText" class="tutorial-chat-text"></p>
        <div id="tutorialChatActions" class="tutorial-chat-actions"></div>
      </div>
      <button type="button" id="tutorialSkipBtn" class="tutorial-skip" title="Pular tutorial">Pular</button>
    </div>
    <div id="tutorialMatchTip" class="tutorial-match-tip hidden" aria-live="polite"></div>
  `;
  document.body.appendChild(root);

  $("tutorialSkipBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    finishTutorial(true);
  });

  root.addEventListener("click", (e) => e.stopPropagation());
  root.addEventListener("mousedown", (e) => e.stopPropagation());
  root.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

  return root;
}

function showRoot(on) {
  const root = ensureRoot();
  root.classList.toggle("hidden", !on);
  document.body.classList.toggle("tutorial-active", on);
}

function setChat(text, actions = []) {
  const el = $("tutorialChatText");
  if (el) el.textContent = text;
  const box = $("tutorialChatActions");
  if (!box) return;
  box.innerHTML = "";
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = a.primary ? "tutorial-btn tutorial-btn-primary" : "tutorial-btn";
    btn.textContent = a.label;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      a.onClick?.();
    });
    box.appendChild(btn);
  }
  $("tutorialChat")?.classList.remove("hidden");
  $("tutorialSkipBtn")?.classList.toggle("hidden", phase === PHASE.IN_MATCH || phase === PHASE.FINALE);
}

function clearHole() {
  holeTargets = [];
  const hole = $("tutorialHole");
  const arrow = $("tutorialArrow");
  hole?.classList.add("hidden");
  arrow?.classList.add("hidden");
  document.querySelectorAll(".tutorial-spotlight").forEach((el) => {
    el.classList.remove("tutorial-spotlight");
  });
}

function unionRect(els) {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let any = false;
  for (const el of els) {
    if (!el || el.classList?.contains("hidden")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) continue;
    any = true;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!any) return null;
  const pad = 8;
  return {
    top: Math.max(0, top - pad),
    left: Math.max(0, left - pad),
    width: Math.min(window.innerWidth, right - left + pad * 2),
    height: Math.min(window.innerHeight, bottom - top + pad * 2),
  };
}

function placeHoleAndArrow() {
  const hole = $("tutorialHole");
  const arrow = $("tutorialArrow");
  const chat = $("tutorialChat");
  if (!hole || !holeTargets.length) return;

  const els = holeTargets
    .map((s) => (typeof s === "string" ? document.querySelector(s) : s))
    .filter(Boolean);

  els.forEach((el) => el.classList.add("tutorial-spotlight"));

  const rect = unionRect(els);
  if (!rect) {
    hole.classList.add("hidden");
    arrow?.classList.add("hidden");
    return;
  }

  hole.classList.remove("hidden");
  hole.style.top = `${rect.top}px`;
  hole.style.left = `${rect.left}px`;
  hole.style.width = `${rect.width}px`;
  hole.style.height = `${rect.height}px`;

  if (!arrow || !chat || chat.classList.contains("hidden")) return;

  const chatRect = chat.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const chatCx = chatRect.left + chatRect.width / 2;
  const chatCy = chatRect.top + chatRect.height / 2;

  const preferBelow = cy < window.innerHeight * 0.45;
  let ax;
  let ay;
  let rot;

  if (preferBelow) {
    ax = cx;
    ay = rect.bottom + 10;
    rot = 180;
  } else if (cy > chatCy) {
    ax = cx;
    ay = rect.top - 28;
    rot = 0;
  } else {
    ax = cx < chatCx ? rect.right + 12 : rect.left - 12;
    ay = cy;
    rot = cx < chatCx ? 90 : -90;
  }

  arrow.classList.remove("hidden");
  arrow.style.left = `${ax}px`;
  arrow.style.top = `${ay}px`;
  arrow.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
}

function scheduleHole() {
  cancelAnimationFrame(rafHole);
  rafHole = requestAnimationFrame(() => placeHoleAndArrow());
}

function setSpotlight(selectors, { allow = null } = {}) {
  clearHole();
  holeTargets = Array.isArray(selectors) ? selectors : [selectors];
  allowedSelectors = allow || holeTargets.filter((s) => typeof s === "string");
  scheduleHole();
}

function setPhase(next) {
  phase = next;
  document.body.dataset.tutorialPhase = next || "";
}

function closeAccountModal() {
  $("accountModal")?.classList.add("hidden");
  $("accountModal")?.setAttribute("aria-hidden", "true");
}

function closeOptionsPanel() {
  const panel = $("ffGameOptionsPanel");
  if (!panel) return;
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

function closeHubPanels() {
  try {
    showPlayHub();
  } catch {
    /* optional */
  }
}

function closeMaps() {
  window.closeMapFullscreen?.();
}

function resetMenuChrome() {
  closeAccountModal();
  closeOptionsPanel();
  closeHubPanels();
  closeMaps();
}

function goIntro() {
  setPhase(PHASE.INTRO);
  clearHole();
  allowedSelectors = [];
  setChat(`Olá ${playerName()}! Vou te ensinar a como jogar!`, [
    { label: "Bora!", primary: true, onClick: () => goAccountClick() },
  ]);
  positionChat("center");
}

function positionChat(mode) {
  const chat = $("tutorialChat");
  if (!chat) return;
  chat.classList.remove("tutorial-chat-center", "tutorial-chat-bottom", "tutorial-chat-match");
  if (mode === "center") chat.classList.add("tutorial-chat-center");
  else if (mode === "match") chat.classList.add("tutorial-chat-match");
  else chat.classList.add("tutorial-chat-bottom");
}

function goAccountClick() {
  resetMenuChrome();
  setPhase(PHASE.ACCOUNT_CLICK);
  positionChat("bottom");
  setSpotlight(["#openAccountBtn"]);
  setChat("Passo 1 — Minha Conta. Clica no teu perfil ali em cima pra ver o personagem!", []);
}

function goAccountExplain() {
  setPhase(PHASE.ACCOUNT_EXPLAIN);
  positionChat("bottom");
  setSpotlight(
    ["#accountModal .hub-modal-panel", ".avatar-grid", ".account-preview-row"],
    { allow: ["#accountModal .hub-modal-panel", ".avatar-pick"] }
  );
  setChat(
    "Esse é o personagem principal! Se não curtir o ícone padrão, troca aqui — cachorro, gato, inimigo ou teu boneco.",
    [{ label: "Entendi!", primary: true, onClick: () => goOptionsClick() }]
  );
}

function goOptionsClick() {
  closeAccountModal();
  closeHubPanels();
  setPhase(PHASE.OPTIONS_CLICK);
  positionChat("bottom");
  setSpotlight(["#ffOptionsBtn"]);
  setChat("Passo 2 — Opções. Abre aqui pra configurar a partida!", []);
}

function goOptionsExplain() {
  setPhase(PHASE.OPTIONS_EXPLAIN);
  positionChat("bottom");
  setSpotlight(["#ffGameOptionsPanel"], {
    allow: ["#ffGameOptionsPanel", "#ffOptionsBtn", "#ffTopCorner"],
  });
  setChat(
    "Aqui tu muda a quantidade de NPCs nos modos com bots, escolhe o modo (Eliminação ou Desarmar bomba) e pode pedir 2 ajudantes CT!",
    [{ label: "Beleza!", primary: true, onClick: () => goArsenalClick() }]
  );
}

function goArsenalClick() {
  closeOptionsPanel();
  closeHubPanels();
  setPhase(PHASE.ARSENAL_CLICK);
  positionChat("bottom");
  setSpotlight(["#openArsenalBtn"]);
  setChat("Passo 3 — Armas. Clica pra ver tuas skins e o arsenal!", []);
}

function goArsenalExplain() {
  setPhase(PHASE.ARSENAL_EXPLAIN);
  positionChat("bottom");
  setSpotlight(["#ffHubPanelArsenal"], {
    allow: ["#ffHubPanelArsenal", "#openArsenalBtn"],
  });
  setChat(
    "Aqui ficam as armas e skins que tu já tem. Equipa o que quiser — e logo em seguida tem a Loja pra comprar mais!",
    [{ label: "Ver a Loja", primary: true, onClick: () => goShopClick() }]
  );
}

function goShopClick() {
  closeHubPanels();
  setPhase(PHASE.SHOP_CLICK);
  positionChat("bottom");
  setSpotlight(["#openSoloBtn"]);
  setChat("Passo 4 — Loja. Abre pra ver o que dá pra comprar!", []);
}

function goShopExplain() {
  setPhase(PHASE.SHOP_EXPLAIN);
  positionChat("bottom");
  setSpotlight(["#ffHubPanelShop"], {
    allow: ["#ffHubPanelShop", "#openSoloBtn", ".shop-tab"],
  });
  setChat(
    "Na Loja tu customiza armas e personagem — skins, outfits e personagens. Gasta as moedas com estilo!",
    [{ label: "Partiu mapas!", primary: true, onClick: () => goMapsClick() }]
  );
}

function goMapsClick() {
  closeHubPanels();
  setPhase(PHASE.MAPS_CLICK);
  positionChat("bottom");
  setSpotlight(["#ffMapPickerBtn"]);
  setChat("Passo 5 — Mapas. Abre a lista pra eu te mostrar as possibilidades!", []);
}

function goMapsTour(index = 0) {
  mapTourIndex = index;
  setPhase(PHASE.MAPS_TOUR);
  positionChat("bottom");
  const step = MAP_TOUR[mapTourIndex];
  if (!step) {
    goMapsPick();
    return;
  }

  const catBtn = document.querySelector(step.hole);
  catBtn?.click();

  setSpotlight([step.hole, "#ffMapCardGrid"], {
    allow: ["#ffMapCategoryBar", "#closeMapFullscreenBtn"],
  });

  const isLast = mapTourIndex >= MAP_TOUR.length - 1;
  setChat(step.text, [
    {
      label: isLast ? "Escolher mapa" : "Próximo",
      primary: true,
      onClick: () => {
        if (isLast) goMapsPick();
        else goMapsTour(mapTourIndex + 1);
      },
    },
  ]);
}

function goMapsPick() {
  setPhase(PHASE.MAPS_PICK);
  positionChat("bottom");
  setSpotlight(["#ffMapCardGrid", "#ffMapCategoryBar"], {
    allow: ["#ffMapFullscreen", "#ffMapCategoryBar", "#ffMapCardGrid", ".map-btn", "#closeMapFullscreenBtn"],
  });
  setChat(
    "Agora escolhe o mapa que tu quiser jogar — clica no card e confirma. Eu te ensino a partida em seguida!",
    []
  );
}

function goStartClick() {
  closeMaps();
  closeHubPanels();
  setPhase(PHASE.START_CLICK);
  positionChat("bottom");
  setSpotlight(["#startBtn"]);
  setChat(
    "Passo 6 — Partida! Clica em JOGAR quando estiver pronto. Eu fico do teu lado com dicas rápidas.",
    []
  );
}

function matchTipsForSelection() {
  const map = document.querySelector(".map-btn.selected")?.dataset?.map || "dust";
  const mode = $("gameMode")?.value || "tdm";
  const mobile = document.body.classList.contains("mode-mobile");

  if (map === "chess" || map === "dama" || map === "sinuca") {
    return "Jogo de mesa: escolhe o modo no lobby, joga a partida e quando voltar ao menu o tutorial fecha. Divirte!";
  }
  if (map === "labyrinth") {
    return mobile
      ? "Fim das Trevas: sobrevive no labirinto • J = lanterna • fuja dos 3 monstros e ache a saída!"
      : "Fim das Trevas: WASD mover • mouse olhar • J = lanterna • escape dos 3 monstros no escuro!";
  }
  if (map === "horror") {
    return mobile
      ? "Terror: joystick + mira • J = lanterna • os monstros espreitam nas sombras!"
      : "Terror: WASD + mouse • J = lanterna • cuidado com Gosmento, Gigante e Bam-Bam!";
  }
  if (map === "frontier") {
    return mobile
      ? "Battle Royale: espera a queda • loot armas • sobrevive na ilha!"
      : "Battle Royale: lobby → queda → loot • WASD planeja no paraquedas • ache arma e lute!";
  }
  if (mode === "defuse") {
    return mobile
      ? "Desarmar: elimina / planta / desarma • joystick mover • ATIRAR • B = bomba"
      : "Desarmar bomba: WASD • clique atirar • botão direito mirar • R recarregar • ache a sala da bomba!";
  }
  return mobile
    ? "Eliminação: joystick mover • arrasta pra mirar • ATIRAR nos bandidos • primeiro a 15 vence!"
    : "Eliminação: WASD mover • mouse mirar • clique atirar • R recarregar • botão direito = ADS. Primeiro a 15!";
}

function goInMatch() {
  setPhase(PHASE.IN_MATCH);
  matchStarted = true;
  clearHole();
  allowedSelectors = [];
  positionChat("match");
  $("tutorialChat")?.classList.add("hidden");
  $("tutorialSkipBtn")?.classList.add("hidden");

  const tip = $("tutorialMatchTip");
  if (tip) {
    tip.textContent = matchTipsForSelection();
    tip.classList.remove("hidden");
  }
}

function goFinale() {
  setPhase(PHASE.FINALE);
  matchStarted = false;
  const tip = $("tutorialMatchTip");
  tip?.classList.add("hidden");
  showRoot(true);
  clearHole();
  allowedSelectors = [];
  positionChat("center");
  setChat(
    `Mandou bem, ${playerName()}! Tutorial concluído — agora o hub é todo teu, sem restrições. Bom jogo!`,
    [
      {
        label: "Fechar",
        primary: true,
        onClick: () => finishTutorial(false),
      },
    ]
  );
  $("tutorialSkipBtn")?.classList.add("hidden");
}

function finishTutorial(skipped) {
  markDone();
  active = false;
  phase = null;
  matchStarted = false;
  clearHole();
  allowedSelectors = [];
  const tip = $("tutorialMatchTip");
  tip?.classList.add("hidden");
  showRoot(false);
  document.body.removeAttribute("data-tutorial-phase");
  resetMenuChrome();
  if (resizeObs) {
    window.removeEventListener("resize", scheduleHole);
    window.removeEventListener("scroll", scheduleHole, true);
    resizeObs = null;
  }
  if (skipped) {
    /* silencioso */
  }
}

function onGatePointer(e) {
  if (!active) return;
  if (phase === PHASE.IN_MATCH) return;
  if (e.target.closest?.("#tutorialRoot")) return;

  if (phase === PHASE.INTRO || phase === PHASE.FINALE) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    return;
  }

  const ok = allowedSelectors.some((sel) => {
    try {
      return e.target.closest?.(sel);
    } catch {
      return false;
    }
  });
  if (ok) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();
}

function onGateClick(e) {
  onGatePointer(e);
}

function onDocClick(e) {
  if (!active) return;
  const t = e.target;

  if (phase === PHASE.ACCOUNT_CLICK && t.closest?.("#openAccountBtn")) {
    setTimeout(() => goAccountExplain(), 120);
    return;
  }
  if (phase === PHASE.OPTIONS_CLICK && t.closest?.("#ffOptionsBtn")) {
    setTimeout(() => {
      if (!$("ffGameOptionsPanel")?.classList.contains("hidden")) goOptionsExplain();
    }, 80);
    return;
  }
  if (phase === PHASE.ARSENAL_CLICK && t.closest?.("#openArsenalBtn")) {
    setTimeout(() => goArsenalExplain(), 120);
    return;
  }
  if (phase === PHASE.SHOP_CLICK && t.closest?.("#openSoloBtn")) {
    setTimeout(() => goShopExplain(), 120);
    return;
  }
  if (phase === PHASE.MAPS_CLICK && t.closest?.("#ffMapPickerBtn")) {
    setTimeout(() => goMapsTour(0), 160);
    return;
  }
  if (phase === PHASE.MAPS_PICK && t.closest?.("#ffMapCardGrid .map-btn")) {
    setTimeout(() => goStartClick(), 200);
    return;
  }
  if (phase === PHASE.START_CLICK && t.closest?.("#startBtn")) {
    setTimeout(() => goInMatch(), 100);
  }
}

function bindGlobal() {
  window.__strikeZoneOnMatchStart = () => {
    if (!active) return;
    if (phase === PHASE.START_CLICK || phase === PHASE.IN_MATCH) goInMatch();
  };

  window.__strikeZoneOnMatchEnd = () => {
    if (!active) return;
    if (matchStarted || phase === PHASE.IN_MATCH) goFinale();
  };

  window.__strikeZoneOnTableGamesClose = () => {
    if (!active) return;
    if (matchStarted || phase === PHASE.IN_MATCH) goFinale();
  };

  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener("click", onGateClick, true);
  document.addEventListener("touchstart", onGatePointer, { capture: true, passive: false });
  document.addEventListener("click", onDocClick, false);
  window.addEventListener("resize", scheduleHole);
  window.addEventListener("scroll", scheduleHole, true);
  resizeObs = true;
}

export function startTutorial({ force = false } = {}) {
  if (!force && isTutorialDone()) return false;
  ensureRoot();
  active = true;
  matchStarted = false;
  mapTourIndex = 0;
  showRoot(true);
  bindGlobal();
  resetMenuChrome();
  goIntro();
  return true;
}

export function maybeStartTutorial() {
  if (isTutorialDone()) return false;
  const params = new URLSearchParams(location.search);
  if (params.get("tutorial") === "0") return false;
  // Pequeno delay pra hub montar (fab, mapas, etc.)
  setTimeout(() => startTutorial(), 600);
  return true;
}

window.strikeZoneStartTutorial = () => startTutorial({ force: true });
window.strikeZoneTutorialActive = () => active;

if (new URLSearchParams(location.search).get("tutorial") === "1") {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

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
let uiWatchTimer = 0;
let reportImageDataUrl = null;
let reportBusy = false;
let hooksInstalled = false;

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
  if (root && !$("tutorialReportModal")) {
    root.remove();
    root = null;
  }
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
    <button type="button" id="tutorialErrorLink" class="tutorial-error-link">algum erro?</button>
    <div id="tutorialMatchTip" class="tutorial-match-tip hidden" aria-live="polite"></div>
    <div id="tutorialReportModal" class="tutorial-report-modal hidden" aria-hidden="true">
      <div class="tutorial-report-backdrop" data-report-close="1"></div>
      <div class="tutorial-report-panel" role="dialog" aria-labelledby="tutorialReportTitle">
        <div class="tutorial-report-head">
          <strong id="tutorialReportTitle">Reportar erro no tutorial</strong>
          <button type="button" class="shop-close" data-report-close="1" aria-label="Fechar">✕</button>
        </div>
        <p class="tutorial-report-sub">Conta o que travou ou ficou estranho. Dá pra anexar um print (sem QR code).</p>
        <label class="tutorial-report-label" for="tutorialReportText">O que aconteceu?</label>
        <textarea id="tutorialReportText" class="tutorial-report-text" rows="4" maxlength="1200" placeholder="Ex: abri os mapas e o tutorial não avançou..."></textarea>
        <label class="tutorial-report-label" for="tutorialReportImage">Print do erro (opcional)</label>
        <input type="file" id="tutorialReportImage" class="tutorial-report-file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <p id="tutorialReportImgHint" class="tutorial-report-hint"></p>
        <div id="tutorialReportPreviewWrap" class="tutorial-report-preview-wrap hidden">
          <img id="tutorialReportPreview" class="tutorial-report-preview" alt="Prévia" />
          <button type="button" id="tutorialReportClearImg" class="tutorial-btn">Remover imagem</button>
        </div>
        <p id="tutorialReportStatus" class="tutorial-report-status"></p>
        <div class="tutorial-report-actions">
          <button type="button" id="tutorialReportSend" class="tutorial-btn tutorial-btn-primary">Enviar</button>
          <button type="button" class="tutorial-btn" data-report-close="1">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  $("tutorialSkipBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    finishTutorial(true);
  });

  $("tutorialErrorLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openReportModal();
  });

  bindReportModal(root);

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
  closeReportModal();
  showRoot(false);
  document.body.removeAttribute("data-tutorial-phase");
  resetMenuChrome();
  stopUiWatch();
  if (resizeObs) {
    window.removeEventListener("resize", scheduleHole);
    window.removeEventListener("scroll", scheduleHole, true);
    resizeObs = null;
  }
  if (skipped) {
    /* silencioso */
  }
}

function isMapsOpen() {
  const el = $("ffMapFullscreen");
  return !!el && !el.classList.contains("hidden");
}

function isAccountOpen() {
  const el = $("accountModal");
  return !!el && !el.classList.contains("hidden");
}

function isOptionsOpen() {
  const el = $("ffGameOptionsPanel");
  return !!el && !el.classList.contains("hidden");
}

function isHubOpen(panel) {
  const el = $(panel);
  return !!el && !el.classList.contains("hidden") && el.classList.contains("active");
}

/** Avança se a UI já abriu — cobre stopPropagation dos botões do hub/mapas */
function syncUiPhase() {
  if (!active) return;

  if (phase === PHASE.ACCOUNT_CLICK && isAccountOpen()) {
    goAccountExplain();
    return;
  }
  if (phase === PHASE.OPTIONS_CLICK && isOptionsOpen()) {
    goOptionsExplain();
    return;
  }
  if (phase === PHASE.ARSENAL_CLICK && isHubOpen("ffHubPanelArsenal")) {
    goArsenalExplain();
    return;
  }
  if (phase === PHASE.SHOP_CLICK && isHubOpen("ffHubPanelShop")) {
    goShopExplain();
    return;
  }
  if (phase === PHASE.MAPS_CLICK && isMapsOpen()) {
    goMapsTour(0);
  }
}

function startUiWatch() {
  stopUiWatch();
  uiWatchTimer = window.setInterval(syncUiPhase, 220);
}

function stopUiWatch() {
  if (uiWatchTimer) {
    clearInterval(uiWatchTimer);
    uiWatchTimer = 0;
  }
}

function installMenuHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  const wrap = (key, after) => {
    const prev = window[key];
    if (typeof prev !== "function") return false;
    if (prev.__szTutorialHook) return true;
    const hooked = function (...args) {
      const result = prev.apply(this, args);
      try {
        after?.(args, result);
      } catch {
        /* ignore */
      }
      return result;
    };
    hooked.__szTutorialHook = true;
    window[key] = hooked;
    return true;
  };

  const tryHook = () => {
    wrap("openMapFullscreen", () => {
      if (active && phase === PHASE.MAPS_CLICK) {
        setTimeout(() => {
          if (phase === PHASE.MAPS_CLICK && isMapsOpen()) goMapsTour(0);
        }, 40);
      }
    });
    wrap("strikeZoneSelectMap", () => {
      if (active && phase === PHASE.MAPS_PICK) {
        setTimeout(() => {
          if (phase === PHASE.MAPS_PICK) goStartClick();
        }, 80);
      }
    });
  };

  tryHook();
  // map-view / menu-init podem carregar depois
  setTimeout(tryHook, 400);
  setTimeout(tryHook, 1200);
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

/** Capture: roda ANTES do stopPropagation dos botões de mapa/hub */
function onAdvanceCapture(e) {
  if (!active) return;
  const t = e.target;

  if (phase === PHASE.ACCOUNT_CLICK && t.closest?.("#openAccountBtn")) {
    setTimeout(() => {
      if (phase === PHASE.ACCOUNT_CLICK) syncUiPhase();
    }, 80);
    return;
  }
  if (phase === PHASE.OPTIONS_CLICK && t.closest?.("#ffOptionsBtn")) {
    setTimeout(() => {
      if (phase === PHASE.OPTIONS_CLICK) syncUiPhase();
    }, 80);
    return;
  }
  if (phase === PHASE.ARSENAL_CLICK && t.closest?.("#openArsenalBtn")) {
    setTimeout(() => {
      if (phase === PHASE.ARSENAL_CLICK) syncUiPhase();
    }, 80);
    return;
  }
  if (phase === PHASE.SHOP_CLICK && t.closest?.("#openSoloBtn")) {
    setTimeout(() => {
      if (phase === PHASE.SHOP_CLICK) syncUiPhase();
    }, 80);
    return;
  }
  if (phase === PHASE.MAPS_CLICK && t.closest?.("#ffMapPickerBtn")) {
    setTimeout(() => {
      if (phase === PHASE.MAPS_CLICK) {
        if (isMapsOpen()) goMapsTour(0);
        else syncUiPhase();
      }
    }, 60);
    return;
  }
  if (phase === PHASE.MAPS_PICK && t.closest?.("#ffMapCardGrid .map-btn, .map-btn[data-map]")) {
    setTimeout(() => {
      if (phase === PHASE.MAPS_PICK) goStartClick();
    }, 100);
    return;
  }
  if (phase === PHASE.START_CLICK && t.closest?.("#startBtn")) {
    setTimeout(() => {
      if (phase === PHASE.START_CLICK) goInMatch();
    }, 100);
  }
}

/* ——— Reportar erro do tutorial ——— */

function setReportStatus(msg, ok = false) {
  const el = $("tutorialReportStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("ok", !!ok && !!msg);
  el.classList.toggle("err", !ok && !!msg);
}

function clearReportImage() {
  reportImageDataUrl = null;
  const input = $("tutorialReportImage");
  if (input) input.value = "";
  $("tutorialReportPreviewWrap")?.classList.add("hidden");
  const hint = $("tutorialReportImgHint");
  if (hint) hint.textContent = "";
}

function openReportModal() {
  const modal = $("tutorialReportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  setReportStatus("");
  $("tutorialReportText")?.focus();
}

function closeReportModal() {
  const modal = $("tutorialReportModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

/**
 * Heurística pra bloquear imagem tipo QR / código de barras 2D
 * (padrões de módulos B/W + cantos estilo finder).
 */
function looksLikeQrOrSimilar(imageData, w, h) {
  const { data } = imageData;
  const bin = new Uint8Array(w * h);
  let dark = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const y = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
    bin[i] = y < 140 ? 1 : 0;
    dark += bin[i];
  }
  const darkRatio = dark / (w * h);
  if (darkRatio < 0.12 || darkRatio > 0.88) return false;

  // Transições horizontais altas = grade tipo QR
  let transitions = 0;
  let samples = 0;
  for (let y = 0; y < h; y += 2) {
    let prev = bin[y * w];
    for (let x = 1; x < w; x++) {
      const v = bin[y * w + x];
      if (v !== prev) transitions++;
      prev = v;
      samples++;
    }
  }
  const tRate = transitions / Math.max(1, samples);

  function finderScore(ox, oy, size) {
    // Procura cruz 1:1:3:1:1 aproximada no canto
    let best = 0;
    for (let row = oy; row < oy + size && row < h; row++) {
      let runs = [];
      let cur = bin[row * w + ox];
      let len = 1;
      for (let x = ox + 1; x < ox + size && x < w; x++) {
        const v = bin[row * w + x];
        if (v === cur) len++;
        else {
          runs.push({ v: cur, len });
          cur = v;
          len = 1;
        }
      }
      runs.push({ v: cur, len });
      for (let i = 0; i + 4 < runs.length; i++) {
        const a = runs[i];
        const b = runs[i + 1];
        const c = runs[i + 2];
        const d = runs[i + 3];
        const e = runs[i + 4];
        if (a.v !== 1 || b.v !== 0 || c.v !== 1 || d.v !== 0 || e.v !== 1) continue;
        const unit = (a.len + b.len + c.len + d.len + e.len) / 7;
        if (unit < 1.2) continue;
        const ok =
          Math.abs(a.len - unit) < unit * 0.75 &&
          Math.abs(b.len - unit) < unit * 0.75 &&
          Math.abs(c.len - unit * 3) < unit * 1.2 &&
          Math.abs(d.len - unit) < unit * 0.75 &&
          Math.abs(e.len - unit) < unit * 0.75;
        if (ok) best++;
      }
    }
    return best;
  }

  const corner = Math.max(18, Math.floor(Math.min(w, h) * 0.28));
  const finders =
    finderScore(0, 0, corner) +
    finderScore(w - corner, 0, corner) +
    finderScore(0, h - corner, corner);

  // Grade bem marcada + finder-like → bloqueia
  if (tRate > 0.22 && finders >= 2) return true;
  if (tRate > 0.28 && finders >= 1) return true;
  if (tRate > 0.34) return true;
  return false;
}

async function validateReportImage(file) {
  if (!file) return { ok: true, dataUrl: null };
  if (!file.type.startsWith("image/")) {
    return { ok: false, msg: "Envia só imagem (PNG, JPG ou WebP)." };
  }
  if (file.size > 2.5 * 1024 * 1024) {
    return { ok: false, msg: "Imagem grande demais (máx. 2,5 MB)." };
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Imagem inválida"));
    el.src = dataUrl;
  });

  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);

  if (looksLikeQrOrSimilar(imageData, size, size)) {
    return {
      ok: false,
      msg: "Essa imagem parece um QR code (ou similar). Manda um print da tela do jogo.",
    };
  }

  return { ok: true, dataUrl };
}

function bindReportModal(root) {
  root.querySelectorAll("[data-report-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeReportModal();
    });
  });

  $("tutorialReportClearImg")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearReportImage();
  });

  $("tutorialReportImage")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    setReportStatus("Checando imagem…");
    try {
      const res = await validateReportImage(file);
      if (!res.ok) {
        clearReportImage();
        setReportStatus(res.msg, false);
        return;
      }
      reportImageDataUrl = res.dataUrl;
      const wrap = $("tutorialReportPreviewWrap");
      const prev = $("tutorialReportPreview");
      if (prev && res.dataUrl) {
        prev.src = res.dataUrl;
        wrap?.classList.remove("hidden");
      }
      setReportStatus(res.dataUrl ? "Imagem ok." : "", true);
      const hint = $("tutorialReportImgHint");
      if (hint) hint.textContent = res.dataUrl ? "" : "";
    } catch {
      clearReportImage();
      setReportStatus("Não deu pra ler essa imagem.", false);
    }
  });

  $("tutorialReportSend")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (reportBusy) return;
    const text = $("tutorialReportText")?.value?.trim() || "";
    if (text.length < 8) {
      setReportStatus("Escreve um pouco mais sobre o erro (mín. 8 caracteres).", false);
      return;
    }
    reportBusy = true;
    setReportStatus("Enviando…");
    try {
      const res = await fetch("/api/tutorial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.slice(0, 1200),
          phase: phase || null,
          playerName: playerName(),
          imageDataUrl: reportImageDataUrl || null,
          userAgent: navigator.userAgent.slice(0, 240),
          url: location.href.slice(0, 240),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setReportStatus(data.error || "Falha ao enviar. Tenta de novo.", false);
        return;
      }
      setReportStatus("Valeu! Report enviado.", true);
      if ($("tutorialReportText")) $("tutorialReportText").value = "";
      clearReportImage();
      setTimeout(() => closeReportModal(), 900);
    } catch {
      setReportStatus("Servidor offline ou sem rede.", false);
    } finally {
      reportBusy = false;
    }
  });
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

  installMenuHooks();

  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener("click", onGateClick, true);
  document.addEventListener("touchstart", onGatePointer, { capture: true, passive: false });
  // Capture: detecta clique mesmo com stopPropagation nos mapas
  document.addEventListener("click", onAdvanceCapture, true);
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
  startUiWatch();
  resetMenuChrome();
  goIntro();
  return true;
}

export function maybeStartTutorial() {
  if (isTutorialDone()) return false;
  const params = new URLSearchParams(location.search);
  if (params.get("tutorial") === "0") return false;
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

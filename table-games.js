/**
 * Área Jogos de Mesa — lobby de dificuldade + shell imersivo
 */

import { BOT_TIERS } from "./table-games-bots.js";
import {
  unlockTableAudio,
  startTableAmbience,
  stopTableAmbience,
} from "./table-games-audio.js";
import { mountMatchChrome } from "./table-games-match.js";
import { mountChessGame } from "./table-game-chess.js";
import { mountCheckersGame } from "./table-game-checkers.js";
import { mountPoolGame } from "./table-game-pool.js";

export const TABLE_GAMES = {
  chess: {
    id: "chess",
    name: "Xadrez",
    desc: "Tabuleiro clássico · você joga de brancas",
    ambience: "salon",
    mount: mountChessGame,
  },
  dama: {
    id: "dama",
    name: "Dama",
    desc: "Damas 8×8 · capturas obrigatórias · dama voadora",
    ambience: "salon",
    mount: mountCheckersGame,
  },
  sinuca: {
    id: "sinuca",
    name: "Sinuca",
    desc: "Mesa verde · 8-ball · mira com o mouse",
    ambience: "pool",
    mount: mountPoolGame,
  },
};

export function isTableGameMap(mapId) {
  return !!TABLE_GAMES[mapId];
}

let shell = null;
let cleanupGame = null;
let cleanupChrome = null;
let currentGameId = null;
let matchChrome = null;
let gameApi = null;

function ensureShell() {
  if (shell) return shell;
  shell = document.createElement("div");
  shell.id = "tableGamesScreen";
  shell.className = "tg-screen hidden";
  shell.setAttribute("aria-hidden", "true");
  shell.innerHTML = `
    <div class="tg-bg" data-bg></div>
    <div class="tg-vignette"></div>
    <div class="tg-lobby" data-lobby>
      <header class="tg-lobby-head">
        <p class="tg-eyebrow">Jogos de Mesa</p>
        <h1 class="tg-lobby-title" data-title>Xadrez</h1>
        <p class="tg-lobby-desc" data-desc></p>
      </header>
      <section class="tg-diff-section" aria-label="Dificuldade do bot">
        <h2 class="tg-diff-heading">Escolha o bot</h2>
        <div class="tg-diff-grid" data-diffs></div>
      </section>
      <footer class="tg-lobby-foot">
        <button type="button" class="tg-btn tg-btn-ghost" data-back>Voltar ao menu</button>
        <button type="button" class="tg-btn tg-btn-primary" data-start disabled>Entrar na partida</button>
      </footer>
    </div>
    <div class="tg-match hidden" data-match>
      <div class="tg-match-mount" data-mount></div>
    </div>
  `;
  document.body.appendChild(shell);

  const diffGrid = shell.querySelector("[data-diffs]");
  diffGrid.innerHTML = Object.values(BOT_TIERS)
    .map(
      (t) =>
        `<button type="button" class="tg-diff-card" data-tier="${t.id}">` +
        `<span class="tg-diff-label">${t.label}</span>` +
        `<span class="tg-diff-blurb">${t.blurb}</span>` +
        `</button>`
    )
    .join("");

  diffGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    selectTier(btn.dataset.tier);
  });

  shell.querySelector("[data-back]").addEventListener("click", closeTableGames);
  shell.querySelector("[data-start]").addEventListener("click", beginMatch);

  return shell;
}

let selectedTier = null;

function selectTier(id) {
  selectedTier = id;
  shell.querySelectorAll("[data-tier]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.tier === id);
  });
  const start = shell.querySelector("[data-start]");
  if (start) start.disabled = !id;
}

function tearDownMatch() {
  if (cleanupGame) {
    cleanupGame();
    cleanupGame = null;
  }
  if (cleanupChrome) {
    cleanupChrome();
    cleanupChrome = null;
  }
  matchChrome = null;
  gameApi = null;
}

function showLobby(gameId) {
  const game = TABLE_GAMES[gameId];
  if (!game) return;
  currentGameId = gameId;
  selectedTier = null;
  tearDownMatch();
  const el = ensureShell();
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  el.dataset.game = gameId;
  el.querySelector("[data-title]").textContent = game.name;
  el.querySelector("[data-desc]").textContent = game.desc;
  el.querySelector("[data-lobby]").classList.remove("hidden");
  el.querySelector("[data-match]").classList.add("hidden");
  el.querySelectorAll("[data-tier]").forEach((b) => b.classList.remove("selected"));
  el.querySelector("[data-start]").disabled = true;
  document.getElementById("menu")?.classList.add("hidden");
  document.body.classList.add("tg-open");
  unlockTableAudio();
  startTableAmbience(game.ambience);
}

function beginMatch() {
  const game = TABLE_GAMES[currentGameId];
  if (!game || !selectedTier) return;
  unlockTableAudio();
  tearDownMatch();

  const matchEl = shell.querySelector("[data-match]");
  const mount = shell.querySelector("[data-mount]");
  mount.innerHTML = "";
  shell.querySelector("[data-lobby]").classList.add("hidden");
  matchEl.classList.remove("hidden");

  matchChrome = mountMatchChrome(matchEl, {
    onResign: () => gameApi?.resign?.(),
    onOfferDraw: () => gameApi?.offerDraw?.(),
    onTimeout: (kind) => gameApi?.timeout?.(kind),
  });
  cleanupChrome = () => {
    matchChrome?.destroy();
    matchChrome = null;
  };

  cleanupGame = game.mount(mount, {
    botTier: selectedTier,
    match: matchChrome,
    onExit: () => showLobby(currentGameId),
    onEnd: () => {
      matchChrome?.endPlayerClock();
      matchChrome?.setActionsEnabled(false);
    },
    onBind(api) {
      gameApi = api;
    },
  });
}

export function openTableGames(gameId) {
  if (!TABLE_GAMES[gameId]) return false;
  showLobby(gameId);
  return true;
}

export function closeTableGames() {
  tearDownMatch();
  stopTableAmbience();
  if (shell) {
    shell.classList.add("hidden");
    shell.setAttribute("aria-hidden", "true");
    shell.querySelector("[data-match]")?.classList.add("hidden");
    shell.querySelector("[data-lobby]")?.classList.remove("hidden");
  }
  document.body.classList.remove("tg-open");
  const menu = document.getElementById("menu");
  if (menu) menu.classList.remove("hidden");
}

window.openTableGames = openTableGames;
window.closeTableGames = closeTableGames;
window.isTableGameMap = isTableGameMap;
window.TABLE_GAMES = TABLE_GAMES;

/**
 * Mesa colorida estilo salão (referência Truco) — felt coral + papel creme
 */

import { playCardDeal, playCardPlay } from "./table-games-audio.js";

export const SUITS = ["♣", "♥", "♠", "♦"];
export const SUIT_COLORS = { "♣": "#1a1a22", "♥": "#c02828", "♠": "#1a1a22", "♦": "#c02828" };

export function createSalonShell({
  title,
  subtitle = "",
  youName = "Você",
  botName = "Bot",
  accent = "coral",
}) {
  const wrap = document.createElement("div");
  wrap.className = `tg-salon tg-salon-${accent}`;
  wrap.innerHTML = `
    <div class="tg-salon-badge">MESA · ${title.toUpperCase()}</div>
    <div class="tg-salon-score" data-score-bar>
      <span data-score-label>Partida</span>
      <strong data-score-mid></strong>
      <span class="tg-salon-totals">
        <em class="you" data-score-you>0</em>
        <span>×</span>
        <em class="bot" data-score-bot>0</em>
      </span>
    </div>
    <div class="tg-salon-table">
      <div class="tg-salon-seat top">
        <div class="tg-salon-avatar bot">${botName.slice(0, 1).toUpperCase()}</div>
        <div class="tg-salon-name bot">${botName}</div>
      </div>
      <div class="tg-salon-seat left hidden" data-seat-left></div>
      <div class="tg-salon-seat right hidden" data-seat-right></div>
      <div class="tg-salon-mat" data-mat>
        <div class="tg-salon-center" data-center></div>
      </div>
      <div class="tg-salon-prop" aria-hidden="true">🥥</div>
      <div class="tg-salon-seat bottom">
        <div class="tg-salon-avatar you">${youName.slice(0, 1).toUpperCase()}</div>
        <div class="tg-salon-name you">${youName}</div>
      </div>
    </div>
    <p class="tg-salon-status" data-status>${subtitle}</p>
    <div class="tg-salon-hand" data-hand></div>
    <div class="tg-salon-actions" data-actions></div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  return wrap;
}

export function makeCardEl(card, { faceDown = false, playable = false, small = false } = {}) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `tg-playing-card${faceDown ? " back" : ""}${small ? " small" : ""}${playable ? " playable" : ""}`;
  if (faceDown) {
    el.innerHTML = `<span class="tg-card-back-pattern"></span>`;
    el.disabled = true;
    return el;
  }
  const red = card.suit === "♥" || card.suit === "♦";
  el.classList.toggle("red", red);
  el.innerHTML = `
    <span class="tg-card-rank">${card.rank}</span>
    <span class="tg-card-suit">${card.suit}</span>
    <span class="tg-card-suit big">${card.suit}</span>
  `;
  if (!playable) el.disabled = true;
  return el;
}

export function spanishDeck40() {
  const ranks = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of ranks) deck.push({ rank, suit, id: `${rank}${suit}` });
  }
  return shuffle(deck);
}

export function frenchDeck52() {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of ranks) deck.push({ rank, suit, id: `${rank}${suit}` });
  }
  return shuffle(deck);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function animateDeal(handEl, cards, makeEl, delay = 90) {
  handEl.innerHTML = "";
  cards.forEach((c, i) => {
    setTimeout(() => {
      playCardDeal();
      handEl.appendChild(makeEl(c, i));
    }, i * delay);
  });
  return cards.length * delay + 80;
}

export function clearAndPlayCenter(centerEl, cardEls) {
  centerEl.innerHTML = "";
  cardEls.forEach((el) => {
    playCardPlay();
    centerEl.appendChild(el);
  });
}

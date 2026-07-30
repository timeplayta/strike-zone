/**
 * Jogos de mesa — pacote 2: Batalha Naval e General (dados)
 */

import {
  playPiecePlace,
  playIllegal,
  playWin,
  playLose,
  playFlip,
  playChip,
  playBotThink,
  speakLine,
} from "./table-games-audio.js";
import { getBotTier, pickMoveWithWisdom } from "./table-games-bots.js";

function bindCommon(wrap, { onExit, restart }) {
  wrap.querySelector("[data-exit]")?.addEventListener("click", () => onExit?.());
  wrap.querySelector("[data-restart]")?.addEventListener("click", () => restart?.());
}

function endVoice() {
  /* voz e overlay centralizados em showMatchResult via onEnd */
}

/* ═══════════ Batalha Naval ═══════════ */
const BN_SIZE = 8;
const BN_SHIPS = [4, 3, 3, 2, 2]; // 14 células

function bnPlaceFleet() {
  // grid[r][c] = índice do navio ou -1
  const grid = Array.from({ length: BN_SIZE }, () => Array(BN_SIZE).fill(-1));
  const ships = [];
  for (let s = 0; s < BN_SHIPS.length; s++) {
    const len = BN_SHIPS[s];
    let placed = false;
    for (let tries = 0; tries < 400 && !placed; tries++) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? BN_SIZE : BN_SIZE - len + 1));
      const c = Math.floor(Math.random() * (horiz ? BN_SIZE - len + 1 : BN_SIZE));
      let ok = true;
      // navios não podem se tocar (nem na diagonal)
      for (let k = -1; k <= len && ok; k++) {
        for (let d = -1; d <= 1 && ok; d++) {
          const rr = horiz ? r + d : r + k;
          const cc = horiz ? c + k : c + d;
          if (rr < 0 || rr >= BN_SIZE || cc < 0 || cc >= BN_SIZE) continue;
          if (grid[rr][cc] !== -1) ok = false;
        }
      }
      if (!ok) continue;
      const cells = [];
      for (let k = 0; k < len; k++) {
        const rr = horiz ? r : r + k;
        const cc = horiz ? c + k : c;
        grid[rr][cc] = s;
        cells.push([rr, cc]);
      }
      ships.push({ len, cells, hits: 0 });
      placed = true;
    }
    if (!placed) return bnPlaceFleet(); // recomeça se travou
  }
  return { grid, ships };
}

export function mountBattleshipGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let you, enemy; // { grid, ships }
  let youShots, enemyShots; // 0 nada, 1 água, 2 acerto
  let turn = "you";
  let over = false;
  let botTargets = [];

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-simple-wrap tg-bn-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Batalha Naval</div>
      <div class="tg-board-status" data-status>Sua vez — atire na frota inimiga</div>
      <div class="tg-board-meta">Bot: ${tier.label} · acertou, atira de novo</div>
    </div>
    <div class="tg-bn-boards">
      <div class="tg-bn-side">
        <p class="tg-bn-label">Frota inimiga <span data-enemy-left></span></p>
        <div class="tg-bn-grid enemy" data-enemy-board></div>
      </div>
      <div class="tg-bn-side">
        <p class="tg-bn-label">Sua frota <span data-you-left></span></p>
        <div class="tg-bn-grid mine" data-you-board></div>
      </div>
    </div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);
  const enemyBoardEl = wrap.querySelector("[data-enemy-board]");
  const youBoardEl = wrap.querySelector("[data-you-board]");
  const statusEl = wrap.querySelector("[data-status]");
  const enemyLeftEl = wrap.querySelector("[data-enemy-left]");
  const youLeftEl = wrap.querySelector("[data-you-left]");

  function aliveCells(fleet, shots) {
    let n = 0;
    for (let r = 0; r < BN_SIZE; r++)
      for (let c = 0; c < BN_SIZE; c++)
        if (fleet.grid[r][c] !== -1 && shots[r][c] !== 2) n++;
    return n;
  }

  function render() {
    enemyBoardEl.innerHTML = "";
    for (let r = 0; r < BN_SIZE; r++) {
      for (let c = 0; c < BN_SIZE; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        const shot = youShots[r][c];
        cell.className = "tg-bn-cell";
        if (shot === 1) cell.classList.add("miss");
        if (shot === 2) cell.classList.add("hit");
        cell.textContent = shot === 2 ? "✸" : shot === 1 ? "•" : "";
        cell.disabled = over || turn !== "you" || shot !== 0;
        cell.onclick = () => fire(r, c);
        enemyBoardEl.appendChild(cell);
      }
    }
    youBoardEl.innerHTML = "";
    for (let r = 0; r < BN_SIZE; r++) {
      for (let c = 0; c < BN_SIZE; c++) {
        const cell = document.createElement("span");
        const shot = enemyShots[r][c];
        const ship = you.grid[r][c] !== -1;
        cell.className = "tg-bn-cell small";
        if (ship) cell.classList.add("ship");
        if (shot === 1) cell.classList.add("miss");
        if (shot === 2) cell.classList.add("hit");
        cell.textContent = shot === 2 ? "✸" : shot === 1 ? "•" : "";
        youBoardEl.appendChild(cell);
      }
    }
    enemyLeftEl.textContent = `· ${aliveCells(enemy, youShots)} células`;
    youLeftEl.textContent = `· ${aliveCells(you, enemyShots)} células`;
  }

  function finish(w) {
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    statusEl.textContent = w === "you" ? "Frota inimiga afundada — você venceu!" : "Sua frota afundou. Bot venceu.";
    render();
    endVoice(w);
    onEnd?.(w);
  }

  function fire(r, c) {
    if (over || turn !== "you" || youShots[r][c] !== 0) return;
    const shipIdx = enemy.grid[r][c];
    if (shipIdx !== -1) {
      youShots[r][c] = 2;
      const ship = enemy.ships[shipIdx];
      ship.hits++;
      playPiecePlace();
      if (enemy.ships.every((s) => s.hits >= s.len)) {
        finish("you");
        return;
      }
      statusEl.textContent = ship.hits >= ship.len ? `Afundou um navio de ${ship.len}! Atire de novo` : "Acertou! Atire de novo";
      if (ship.hits >= ship.len) playChip();
      render();
    } else {
      youShots[r][c] = 1;
      playFlip();
      match?.endPlayerClock?.();
      turn = "bot";
      statusEl.textContent = "Água. Vez do bot…";
      render();
      setTimeout(botFire, 600);
    }
  }

  function botCandidates() {
    const cands = [];
    for (let r = 0; r < BN_SIZE; r++)
      for (let c = 0; c < BN_SIZE; c++)
        if (enemyShots[r][c] === 0) cands.push([r, c]);
    return cands;
  }

  function botFire() {
    if (over) return;
    playBotThink();
    let target = null;
    // modo caça: persegue vizinhos de acertos (bots melhores usam mais)
    botTargets = botTargets.filter(([r, c]) => enemyShots[r][c] === 0);
    if (botTargets.length && Math.random() < 0.35 + tier.pocketBias * 0.6) {
      target = botTargets.shift();
    }
    if (!target) {
      const cands = botCandidates();
      if (!cands.length) return;
      // bots melhores preferem células com paridade (tabuleiro xadrez)
      const scored = cands.map(([r, c]) => ({
        move: [r, c],
        score: ((r + c) % 2 === 0 ? 2 : 0) * tier.pocketBias + Math.random(),
      }));
      const pick = pickMoveWithWisdom(scored, tier.id);
      target = pick?.move ?? cands[0];
    }
    const [r, c] = target;
    const shipIdx = you.grid[r][c];
    if (shipIdx !== -1) {
      enemyShots[r][c] = 2;
      you.ships[shipIdx].hits++;
      playPiecePlace();
      // adiciona vizinhos na fila de caça
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
        if (rr >= 0 && rr < BN_SIZE && cc >= 0 && cc < BN_SIZE && enemyShots[rr][cc] === 0) {
          botTargets.push([rr, cc]);
        }
      });
      if (you.ships.every((s) => s.hits >= s.len)) {
        finish("bot");
        return;
      }
      statusEl.textContent = "Bot acertou e atira de novo…";
      render();
      setTimeout(botFire, 650);
    } else {
      enemyShots[r][c] = 1;
      playFlip();
      turn = "you";
      statusEl.textContent = "Bot errou. Sua vez";
      render();
      match?.startPlayerClock?.(false);
    }
  }

  function reset() {
    you = bnPlaceFleet();
    enemy = bnPlaceFleet();
    youShots = Array.from({ length: BN_SIZE }, () => Array(BN_SIZE).fill(0));
    enemyShots = Array.from({ length: BN_SIZE }, () => Array(BN_SIZE).fill(0));
    turn = "you";
    over = false;
    botTargets = [];
    match?.setActionsEnabled?.(true);
    statusEl.textContent = "Sua vez — atire na frota inimiga";
    render();
    match?.startPlayerClock?.(true);
  }

  bindCommon(wrap, { onExit, restart: reset });
  onBind?.({
    resign: () => {
      if (!over) finish("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      if (over) return;
      statusEl.textContent = "Tempo esgotado.";
      finish("bot");
    },
  });
  reset();
  return () => wrap.remove();
}

/* ═══════════ General (dados, estilo Yahtzee) ═══════════ */
const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const GEN_CATS = [
  { id: "uns", label: "Uns (1)", score: (d) => sumFace(d, 1) },
  { id: "dois", label: "Dois (2)", score: (d) => sumFace(d, 2) },
  { id: "tres", label: "Três (3)", score: (d) => sumFace(d, 3) },
  { id: "quatros", label: "Quatros (4)", score: (d) => sumFace(d, 4) },
  { id: "cincos", label: "Cincos (5)", score: (d) => sumFace(d, 5) },
  { id: "seis", label: "Seis (6)", score: (d) => sumFace(d, 6) },
  { id: "trinca", label: "Trinca", score: (d) => (maxRepeat(d) >= 3 ? sumAll(d) : 0) },
  { id: "quadra", label: "Quadra", score: (d) => (maxRepeat(d) >= 4 ? sumAll(d) : 0) },
  { id: "full", label: "Full House", score: (d) => (isFull(d) ? 25 : 0) },
  { id: "seq", label: "Sequência", score: (d) => (isStraight(d) ? 30 : 0) },
  { id: "general", label: "GENERAL (5 iguais)", score: (d) => (maxRepeat(d) >= 5 ? 50 : 0) },
];

function sumFace(d, f) {
  return d.filter((x) => x === f).length * f;
}
function sumAll(d) {
  return d.reduce((a, b) => a + b, 0);
}
function counts(d) {
  const c = {};
  d.forEach((x) => (c[x] = (c[x] || 0) + 1));
  return c;
}
function maxRepeat(d) {
  return Math.max(...Object.values(counts(d)));
}
function isFull(d) {
  const g = Object.values(counts(d)).sort((a, b) => b - a);
  return g[0] === 3 && g[1] === 2;
}
function isStraight(d) {
  const s = [...new Set(d)].sort((a, b) => a - b).join("");
  return s === "12345" || s === "23456";
}

export function mountGeneralGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let dice = [1, 1, 1, 1, 1];
  let held = [false, false, false, false, false];
  let rollsLeft = 3;
  let phase = "you"; // you | bot | done
  let over = false;
  let scoreYou = {};
  let scoreBot = {};

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-simple-wrap tg-gen-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">General</div>
      <div class="tg-board-status" data-status>Role os dados!</div>
      <div class="tg-board-meta">Bot: ${tier.label} · 3 rolagens por turno</div>
    </div>
    <div class="tg-gen-dice" data-dice></div>
    <div class="tg-gen-roll">
      <button type="button" class="tg-btn tg-btn-primary" data-roll>Rolar (3)</button>
      <span class="tg-gen-hint" data-hint>Clique num dado para segurar</span>
    </div>
    <div class="tg-gen-table" data-table></div>
    <div class="tg-gen-totals">
      <span>Você: <strong data-total-you>0</strong></span>
      <span>Bot: <strong data-total-bot>0</strong></span>
    </div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);
  const diceEl = wrap.querySelector("[data-dice]");
  const rollBtn = wrap.querySelector("[data-roll]");
  const hintEl = wrap.querySelector("[data-hint]");
  const tableEl = wrap.querySelector("[data-table]");
  const statusEl = wrap.querySelector("[data-status]");
  const totalYouEl = wrap.querySelector("[data-total-you]");
  const totalBotEl = wrap.querySelector("[data-total-bot]");

  function total(sc) {
    return Object.values(sc).reduce((a, b) => a + b, 0);
  }

  function renderDice() {
    diceEl.innerHTML = "";
    dice.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `tg-gen-die${held[i] ? " held" : ""}`;
      b.textContent = DICE_FACES[v];
      b.disabled = over || phase !== "you" || rollsLeft === 3;
      b.onclick = () => {
        held[i] = !held[i];
        renderDice();
      };
      diceEl.appendChild(b);
    });
    rollBtn.textContent = `Rolar (${rollsLeft})`;
    rollBtn.disabled = over || phase !== "you" || rollsLeft <= 0;
    hintEl.textContent =
      phase === "bot"
        ? "Bot jogando…"
        : rollsLeft === 3
          ? "Role os dados para começar o turno"
          : rollsLeft > 0
            ? "Segure dados e role de novo, ou marque uma categoria"
            : "Escolha uma categoria para marcar";
  }

  function renderTable() {
    tableEl.innerHTML = "";
    const head = document.createElement("div");
    head.className = "tg-gen-row head";
    head.innerHTML = `<span>Categoria</span><span>Você</span><span>Bot</span>`;
    tableEl.appendChild(head);
    const canScore = phase === "you" && rollsLeft < 3 && !over;
    GEN_CATS.forEach((cat) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "tg-gen-row";
      const yv = scoreYou[cat.id];
      const bv = scoreBot[cat.id];
      const preview = canScore && yv === undefined ? cat.score(dice) : null;
      row.innerHTML =
        `<span>${cat.label}</span>` +
        `<span class="${yv === undefined ? "free" : ""}">${yv !== undefined ? yv : preview !== null ? `→ ${preview}` : "—"}</span>` +
        `<span>${bv !== undefined ? bv : "—"}</span>`;
      row.disabled = !(canScore && yv === undefined);
      row.onclick = () => scoreCategory(cat);
      tableEl.appendChild(row);
    });
    totalYouEl.textContent = String(total(scoreYou));
    totalBotEl.textContent = String(total(scoreBot));
  }

  function rollDice() {
    if (over || phase !== "you" || rollsLeft <= 0) return;
    for (let i = 0; i < 5; i++) {
      if (!held[i] || rollsLeft === 3) dice[i] = 1 + Math.floor(Math.random() * 6);
    }
    if (rollsLeft === 3) held = [false, false, false, false, false];
    rollsLeft--;
    playFlip();
    renderDice();
    renderTable();
    statusEl.textContent = `Você tirou: ${dice.join(" · ")}`;
  }

  function scoreCategory(cat) {
    if (over || phase !== "you" || rollsLeft === 3 || scoreYou[cat.id] !== undefined) {
      playIllegal();
      return;
    }
    scoreYou[cat.id] = cat.score(dice);
    playPiecePlace();
    match?.endPlayerClock?.();
    if (Object.keys(scoreYou).length >= GEN_CATS.length && Object.keys(scoreBot).length >= GEN_CATS.length) {
      finishMatch();
      return;
    }
    phase = "bot";
    statusEl.textContent = "Vez do bot…";
    renderDice();
    renderTable();
    setTimeout(botTurn, 700);
  }

  function botTurn() {
    if (over) return;
    playBotThink();
    let d = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
    const rerolls = 2;
    for (let roll = 0; roll < rerolls; roll++) {
      // segura a face mais repetida e rola o resto
      const c = counts(d);
      const bestFace = Number(Object.keys(c).reduce((a, b) => (c[a] >= c[b] ? a : b)));
      const keepAll = maxRepeat(d) >= 4 || isFull(d) || isStraight(d);
      if (keepAll && Math.random() < 0.4 + tier.pocketBias) break;
      d = d.map((v) => (v === bestFace ? v : 1 + Math.floor(Math.random() * 6)));
    }
    dice = d;
    // escolhe melhor categoria livre (com ruído por dificuldade)
    const free = GEN_CATS.filter((cat) => scoreBot[cat.id] === undefined);
    const scored = free.map((cat) => ({
      move: cat,
      score: cat.score(d) + Math.random() * (1.2 - tier.pocketBias) * 10,
    }));
    const pick = pickMoveWithWisdom(scored, tier.id);
    const cat = pick?.move ?? free[0];
    scoreBot[cat.id] = cat.score(d);
    playPiecePlace();
    statusEl.textContent = `Bot tirou ${d.join(" · ")} e marcou ${cat.label} (${scoreBot[cat.id]})`;
    if (Object.keys(scoreYou).length >= GEN_CATS.length && Object.keys(scoreBot).length >= GEN_CATS.length) {
      renderTable();
      finishMatch();
      return;
    }
    phase = "you";
    rollsLeft = 3;
    held = [false, false, false, false, false];
    renderDice();
    renderTable();
    match?.startPlayerClock?.(false);
  }

  function finishMatch() {
    over = true;
    phase = "done";
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    const ty = total(scoreYou);
    const tb = total(scoreBot);
    const w = ty > tb ? "you" : ty < tb ? "bot" : "draw";
    statusEl.textContent =
      w === "you" ? `Você venceu! ${ty} × ${tb}` : w === "bot" ? `Bot venceu. ${ty} × ${tb}` : `Empate! ${ty} × ${tb}`;
    renderDice();
    renderTable();
    endVoice(w);
    onEnd?.(w);
  }

  function reset() {
    dice = [1, 1, 1, 1, 1];
    held = [false, false, false, false, false];
    rollsLeft = 3;
    phase = "you";
    over = false;
    scoreYou = {};
    scoreBot = {};
    match?.setActionsEnabled?.(true);
    statusEl.textContent = "Role os dados!";
    renderDice();
    renderTable();
    match?.startPlayerClock?.(true);
  }

  rollBtn.addEventListener("click", rollDice);
  bindCommon(wrap, { onExit, restart: reset });
  onBind?.({
    resign: () => {
      if (over) return;
      over = true;
      statusEl.textContent = "Você desistiu.";
      match?.setActionsEnabled?.(false);
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      if (over) return;
      over = true;
      statusEl.textContent = "Tempo esgotado. Bot venceu.";
      match?.setActionsEnabled?.(false);
      endVoice("bot");
      onEnd?.("bot");
    },
  });
  reset();
  return () => wrap.remove();
}

/**
 * Pacote de jogos de mesa extras — regras jogáveis vs bot
 */

import {
  playPiecePlace,
  playIllegal,
  playWin,
  playLose,
  playCardPlay,
  playCardDeal,
  playFlip,
  playDominoPlace,
  playChip,
  playBotThink,
  announceDealing,
  speakBotReact,
} from "./table-games-audio.js";
import { getBotTier, pickMoveWithWisdom } from "./table-games-bots.js";
import {
  createSalonShell,
  makeCardEl,
  frenchDeck52,
  shuffle,
} from "./table-game-salon.js";

function bindCommon(wrap, { onExit, restart }) {
  wrap.querySelector("[data-exit]")?.addEventListener("click", () => onExit?.());
  wrap.querySelector("[data-restart]")?.addEventListener("click", () => restart?.());
}

function endVoice() {
  /* voz e overlay centralizados em showMatchResult via onEnd */
}

/* ——— Jogo da Velha ——— */
const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function mountTicTacToeGame(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  let board = Array(9).fill(null);
  let playerSymbol = "X";
  let botSymbol = "O";
  let turn = "X"; // X sempre começa, como na regra oficial
  let over = false;
  let chosen = false;
  let lastMove = -1;
  let winLine = null;

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-simple-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Jogo da Velha</div>
      <div class="tg-board-status" data-status>Escolha seu símbolo</div>
      <div class="tg-board-meta">Bot: ${tier.label}</div>
    </div>
    <div class="tg-ttt-choose" data-choose>
      <p class="tg-ttt-choose-title">Você quer jogar de:</p>
      <div class="tg-ttt-choose-btns">
        <button type="button" class="tg-ttt-choose-btn" data-pick="X">✕<span>X · você começa</span></button>
        <button type="button" class="tg-ttt-choose-btn tg-ttt-choose-o" data-pick="O">◯<span>O · bot começa</span></button>
      </div>
    </div>
    <div class="tg-ttt hidden" data-board></div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);
  const boardEl = wrap.querySelector("[data-board]");
  const statusEl = wrap.querySelector("[data-status]");
  const chooseEl = wrap.querySelector("[data-choose]");

  function winner() {
    for (const [a, b, c] of TTT_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(Boolean)) return "draw";
    return null;
  }

  function winningLine(sym) {
    return TTT_LINES.find(([a, b, c]) => board[a] === sym && board[b] === sym && board[c] === sym) || null;
  }

  function render() {
    boardEl.innerHTML = "";
    board.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-ttt-cell";
      if (v) b.dataset.val = v;
      if (i === lastMove) b.classList.add("just-placed");
      if (winLine && winLine.includes(i)) b.classList.add("tg-ttt-win");
      b.textContent = v === "X" ? "✕" : v === "O" ? "◯" : "";
      b.disabled = !chosen || over || !!v || turn !== playerSymbol;
      b.onclick = () => play(i);
      boardEl.appendChild(b);
    });
  }

  function finish(w) {
    over = true;
    winLine = w !== "draw" ? winningLine(w) : null;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    const isPlayer = w === playerSymbol;
    statusEl.textContent = isPlayer ? "Você venceu!" : w === "draw" ? "Empate!" : "Bot venceu.";
    render();
    endVoice(isPlayer ? "you" : w === "draw" ? "draw" : "bot");
    onEnd?.(isPlayer ? "you" : w === "draw" ? "draw" : "bot");
  }

  function botMove() {
    if (over) return;
    playBotThink();
    const empties = board.map((v, i) => (v ? null : i)).filter((x) => x != null);
    const scored = empties.map((i) => {
      const tryBot = [...board];
      tryBot[i] = botSymbol;
      let score = Math.random() * 5;
      for (const [a, b, c] of TTT_LINES) {
        if (tryBot[a] === botSymbol && tryBot[b] === botSymbol && tryBot[c] === botSymbol) score += 100;
        const tryBlock = [...board];
        tryBlock[i] = playerSymbol;
        if (tryBlock[a] === playerSymbol && tryBlock[b] === playerSymbol && tryBlock[c] === playerSymbol) score += 70;
      }
      if (i === 4) score += 8;
      if ([0, 2, 6, 8].includes(i)) score += 3;
      score *= 0.5 + tier.pocketBias;
      return { move: i, score };
    });
    const pick = pickMoveWithWisdom(scored, tier.id);
    const i = pick?.move ?? empties[0];
    board[i] = botSymbol;
    lastMove = i;
    if (moveLog) {
      moveLog.push({
        actor: "bot",
        label: `Bot jogou ${botSymbol} na casa ${i + 1}`,
        cell: i,
      });
    }
    playPiecePlace();
    const w = winner();
    if (w) {
      finish(w);
      return;
    }
    turn = playerSymbol;
    statusEl.textContent = "Sua vez";
    match?.startPlayerClock?.(false);
    render();
  }

  function tttAnalyze(idx, sym, botSym) {
    const tryWin = [...board];
    tryWin[idx] = sym;
    let winning = false;
    for (const [a, b, c] of TTT_LINES) {
      if (tryWin[a] === sym && tryWin[b] === sym && tryWin[c] === sym) winning = true;
    }
    const tryBlock = [...board];
    tryBlock[idx] = botSym;
    let blocking = false;
    for (const [a, b, c] of TTT_LINES) {
      if (tryBlock[a] === botSym && tryBlock[b] === botSym && tryBlock[c] === botSym) blocking = true;
    }
    return { winning, blocking, cell: idx };
  }

  function play(i) {
    if (!chosen || over || board[i] || turn !== playerSymbol) return;
    match?.endPlayerClock?.();
    if (moveLog) {
      const meta = tttAnalyze(i, playerSymbol, botSymbol);
      moveLog.push({
        actor: "you",
        label: `Jogou ${playerSymbol} na casa ${i + 1}`,
        cell: i,
        ...meta,
      });
    }
    board[i] = playerSymbol;
    lastMove = i;
    playPiecePlace();
    const w = winner();
    if (w) {
      finish(w);
      return;
    }
    turn = botSymbol;
    statusEl.textContent = "Bot pensando…";
    render();
    setTimeout(botMove, 350);
  }

  function pickSymbol(sym) {
    playerSymbol = sym;
    botSymbol = sym === "X" ? "O" : "X";
    chosen = true;
    chooseEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
    if (turn === botSymbol) {
      statusEl.textContent = "Bot pensando…";
      render();
      setTimeout(botMove, 350);
    } else {
      statusEl.textContent = "Sua vez";
      render();
      match?.startPlayerClock?.(true);
    }
  }

  chooseEl.querySelectorAll("[data-pick]").forEach((b) => {
    b.addEventListener("click", () => pickSymbol(b.dataset.pick));
  });

  bindCommon(wrap, {
    onExit,
    restart() {
      board = Array(9).fill(null);
      turn = "X";
      over = false;
      lastMove = -1;
      winLine = null;
      match?.setActionsEnabled?.(true);
      if (chosen) {
        statusEl.textContent = turn === playerSymbol ? "Sua vez" : "Bot pensando…";
        render();
        if (turn === botSymbol) {
          setTimeout(botMove, 350);
        } else {
          match?.startPlayerClock?.(true);
        }
      } else {
        statusEl.textContent = "Escolha seu símbolo";
        chooseEl.classList.remove("hidden");
        boardEl.classList.add("hidden");
      }
    },
  });
  onBind?.({
    resign: () => finish(botSymbol),
    offerDraw: () => {
      finish("draw");
      match?.markDrawResolved?.(true);
    },
    timeout: () => {
      if (!chosen) return;
      finish(botSymbol);
    },
  });
  render();
  return () => wrap.remove();
}

/* ——— Lig 4 ——— */
export function mountConnect4Game(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  const COLS = 7;
  const ROWS = 6;
  let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let turn = 1; // 1 you, 2 bot
  let over = false;

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-simple-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Lig 4</div>
      <div class="tg-board-status" data-status>Sua vez — clique numa coluna</div>
      <div class="tg-board-meta">Bot: ${tier.label} · 4 em linha</div>
    </div>
    <div class="tg-c4" data-board></div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);
  const boardEl = wrap.querySelector("[data-board]");
  const statusEl = wrap.querySelector("[data-status]");

  function drop(col, who) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!grid[r][col]) {
        grid[r][col] = who;
        return r;
      }
    }
    return -1;
  }

  function checkWin(who) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== who) continue;
        for (const [dr, dc] of dirs) {
          let n = 1;
          for (let k = 1; k < 4; k++) {
            const rr = r + dr * k;
            const cc = c + dc * k;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || grid[rr][cc] !== who) break;
            n++;
          }
          if (n >= 4) return true;
        }
      }
    }
    return false;
  }

  function render() {
    boardEl.innerHTML = "";
    for (let c = 0; c < COLS; c++) {
      const col = document.createElement("button");
      col.type = "button";
      col.className = "tg-c4-col";
      col.disabled = over || turn !== 1;
      for (let r = 0; r < ROWS; r++) {
        const cell = document.createElement("span");
        cell.className = `tg-c4-cell p${grid[r][c]}`;
        col.appendChild(cell);
      }
      col.onclick = () => playCol(c);
      boardEl.appendChild(col);
    }
  }

  function finish(w) {
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    statusEl.textContent = w === 1 ? "Você venceu!" : w === 2 ? "Bot venceu." : "Empate!";
    endVoice(w === 1 ? "you" : w === 0 ? "draw" : "bot");
    onEnd?.(w === 1 ? "you" : w === 0 ? "draw" : "bot");
  }

  function botPlay() {
    const valid = [];
    for (let c = 0; c < COLS; c++) if (!grid[0][c]) valid.push(c);
    const scored = valid.map((c) => {
      let score = Math.abs(3 - c) * -1;
      // try win
      const g1 = grid.map((row) => [...row]);
      for (let r = ROWS - 1; r >= 0; r--) if (!g1[r][c]) { g1[r][c] = 2; break; }
      if (checkWinOn(g1, 2)) score += 100;
      const g2 = grid.map((row) => [...row]);
      for (let r = ROWS - 1; r >= 0; r--) if (!g2[r][c]) { g2[r][c] = 1; break; }
      if (checkWinOn(g2, 1)) score += 80;
      score += Math.random() * (1 - tier.pocketBias) * 20;
      return { move: c, score: score * (0.4 + tier.pocketBias) };
    });
    const pick = pickMoveWithWisdom(scored, tier.id);
    playCol(pick?.move ?? valid[0], true);
  }

  function checkWinOn(g, who) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (g[r][c] !== who) continue;
      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let k = 1; k < 4; k++) {
          const rr = r+dr*k, cc = c+dc*k;
          if (rr<0||rr>=ROWS||cc<0||cc>=COLS||g[rr][cc]!==who) break;
          n++;
        }
        if (n>=4) return true;
      }
    }
    return false;
  }

  function playCol(c, isBot = false) {
    if (over) return;
    if (!isBot && turn !== 1) return;
    if (grid[0][c]) {
      playIllegal();
      return;
    }
    if (!isBot) match?.endPlayerClock?.();
    if (!isBot && moveLog) {
      const g1 = grid.map((row) => [...row]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!g1[r][c]) {
          g1[r][c] = 1;
          break;
        }
      }
      const winning = checkWinOn(g1, 1);
      let blocking = false;
      for (let bc = 0; bc < COLS; bc++) {
        if (grid[0][bc]) continue;
        const g2 = grid.map((row) => [...row]);
        for (let r = ROWS - 1; r >= 0; r--) {
          if (!g2[r][bc]) {
            g2[r][bc] = 2;
            break;
          }
        }
        if (checkWinOn(g2, 2) && bc === c) blocking = true;
      }
      moveLog.push({
        actor: "you",
        label: `Coluna ${c + 1}`,
        col: c,
        winning,
        blocking,
      });
    } else if (isBot && moveLog) {
      moveLog.push({ actor: "bot", label: `Bot na coluna ${c + 1}`, col: c });
    }
    drop(c, isBot ? 2 : 1);
    playPiecePlace(true);
    render();
    if (checkWin(isBot ? 2 : 1)) {
      finish(isBot ? 2 : 1);
      return;
    }
    if (grid.every((row) => row.every(Boolean))) {
      finish(0);
      return;
    }
    if (isBot) {
      turn = 1;
      statusEl.textContent = "Sua vez";
      match?.startPlayerClock?.(false);
    } else {
      turn = 2;
      statusEl.textContent = "Bot pensando…";
      setTimeout(botPlay, 400);
    }
  }

  bindCommon(wrap, {
    onExit,
    restart() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      turn = 1;
      over = false;
      match?.setActionsEnabled?.(true);
      statusEl.textContent = "Sua vez";
      render();
      match?.startPlayerClock?.(true);
    },
  });
  onBind?.({
    resign: () => finish(2),
    offerDraw: () => {
      finish(0);
      match?.markDrawResolved?.(true);
    },
    timeout: () => finish(2),
  });
  render();
  match?.startPlayerClock?.(true);
  return () => wrap.remove();
}

/* ——— Memória ——— */
export function mountMemoryGame(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  const icons = ["♠", "♥", "♦", "♣", "★", "●", "▲", "■"];
  const iconColors = ["#5c6bc0", "#ef5350", "#ec407a", "#26a69a", "#ffb300", "#42a5f5", "#66bb6a", "#ab47bc"];
  let cards = shuffle([...icons, ...icons]).map((v, i) => ({ id: i, v, open: false, done: false }));
  let openIds = [];
  let lock = false;
  let scoreYou = 0;
  let scoreBot = 0;
  let turn = "you";
  let over = false;
  const memory = new Map(); // bot memory

  const wrap = createSalonShell({
    title: "Memória",
    subtitle: "Ache os pares",
    botName: `Bot ${tier.label}`,
    accent: "violet",
  });
  root.appendChild(wrap);
  const center = wrap.querySelector("[data-center]");
  const statusEl = wrap.querySelector("[data-status]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");
  wrap.querySelector("[data-hand]").remove();
  wrap.querySelector("[data-actions]").remove();

  function paint() {
    center.className = "tg-salon-center tg-memory-grid";
    center.innerHTML = "";
    cards.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      const tone = icons.indexOf(c.v);
      b.className = `tg-mem-card tg-mem-tone-${tone}${c.open || c.done ? " open" : ""}${c.done ? " done" : ""}`;
      b.style.setProperty("--mem-color", iconColors[tone] || "#5c6bc0");
      b.textContent = c.open || c.done ? c.v : "?";
      b.disabled = over || lock || turn !== "you" || c.done || c.open;
      b.onclick = () => flip(c.id);
      center.appendChild(b);
    });
    scoreYouEl.textContent = String(scoreYou);
    scoreBotEl.textContent = String(scoreBot);
  }

  function finish() {
    over = true;
    match?.endPlayerClock?.();
    const w = scoreYou > scoreBot ? "you" : scoreBot > scoreYou ? "bot" : "draw";
    statusEl.textContent = w === "you" ? "Você venceu!" : w === "bot" ? "Bot venceu." : "Empate!";
    endVoice(w);
    onEnd?.(w);
  }

  function afterPair(matchOk, who) {
    if (matchOk) {
      if (who === "you") {
        scoreYou++;
        moveLog?.push({
          actor: "you",
          label: "Achou um par!",
          positive: true,
          comment: "Memória afiada — par certo.",
        });
      } else scoreBot++;
      if (cards.every((c) => c.done)) finish();
      else if (who === "you") {
        statusEl.textContent = "Par! Jogue de novo";
        match?.startPlayerClock?.(false);
      } else setTimeout(botTurn, 400);
    } else {
      turn = who === "you" ? "bot" : "you";
      if (turn === "you") {
        statusEl.textContent = "Sua vez";
        match?.startPlayerClock?.(false);
      } else {
        statusEl.textContent = "Vez do bot…";
        setTimeout(botTurn, 500);
      }
    }
    paint();
  }

  function flip(id) {
    if (lock || turn !== "you") return;
    const c = cards.find((x) => x.id === id);
    if (!c || c.open || c.done) return;
    match?.endPlayerClock?.();
    c.open = true;
    playFlip();
    openIds.push(id);
    paint();
    if (openIds.length < 2) return;
    lock = true;
    const [a, b] = openIds.map((i) => cards.find((x) => x.id === i));
    memory.set(a.id, a.v);
    memory.set(b.id, b.v);
    setTimeout(() => {
      const ok = a.v === b.v;
      if (ok) {
        a.done = b.done = true;
      } else {
        a.open = b.open = false;
      }
      openIds = [];
      lock = false;
      afterPair(ok, "you");
    }, 550);
  }

  function botTurn() {
    if (over) return;
    playBotThink();
    const hidden = cards.filter((c) => !c.done && !c.open);
    let pick1;
    let pick2;
    // use memory with accuracy
    if (Math.random() < tier.pocketBias) {
      const known = [...memory.entries()].filter(([id]) => {
        const c = cards.find((x) => x.id === id);
        return c && !c.done;
      });
      const byVal = {};
      for (const [id, v] of known) {
        byVal[v] = byVal[v] || [];
        byVal[v].push(id);
      }
      const pair = Object.values(byVal).find((arr) => arr.length >= 2);
      if (pair) {
        pick1 = cards.find((c) => c.id === pair[0]);
        pick2 = cards.find((c) => c.id === pair[1]);
      }
    }
    if (!pick1) {
      pick1 = hidden[Math.floor(Math.random() * hidden.length)];
      const rest = hidden.filter((c) => c.id !== pick1.id);
      pick2 = rest[Math.floor(Math.random() * rest.length)];
    }
    pick1.open = true;
    playFlip();
    paint();
    setTimeout(() => {
      pick2.open = true;
      playFlip();
      memory.set(pick1.id, pick1.v);
      memory.set(pick2.id, pick2.v);
      paint();
      setTimeout(() => {
        const ok = pick1.v === pick2.v;
        if (ok) {
          pick1.done = pick2.done = true;
        } else {
          pick1.open = pick2.open = false;
        }
        afterPair(ok, "bot");
      }, 500);
    }, 400);
  }

  bindCommon(wrap, {
    onExit,
    restart() {
      cards = shuffle([...icons, ...icons]).map((v, i) => ({ id: i, v, open: false, done: false }));
      openIds = [];
      scoreYou = scoreBot = 0;
      turn = "you";
      over = false;
      memory.clear();
      match?.setActionsEnabled?.(true);
      statusEl.textContent = "Sua vez";
      paint();
      match?.startPlayerClock?.(true);
    },
  });
  onBind?.({
    resign: () => {
      over = true;
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      over = true;
      endVoice("bot");
      onEnd?.("bot");
    },
  });
  paint();
  match?.startPlayerClock?.(true);
  return () => wrap.remove();
}

/* ——— Blackjack ——— */
export function mountBlackjackGame(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  let deck = [];
  let you = [];
  let dealer = [];
  let over = false;
  let youScore = 0;
  let botScore = 0;

  const wrap = createSalonShell({
    title: "Blackjack",
    subtitle: "21 · vs mesa",
    botName: "Dealer",
    accent: "coral",
  });
  root.appendChild(wrap);
  const center = wrap.querySelector("[data-center]");
  const handEl = wrap.querySelector("[data-hand]");
  const actions = wrap.querySelector("[data-actions]");
  const statusEl = wrap.querySelector("[data-status]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");

  function val(hand) {
    let t = 0;
    let aces = 0;
    for (const c of hand) {
      if (c.rank === "A") {
        aces++;
        t += 11;
      } else if (["K", "Q", "J"].includes(c.rank)) t += 10;
      else t += parseInt(c.rank, 10);
    }
    while (t > 21 && aces) {
      t -= 10;
      aces--;
    }
    return t;
  }

  function paint() {
    center.innerHTML = "";
    dealer.forEach((c, i) => {
      center.appendChild(makeCardEl(c, { faceDown: !over && i === 0, small: true }));
    });
    handEl.innerHTML = "";
    you.forEach((c) => handEl.appendChild(makeCardEl(c)));
    scoreYouEl.textContent = String(youScore);
    scoreBotEl.textContent = String(botScore);
  }

  function deal() {
    over = false;
    deck = frenchDeck52();
    you = [deck.pop(), deck.pop()];
    dealer = [deck.pop(), deck.pop()];
    announceDealing();
    paint();
    statusEl.textContent = `Sua mão: ${val(you)}`;
    actions.innerHTML = "";
    const hit = document.createElement("button");
    hit.className = "tg-btn tg-btn-primary";
    hit.textContent = "Pedir";
    hit.onclick = () => {
      you.push(deck.pop());
      moveLog?.push({
        actor: "you",
        label: `Pediu carta (mão ${val(you)})`,
        positive: val(you) <= 21,
        comment: val(you) > 21 ? "Estourou — arriscou demais." : "Mão ainda segura.",
      });
      playCardDeal();
      paint();
      if (val(you) > 21) finishRound();
      else statusEl.textContent = `Sua mão: ${val(you)}`;
    };
    const stand = document.createElement("button");
    stand.className = "tg-btn";
    stand.textContent = "Parar";
    stand.onclick = () => {
      moveLog?.push({
        actor: "you",
        label: `Parou com ${val(you)}`,
        positive: val(you) >= 17 && val(you) <= 21,
        comment: val(you) >= 17 ? "Parar com 17+ é clássico." : "Parou cedo — às vezes vale pedir mais.",
      });
      finishRound();
    };
    actions.append(hit, stand);
    match?.startPlayerClock?.(false);
  }

  function finishRound() {
    match?.endPlayerClock?.();
    over = true;
    actions.innerHTML = "";
    // dealer draws
    while (val(dealer) < 17) {
      dealer.push(deck.pop());
      playCardDeal();
    }
    // bot skill: sometimes stands wrong
    paint();
    const y = val(you);
    let d = val(dealer);
    if (Math.random() > tier.pocketBias && d < 21) d = Math.min(21, d + (Math.random() < 0.5 ? 0 : 1));
    let msg;
    if (y > 21) {
      botScore++;
      msg = "Estourou! Dealer venceu a mão.";
    } else if (d > 21 || y > d) {
      youScore++;
      msg = "Você levou a mão!";
      playChip();
    } else if (y === d) msg = "Empate na mão.";
    else {
      botScore++;
      msg = "Dealer venceu a mão.";
    }
    statusEl.textContent = `${msg} (Você ${y} × Dealer ${val(dealer)})`;
    scoreYouEl.textContent = String(youScore);
    scoreBotEl.textContent = String(botScore);
    if (youScore >= 5 || botScore >= 5) {
      const w = youScore > botScore ? "you" : "bot";
      endVoice(w);
      onEnd?.(w);
      match?.setActionsEnabled?.(false);
    } else {
      const again = document.createElement("button");
      again.className = "tg-btn tg-btn-primary";
      again.textContent = "Próxima mão";
      again.onclick = deal;
      actions.appendChild(again);
    }
  }

  bindCommon(wrap, {
    onExit,
    restart() {
      youScore = botScore = 0;
      match?.setActionsEnabled?.(true);
      deal();
    },
  });
  onBind?.({
    resign: () => {
      over = true;
      actions.innerHTML = "";
      statusEl.textContent = "Você desistiu.";
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      over = true;
      actions.innerHTML = "";
      statusEl.textContent = "Tempo esgotado. Dealer venceu.";
      match?.setActionsEnabled?.(false);
      endVoice("bot");
      onEnd?.("bot");
    },
  });
  deal();
  return () => wrap.remove();
}

/* ——— Poker heads-up 5-card draw simplificado ——— */
export function mountPokerGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let you = [];
  let bot = [];
  let youChips = 100;
  let botChips = 100;
  let pot = 0;
  let over = false;

  const wrap = createSalonShell({
    title: "Poker",
    subtitle: "5 cartas · heads-up",
    botName: `Bot ${tier.label}`,
    accent: "coral",
  });
  root.appendChild(wrap);
  const center = wrap.querySelector("[data-center]");
  const handEl = wrap.querySelector("[data-hand]");
  const actions = wrap.querySelector("[data-actions]");
  const statusEl = wrap.querySelector("[data-status]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");

  function rankValue(r) {
    if (r === "A") return 14;
    if (r === "K") return 13;
    if (r === "Q") return 12;
    if (r === "J") return 11;
    return parseInt(r, 10);
  }

  function handScore(hand) {
    const vals = hand.map((c) => rankValue(c.rank)).sort((a, b) => b - a);
    const counts = {};
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    const groups = Object.values(counts).sort((a, b) => b - a);
    const flush = hand.every((c) => c.suit === hand[0].suit);
    const uniq = [...new Set(vals)].sort((a, b) => b - a);
    let straight = false;
    if (uniq.length >= 5) {
      straight = uniq[0] - uniq[4] === 4;
    }
    let score = vals[0];
    if (straight && flush) score = 800 + vals[0];
    else if (groups[0] === 4) score = 700 + vals[0];
    else if (groups[0] === 3 && groups[1] === 2) score = 600 + vals[0];
    else if (flush) score = 500 + vals[0];
    else if (straight) score = 400 + vals[0];
    else if (groups[0] === 3) score = 300 + vals[0];
    else if (groups[0] === 2 && groups[1] === 2) score = 200 + vals[0];
    else if (groups[0] === 2) score = 100 + vals[0];
    return score;
  }

  function deal() {
    if (youChips <= 0 || botChips <= 0) {
      over = true;
      const w = youChips > botChips ? "you" : "bot";
      statusEl.textContent = w === "you" ? "Você quebrou o bot!" : "Você faliu.";
      endVoice(w);
      onEnd?.(w);
      return;
    }
    const deck = frenchDeck52();
    you = deck.splice(0, 5);
    bot = deck.splice(0, 5);
    pot = 10;
    youChips -= 5;
    botChips -= 5;
    announceDealing();
    paint(false);
    statusEl.textContent = "Aposte ou vá de graça (check)";
    actions.innerHTML = "";
    const bet = document.createElement("button");
    bet.className = "tg-btn tg-btn-primary";
    bet.textContent = "Apostar 10";
    bet.onclick = () => showdown(10);
    const check = document.createElement("button");
    check.className = "tg-btn";
    check.textContent = "Check";
    check.onclick = () => showdown(0);
    actions.append(bet, check);
    match?.startPlayerClock?.(false);
  }

  function paint(showBot) {
    center.innerHTML = "";
    bot.forEach((c) => center.appendChild(makeCardEl(c, { faceDown: !showBot, small: true })));
    handEl.innerHTML = "";
    you.forEach((c) => handEl.appendChild(makeCardEl(c)));
    scoreYouEl.textContent = String(youChips);
    scoreBotEl.textContent = String(botChips);
    wrap.querySelector("[data-score-mid]").textContent = `POT ${pot}`;
  }

  function showdown(extra) {
    match?.endPlayerClock?.();
    if (extra) {
      youChips -= extra;
      pot += extra;
      // bot call chance
      if (Math.random() < tier.pocketBias + 0.2) {
        botChips -= extra;
        pot += extra;
        playChip();
      } else {
        youChips += pot;
        pot = 0;
        statusEl.textContent = "Bot foldou. Você leva o pot.";
        paint(true);
        actions.innerHTML = "";
        const n = document.createElement("button");
        n.className = "tg-btn tg-btn-primary";
        n.textContent = "Próxima";
        n.onclick = deal;
        actions.appendChild(n);
        return;
      }
    }
    paint(true);
    let ys = handScore(you);
    let bs = handScore(bot);
    // bot wisdom noise
    if (Math.random() > tier.pocketBias) bs += (Math.random() - 0.5) * 30;
    if (ys >= bs) {
      youChips += pot;
      statusEl.textContent = "Você levou o pot!";
      playWin();
    } else {
      botChips += pot;
      statusEl.textContent = "Bot levou o pot.";
      playLose();
    }
    pot = 0;
    scoreYouEl.textContent = String(youChips);
    scoreBotEl.textContent = String(botChips);
    actions.innerHTML = "";
    const n = document.createElement("button");
    n.className = "tg-btn tg-btn-primary";
    n.textContent = "Próxima mão";
    n.onclick = deal;
    actions.appendChild(n);
  }

  bindCommon(wrap, {
    onExit,
    restart() {
      youChips = botChips = 100;
      over = false;
      match?.setActionsEnabled?.(true);
      deal();
    },
  });
  onBind?.({
    resign: () => {
      over = true;
      actions.innerHTML = "";
      statusEl.textContent = "Você desistiu.";
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      over = true;
      actions.innerHTML = "";
      statusEl.textContent = "Tempo esgotado. Bot venceu.";
      match?.setActionsEnabled?.(false);
      endVoice("bot");
      onEnd?.("bot");
    },
  });
  deal();
  return () => wrap.remove();
}

/* ——— Uno oficial 1v1 (coringa, +4, inverter) ——— */
export function mountUnoGame(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  const COLORS = ["R", "G", "B", "Y"];
  const COLOR_HEX = { R: "#e63535", G: "#1aa260", B: "#0096e6", Y: "#f7c948" };
  const COLOR_NAME = { R: "Vermelho", G: "Verde", B: "Azul", Y: "Amarelo" };
  const FACE = { skip: "⊘", rev: "⇄", "+2": "+2", wild: "★", "+4": "+4" };

  function unoFaceLabel(c) {
    return FACE[c.n] ?? String(c.n);
  }

  function unoCardEl(c, playable) {
    const el = document.createElement("button");
    el.type = "button";
    const colKey = c.col === "W" ? (c.n === "+4" ? "w4" : "w") : c.col.toLowerCase();
    el.className = `tg-uno-card tg-uno-${colKey}${playable ? " playable" : ""}`;
    if (c.chosenCol) el.dataset.chosen = c.chosenCol.toLowerCase();

    const face = unoFaceLabel(c);
    const darkFace = c.col === "Y";

    if (c.col === "W") {
      el.innerHTML = `
        <span class="tg-uno-wild-bg" aria-hidden="true"></span>
        <span class="tg-uno-corner tl">${face}</span>
        <span class="tg-uno-corner br">${face}</span>
        <span class="tg-uno-oval wild"><span class="tg-uno-face">${face}</span></span>
        <span class="tg-uno-brand">UNO</span>
      `;
    } else {
      el.innerHTML = `
        <span class="tg-uno-corner tl">${face}</span>
        <span class="tg-uno-corner br">${face}</span>
        <span class="tg-uno-oval"><span class="tg-uno-face${darkFace ? " dark" : ""}">${face}</span></span>
      `;
    }
    el.disabled = !playable;
    return el;
  }

  function makeUnoDeck() {
    const d = [];
    for (const col of COLORS) {
      d.push({ col, n: 0, id: `${col}0` });
      for (let n = 1; n <= 9; n++) {
        d.push({ col, n, id: `${col}${n}a` }, { col, n, id: `${col}${n}b` });
      }
      d.push({ col, n: "+2", id: `${col}+2a` }, { col, n: "+2", id: `${col}+2b` });
      d.push({ col, n: "skip", id: `${col}sa` }, { col, n: "skip", id: `${col}sb` });
      d.push({ col, n: "rev", id: `${col}ra` }, { col, n: "rev", id: `${col}rb` });
    }
    for (let k = 0; k < 4; k++) {
      d.push({ col: "W", n: "wild", id: `W${k}` }, { col: "W", n: "+4", id: `W4${k}` });
    }
    return shuffle(d);
  }

  let deck = [];
  let discard = [];
  let you = [];
  let bot = [];
  let turn = "you";
  let over = false;
  let drewThisTurn = false;

  const wrap = createSalonShell({
    title: "Uno",
    subtitle: "1v1 · regras oficiais",
    botName: `Bot ${tier.label}`,
    accent: "uno",
  });
  wrap.classList.add("tg-uno-game");
  root.appendChild(wrap);
  const center = wrap.querySelector("[data-center]");
  const handEl = wrap.querySelector("[data-hand]");
  const actions = wrap.querySelector("[data-actions]");
  const statusEl = wrap.querySelector("[data-status]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");

  function top() {
    return discard[discard.length - 1];
  }

  function activeColor() {
    const t = top();
    return t.chosenCol || t.col;
  }

  function canPlay(c) {
    if (c.col === "W") return true;
    const t = top();
    return c.col === activeColor() || (t.n !== "wild" && t.n !== "+4" && c.n === t.n);
  }

  function paint() {
    center.innerHTML = "";
    const t = top();
    if (t) {
      center.appendChild(unoCardEl(t, false));
      if (t.col === "W" && t.chosenCol) {
        const tag = document.createElement("span");
        tag.className = "tg-uno-color-tag";
        tag.textContent = `Cor: ${COLOR_NAME[t.chosenCol]}`;
        tag.style.background = COLOR_HEX[t.chosenCol];
        center.appendChild(tag);
      }
    }
    handEl.innerHTML = "";
    you.forEach((c, i) => {
      const el = unoCardEl(c, !over && turn === "you" && canPlay(c));
      el.onclick = () => playYou(i);
      handEl.appendChild(el);
    });
    scoreYouEl.textContent = String(you.length);
    scoreBotEl.textContent = String(bot.length);
  }

  function drawOne(who) {
    if (!deck.length) {
      const topCard = discard.pop();
      deck = shuffle(discard.map((c) => ({ ...c, chosenCol: undefined })));
      discard = [topCard];
    }
    if (!deck.length) return null;
    const c = deck.pop();
    if (who === "you") you.push(c);
    else bot.push(c);
    playCardDeal();
    return c;
  }

  function renderActions() {
    actions.innerHTML = "";
    const drawBtn = document.createElement("button");
    drawBtn.className = "tg-btn";
    drawBtn.textContent = "Comprar";
    drawBtn.onclick = () => {
      if (turn !== "you" || over || drewThisTurn) return;
      const c = drawOne("you");
      drewThisTurn = true;
      paint();
      if (c && canPlay(c)) {
        statusEl.textContent = "A carta comprada dá jogo! Jogue ou passe.";
        renderActions();
      } else {
        passTurn();
      }
    };
    drawBtn.disabled = over || turn !== "you" || drewThisTurn;
    actions.appendChild(drawBtn);
    if (drewThisTurn && turn === "you" && !over) {
      const passBtn = document.createElement("button");
      passBtn.className = "tg-btn tg-btn-ghost";
      passBtn.textContent = "Passar";
      passBtn.onclick = passTurn;
      actions.appendChild(passBtn);
    }
  }

  function passTurn() {
    match?.endPlayerClock?.();
    drewThisTurn = false;
    turn = "bot";
    statusEl.textContent = "Vez do bot…";
    renderActions();
    paint();
    setTimeout(botPlay, 500);
  }

  function start() {
    deck = makeUnoDeck();
    you = deck.splice(0, 7);
    bot = deck.splice(0, 7);
    let first = deck.pop();
    while (first.col === "W") {
      deck.unshift(first);
      first = deck.pop();
    }
    discard = [first];
    turn = "you";
    over = false;
    drewThisTurn = false;
    match?.setActionsEnabled?.(true);
    announceDealing();
    paint();
    statusEl.textContent = "Sua vez — combine cor ou símbolo";
    renderActions();
    match?.startPlayerClock?.(true);
  }

  function winCheck() {
    if (you.length === 0) {
      over = true;
      statusEl.textContent = "UNO! Você venceu!";
      endVoice("you");
      onEnd?.("you");
      return true;
    }
    if (bot.length === 0) {
      over = true;
      statusEl.textContent = "Bot bateu. Você perdeu.";
      endVoice("bot");
      onEnd?.("bot");
      return true;
    }
    return false;
  }

  function unoShout(who) {
    if (who === "you" && you.length === 1) {
      statusEl.textContent = "UNO! Só falta 1 carta!";
      speakBotReact("Uno!");
    } else if (who === "bot" && bot.length === 1) {
      speakBotReact("Uno!");
    }
  }

  // Efeito oficial 1v1: skip, inverter, +2 e +4 pulam o adversário (quem jogou joga de novo)
  function applyEffect(c, who) {
    const victim = who === "you" ? "bot" : "you";
    let playAgain = false;
    if (c.n === "skip" || c.n === "rev") playAgain = true;
    if (c.n === "+2") {
      drawOne(victim);
      drawOne(victim);
      playAgain = true;
    }
    if (c.n === "+4") {
      for (let k = 0; k < 4; k++) drawOne(victim);
      playAgain = true;
    }
    return playAgain;
  }

  function chooseColorUI(cb) {
    actions.innerHTML = "";
    statusEl.textContent = "Escolha a cor do coringa";
    COLORS.forEach((col) => {
      const b = document.createElement("button");
      b.className = `tg-btn tg-uno-pickcolor tg-uno-pick-${col.toLowerCase()}`;
      b.textContent = COLOR_NAME[col];
      b.onclick = () => cb(col);
      actions.appendChild(b);
    });
  }

  function afterPlay(c, who) {
    if (winCheck()) return;
    unoShout(who);
    const playAgain = applyEffect(c, who);
    if (who === "you") {
      drewThisTurn = false;
      if (playAgain) {
        turn = "you";
        statusEl.textContent = "Adversário pulou — jogue de novo!";
        paint();
        renderActions();
        match?.startPlayerClock?.(false);
      } else {
        turn = "bot";
        paint();
        renderActions();
        setTimeout(botPlay, 500);
      }
    } else {
      if (playAgain) {
        turn = "bot";
        paint();
        setTimeout(botPlay, 550);
      } else {
        turn = "you";
        drewThisTurn = false;
        statusEl.textContent = "Sua vez";
        paint();
        renderActions();
        match?.startPlayerClock?.(false);
      }
    }
  }

  function playYou(i) {
    if (over || turn !== "you") return;
    const c = you[i];
    if (!canPlay(c)) {
      playIllegal();
      return;
    }
    match?.endPlayerClock?.();
    if (moveLog) {
      moveLog.push({
        actor: "you",
        label: c.col === "W" ? `Coringa ${c.n}` : `${COLOR_NAME[c.col]} ${c.n}`,
        wild: c.col === "W",
        special: ["+2", "+4", "skip", "rev"].includes(c.n) ? c.n : null,
        uno: you.length === 1,
      });
    }
    you.splice(i, 1);
    playCardPlay();
    if (c.col === "W") {
      chooseColorUI((col) => {
        discard.push({ ...c, chosenCol: col });
        afterPlay(c, "you");
      });
      paint();
      return;
    }
    discard.push(c);
    afterPlay(c, "you");
  }

  function botBestColor() {
    const count = { R: 0, G: 0, B: 0, Y: 0 };
    bot.forEach((c) => {
      if (c.col !== "W") count[c.col]++;
    });
    return COLORS.reduce((best, col) => (count[col] > count[best] ? col : best), "R");
  }

  function botPlay() {
    if (over) return;
    playBotThink();
    const opts = bot
      .map((c, i) => {
        if (!canPlay(c)) return null;
        let score = 10;
        if (c.n === "+4") score += 8;
        else if (c.n === "+2") score += 6;
        else if (c.n === "skip" || c.n === "rev") score += 4;
        else if (c.col === "W") score += 2;
        score += Math.random() * tier.pocketBias * 10;
        return { i, c, score };
      })
      .filter(Boolean);
    if (!opts.length) {
      const c = drawOne("bot");
      if (c && canPlay(c)) {
        setTimeout(() => {
          if (over) return;
          const idx = bot.findIndex((x) => x.id === c.id);
          if (idx >= 0) bot.splice(idx, 1);
          const played = c.col === "W" ? { ...c, chosenCol: botBestColor() } : c;
          discard.push(played);
          playCardPlay();
          statusEl.textContent = "Bot comprou e jogou.";
          afterPlay(c, "bot");
        }, 450);
        return;
      }
      turn = "you";
      drewThisTurn = false;
      statusEl.textContent = "Bot comprou e passou. Sua vez";
      paint();
      renderActions();
      match?.startPlayerClock?.(false);
      return;
    }
    const pick = pickMoveWithWisdom(opts, tier.id);
    const c = bot.splice(pick.i, 1)[0];
    const played = c.col === "W" ? { ...c, chosenCol: botBestColor() } : c;
    discard.push(played);
    playCardPlay();
    afterPlay(c, "bot");
  }

  bindCommon(wrap, {
    onExit,
    restart: start,
  });
  onBind?.({
    resign: () => {
      if (over) return;
      over = true;
      statusEl.textContent = "Você desistiu.";
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      if (over) return;
      over = true;
      statusEl.textContent = "Tempo esgotado. Bot venceu.";
      endVoice("bot");
      onEnd?.("bot");
    },
  });
  start();
  return () => wrap.remove();
}

/* ——— Dominó (duplo-6) ——— */
export function mountDominoGame(root, { botTier, onExit, onEnd, onBind, match, moveLog }) {
  const tier = getBotTier(botTier);
  let boneyard = [];
  let you = [];
  let bot = [];
  let chain = []; // [{a,b} left to right]
  let turn = "you";
  let over = false;

  const wrap = createSalonShell({
    title: "Dominó",
    subtitle: "Duplo-6 · encaixe nas pontas",
    botName: `Bot ${tier.label}`,
    accent: "amber",
  });
  root.appendChild(wrap);
  const center = wrap.querySelector("[data-center]");
  const handEl = wrap.querySelector("[data-hand]");
  const actions = wrap.querySelector("[data-actions]");
  const statusEl = wrap.querySelector("[data-status]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");

  function allTiles() {
    const t = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) t.push({ a, b, id: `${a}-${b}` });
    return shuffle(t);
  }

  function ends() {
    if (!chain.length) return null;
    return { left: chain[0].left, right: chain[chain.length - 1].right };
  }

  function canPlace(tile, side) {
    if (!chain.length) return true;
    const e = ends();
    if (side === "left") return tile.a === e.left || tile.b === e.left;
    return tile.a === e.right || tile.b === e.right;
  }

  function place(tile, side) {
    if (!chain.length) {
      chain.push({ left: tile.a, right: tile.b, tile });
      return;
    }
    const e = ends();
    if (side === "left") {
      const left = tile.a === e.left ? tile.b : tile.a;
      const right = e.left;
      chain.unshift({ left, right, tile });
    } else {
      const right = tile.a === e.right ? tile.b : tile.a;
      const left = e.right;
      chain.push({ left, right, tile });
    }
  }

  function tileEl(t, playable) {
    const el = document.createElement("button");
    el.type = "button";
    const sum = t.a + t.b;
    el.className = `tg-domino tg-domino-sum-${sum}${playable ? " playable" : ""}`;
    el.innerHTML = `<span>${t.a}</span><i></i><span>${t.b}</span>`;
    el.disabled = !playable;
    return el;
  }

  function paint() {
    center.className = "tg-salon-center tg-domino-chain";
    center.innerHTML = "";
    chain.forEach((c) => {
      const el = tileEl(c.tile, false);
      el.disabled = true;
      center.appendChild(el);
    });
    const e = ends();
    handEl.innerHTML = "";
    you.forEach((t, i) => {
      const ok =
        !over &&
        turn === "you" &&
        (!e || canPlace(t, "left") || canPlace(t, "right"));
      const el = tileEl(t, ok);
      el.onclick = () => playYou(i);
      handEl.appendChild(el);
    });
    scoreYouEl.textContent = String(you.length);
    scoreBotEl.textContent = String(bot.length);
  }

  function deal() {
    const tiles = allTiles();
    you = tiles.splice(0, 7);
    bot = tiles.splice(0, 7);
    boneyard = tiles;
    chain = [];
    turn = "you";
    over = false;
    speakBotReact("Pedras no jogo!");
    paint();
    statusEl.textContent = "Sua vez — jogue qualquer pedra pra abrir";
    actions.innerHTML = "";
    const pass = document.createElement("button");
    pass.className = "tg-btn";
    pass.textContent = "Comprar / Passar";
    pass.onclick = () => {
      if (turn !== "you" || over) return;
      if (boneyard.length) {
        you.push(boneyard.pop());
        playDominoPlace();
        paint();
      } else {
        turn = "bot";
        statusEl.textContent = "Passou. Vez do bot";
        setTimeout(botPlay, 400);
      }
    };
    actions.appendChild(pass);
    match?.startPlayerClock?.(true);
  }

  function finish(w) {
    over = true;
    match?.endPlayerClock?.();
    statusEl.textContent = w === "you" ? "Você travou / bateu!" : "Bot bateu.";
    endVoice(w);
    onEnd?.(w);
  }

  function playYou(i) {
    if (over || turn !== "you") return;
    const t = you[i];
    let side = "right";
    if (!chain.length) side = "right";
    else if (canPlace(t, "left") && !canPlace(t, "right")) side = "left";
    else if (canPlace(t, "right") && !canPlace(t, "left")) side = "right";
    else if (canPlace(t, "left")) side = "left";
    else if (canPlace(t, "right")) side = "right";
    else {
      playIllegal();
      return;
    }
    match?.endPlayerClock?.();
    if (moveLog) {
      moveLog.push({
        actor: "you",
        label: `Pedra ${t.a}|${t.b} na ${side === "left" ? "esquerda" : "direita"}`,
        endsBlocked: chain.length > 0,
      });
    }
    you.splice(i, 1);
    place(t, side);
    playDominoPlace();
    paint();
    if (!you.length) {
      finish("you");
      return;
    }
    turn = "bot";
    statusEl.textContent = "Vez do bot…";
    setTimeout(botPlay, 450);
  }

  function botPlay() {
    if (over) return;
    playBotThink();
    const moves = [];
    bot.forEach((t, i) => {
      if (!chain.length || canPlace(t, "left")) moves.push({ i, t, side: "left", score: t.a + t.b });
      if (chain.length && canPlace(t, "right")) moves.push({ i, t, side: "right", score: t.a + t.b + 0.1 });
    });
    if (!moves.length) {
      if (boneyard.length) {
        bot.push(boneyard.pop());
        playDominoPlace();
      }
      turn = "you";
      statusEl.textContent = "Sua vez";
      paint();
      match?.startPlayerClock?.(false);
      return;
    }
    const pick = pickMoveWithWisdom(
      moves.map((m) => ({ ...m, score: m.score * (0.5 + tier.pocketBias) })),
      tier.id
    );
    const idx = bot.findIndex((x) => x.id === pick.t.id);
    if (idx >= 0) bot.splice(idx, 1);
    place(pick.t, pick.side);
    playDominoPlace();
    paint();
    if (!bot.length) {
      finish("bot");
      return;
    }
    turn = "you";
    statusEl.textContent = "Sua vez";
    match?.startPlayerClock?.(false);
  }

  bindCommon(wrap, {
    onExit,
    restart: deal,
  });
  onBind?.({
    resign: () => finish("bot"),
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      if (over) return;
      statusEl.textContent = "Tempo esgotado.";
      finish("bot");
    },
  });
  deal();
  return () => wrap.remove();
}

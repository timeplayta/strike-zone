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
  speakLine,
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

function endVoice(winner) {
  if (winner === "you" || winner === "w" || winner === "player") {
    playWin();
    speakLine("Você venceu!");
  } else if (winner === "draw") {
    speakLine("Empate!");
  } else {
    playLose();
    speakLine("O bot venceu.");
  }
}

/* ——— Jogo da Velha ——— */
export function mountTicTacToeGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let board = Array(9).fill(null);
  let turn = "X";
  let over = false;

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-simple-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Jogo da Velha</div>
      <div class="tg-board-status" data-status>Você é X</div>
      <div class="tg-board-meta">Bot: ${tier.label}</div>
    </div>
    <div class="tg-ttt" data-board></div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);
  const boardEl = wrap.querySelector("[data-board]");
  const statusEl = wrap.querySelector("[data-status]");

  function winner() {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(Boolean)) return "draw";
    return null;
  }

  function render() {
    boardEl.innerHTML = "";
    board.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-ttt-cell";
      b.textContent = v || "";
      b.disabled = over || !!v || turn !== "X";
      b.onclick = () => play(i);
      boardEl.appendChild(b);
    });
  }

  function finish(w) {
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    statusEl.textContent = w === "X" ? "Você venceu!" : w === "O" ? "Bot venceu." : "Empate!";
    endVoice(w === "X" ? "you" : w === "draw" ? "draw" : "bot");
    onEnd?.(w === "X" ? "you" : w === "draw" ? "draw" : "bot");
  }

  function botMove() {
    if (over) return;
    playBotThink();
    const empties = board.map((v, i) => (v ? null : i)).filter((x) => x != null);
    const scored = empties.map((i) => {
      const tryB = [...board];
      tryB[i] = "O";
      let score = 0;
      if (winner.call({ board: tryB }) || (() => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const [a,b,c] of lines) if (tryB[a]==="O"&&tryB[b]==="O"&&tryB[c]==="O") return true;
        return false;
      })()) score += 100;
      // block
      const tryX = [...board];
      tryX[i] = "X";
      for (const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
        if (tryX[a]==="X"&&tryX[b]==="X"&&tryX[c]==="X") score += 80;
      }
      if (i === 4) score += 10;
      score += Math.random() * (1 - tier.pocketBias) * 30;
      return { i, score };
    });
    // fix winner check for O
    const scored2 = empties.map((i) => {
      const tryB = [...board];
      tryB[i] = "O";
      let score = Math.random() * 5;
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of lines) {
        if (tryB[a]==="O"&&tryB[b]==="O"&&tryB[c]==="O") score += 100;
        const block = [...board];
        block[i] = "X";
        if (block[a]==="X"&&block[b]==="X"&&block[c]==="X") score += 70;
      }
      if (i === 4) score += 8;
      if ([0,2,6,8].includes(i)) score += 3;
      score *= 0.5 + tier.pocketBias;
      return { move: i, score };
    });
    const pick = pickMoveWithWisdom(scored2, tier.id);
    const i = pick?.move ?? empties[0];
    board[i] = "O";
    playPiecePlace();
    render();
    const w = winner();
    if (w) finish(w);
    else {
      turn = "X";
      statusEl.textContent = "Sua vez";
      match?.startPlayerClock?.(false);
    }
  }

  function play(i) {
    if (over || board[i] || turn !== "X") return;
    match?.endPlayerClock?.();
    board[i] = "X";
    playPiecePlace();
    render();
    const w = winner();
    if (w) finish(w);
    else {
      turn = "O";
      statusEl.textContent = "Bot pensando…";
      setTimeout(botMove, 350);
    }
  }

  bindCommon(wrap, {
    onExit,
    restart() {
      board = Array(9).fill(null);
      turn = "X";
      over = false;
      match?.setActionsEnabled?.(true);
      statusEl.textContent = "Você é X";
      render();
      match?.startPlayerClock?.(true);
    },
  });
  onBind?.({
    resign: () => finish("O"),
    offerDraw: () => {
      finish("draw");
      match?.markDrawResolved?.(true);
    },
    timeout: () => finish("O"),
  });
  render();
  match?.startPlayerClock?.(true);
  return () => wrap.remove();
}

/* ——— Lig 4 ——— */
export function mountConnect4Game(root, { botTier, onExit, onEnd, onBind, match }) {
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
export function mountMemoryGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  const icons = ["♠", "♥", "♦", "♣", "★", "●", "▲", "■"];
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
    accent: "teal",
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
      b.className = `tg-mem-card${c.open || c.done ? " open" : ""}${c.done ? " done" : ""}`;
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
      if (who === "you") scoreYou++;
      else scoreBot++;
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
export function mountBlackjackGame(root, { botTier, onExit, onEnd, onBind, match }) {
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
      playCardDeal();
      paint();
      if (val(you) > 21) finishRound();
      else statusEl.textContent = `Sua mão: ${val(you)}`;
    };
    const stand = document.createElement("button");
    stand.className = "tg-btn";
    stand.textContent = "Parar";
    stand.onclick = () => finishRound();
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
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => finishRound(),
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
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => showdown(0),
  });
  deal();
  return () => wrap.remove();
}

/* ——— Uno simplificado 1v1 ——— */
export function mountUnoGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  const COLORS = ["R", "G", "B", "Y"];
  const COLOR_HEX = { R: "#e04040", G: "#2aaa55", B: "#3380e0", Y: "#e0c020" };

  function makeUnoDeck() {
    const d = [];
    for (const col of COLORS) {
      for (let n = 0; n <= 9; n++) d.push({ col, n, id: `${col}${n}a` });
      for (let n = 1; n <= 9; n++) d.push({ col, n, id: `${col}${n}b` });
      d.push({ col, n: "+2", id: `${col}+2a` }, { col, n: "+2", id: `${col}+2b` });
      d.push({ col, n: "skip", id: `${col}sa` }, { col, n: "skip", id: `${col}sb` });
    }
    return shuffle(d);
  }

  let deck = [];
  let discard = [];
  let you = [];
  let bot = [];
  let turn = "you";
  let over = false;

  const wrap = createSalonShell({
    title: "Uno",
    subtitle: "1v1 · combine cor ou número",
    botName: `Bot ${tier.label}`,
    accent: "teal",
  });
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

  function canPlay(c) {
    const t = top();
    return c.col === t.col || c.n === t.n;
  }

  function unoCardEl(c, playable) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `tg-uno-card${playable ? " playable" : ""}`;
    el.style.background = COLOR_HEX[c.col];
    el.textContent = String(c.n);
    el.disabled = !playable;
    return el;
  }

  function paint() {
    center.innerHTML = "";
    const t = top();
    if (t) center.appendChild(unoCardEl(t, false));
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
    if (!deck.length) deck = shuffle(discard.splice(0, discard.length - 1));
    const c = deck.pop();
    if (who === "you") you.push(c);
    else bot.push(c);
    playCardDeal();
  }

  function start() {
    deck = makeUnoDeck();
    you = deck.splice(0, 7);
    bot = deck.splice(0, 7);
    discard = [deck.pop()];
    turn = "you";
    over = false;
    announceDealing();
    paint();
    statusEl.textContent = "Sua vez";
    actions.innerHTML = "";
    const drawBtn = document.createElement("button");
    drawBtn.className = "tg-btn";
    drawBtn.textContent = "Comprar";
    drawBtn.onclick = () => {
      if (turn !== "you" || over) return;
      match?.endPlayerClock?.();
      drawOne("you");
      turn = "bot";
      paint();
      setTimeout(botPlay, 500);
    };
    actions.appendChild(drawBtn);
    match?.startPlayerClock?.(true);
  }

  function winCheck() {
    if (you.length === 0) {
      over = true;
      statusEl.textContent = "Uno! Você venceu!";
      endVoice("you");
      onEnd?.("you");
      return true;
    }
    if (bot.length === 0) {
      over = true;
      statusEl.textContent = "Bot fez Uno.";
      endVoice("bot");
      onEnd?.("bot");
      return true;
    }
    return false;
  }

  function playYou(i) {
    if (over || turn !== "you") return;
    const c = you[i];
    if (!canPlay(c)) {
      playIllegal();
      return;
    }
    match?.endPlayerClock?.();
    you.splice(i, 1);
    discard.push(c);
    playCardPlay();
    if (winCheck()) return;
    let skip = c.n === "skip";
    if (c.n === "+2") {
      drawOne("bot");
      drawOne("bot");
    }
    turn = skip ? "you" : "bot";
    paint();
    if (turn === "bot") setTimeout(botPlay, 450);
    else {
      statusEl.textContent = "Skip! Jogue de novo";
      match?.startPlayerClock?.(false);
    }
  }

  function botPlay() {
    if (over) return;
    playBotThink();
    const opts = bot.map((c, i) => ({ c, i, score: canPlay(c) ? 10 + Math.random() * tier.pocketBias * 10 : -1 }));
    const playable = opts.filter((o) => o.score >= 0);
    if (!playable.length) {
      drawOne("bot");
      turn = "you";
      statusEl.textContent = "Bot comprou. Sua vez";
      paint();
      match?.startPlayerClock?.(false);
      return;
    }
    const pick = pickMoveWithWisdom(
      playable.map((o) => ({ ...o, score: o.score })),
      tier.id
    );
    const c = bot.splice(pick.i, 1)[0];
    discard.push(c);
    playCardPlay();
    if (winCheck()) return;
    let skip = c.n === "skip";
    if (c.n === "+2") {
      drawOne("you");
      drawOne("you");
    }
    turn = skip ? "bot" : "you";
    paint();
    if (turn === "bot") setTimeout(botPlay, 400);
    else {
      statusEl.textContent = "Sua vez";
      match?.startPlayerClock?.(false);
    }
  }

  bindCommon(wrap, {
    onExit,
    restart: start,
  });
  onBind?.({
    resign: () => {
      endVoice("bot");
      onEnd?.("bot");
    },
    offerDraw: () => match?.markDrawResolved?.(false),
    timeout: () => {
      drawOne("you");
      turn = "bot";
      paint();
      setTimeout(botPlay, 400);
    },
  });
  start();
  return () => wrap.remove();
}

/* ——— Dominó (duplo-6) ——— */
export function mountDominoGame(root, { botTier, onExit, onEnd, onBind, match }) {
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
    accent: "teal",
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
    el.className = `tg-domino${playable ? " playable" : ""}`;
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
    speakLine("Pedras no jogo!");
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
      turn = "bot";
      setTimeout(botPlay, 300);
    },
  });
  deal();
  return () => wrap.remove();
}

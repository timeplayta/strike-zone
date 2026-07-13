/**
 * Xadrez — tabuleiro imersivo + minimax com profundidade por bot
 */

import {
  playPiecePlace,
  playCapture,
  playIllegal,
  playCheck,
  playWin,
  playLose,
  playBotThink,
} from "./table-games-audio.js";
import { getBotTier, pickMoveWithWisdom } from "./table-games-bots.js";

const FILES = "abcdefgh";
const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const UNICODE = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function setupBoard() {
  const b = emptyBoard();
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let i = 0; i < 8; i++) {
    b[0][i] = { t: back[i], c: "b" };
    b[1][i] = { t: "p", c: "b" };
    b[6][i] = { t: "p", c: "w" };
    b[7][i] = { t: back[i], c: "w" };
  }
  return b;
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.t === "k" && p.c === color) return { r, c };
    }
  }
  return null;
}

function isAttacked(board, r, c, byColor) {
  const enemy = byColor;
  // peões
  const pr = byColor === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pr, c + dc)) {
      const p = board[pr][c + dc];
      if (p && p.c === enemy && p.t === "p") return true;
    }
  }
  // cavalos
  for (const [dr, dc] of [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
  ]) {
    const rr = r + dr;
    const cc = c + dc;
    if (!inBounds(rr, cc)) continue;
    const p = board[rr][cc];
    if (p && p.c === enemy && p.t === "n") return true;
  }
  // rei
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const p = board[rr][cc];
      if (p && p.c === enemy && p.t === "k") return true;
    }
  }
  // torres/rainha
  for (const [dr, dc] of [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ]) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.c === enemy && (p.t === "r" || p.t === "q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  // bispos/rainha
  for (const [dr, dc] of [
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.c === enemy && (p.t === "b" || p.t === "q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

function isInCheck(board, color) {
  const k = findKing(board, color);
  if (!k) return true;
  return isAttacked(board, k.r, k.c, color === "w" ? "b" : "w");
}

function pushMove(moves, board, fr, fc, tr, tc, extra = {}) {
  const captured = board[tr][tc];
  moves.push({ fr, fc, tr, tc, captured, ...extra });
}

function genPseudo(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const moves = [];
  const dir = p.c === "w" ? -1 : 1;
  if (p.t === "p") {
    const nr = r + dir;
    if (inBounds(nr, c) && !board[nr][c]) {
      pushMove(moves, board, r, c, nr, c);
      const start = p.c === "w" ? 6 : 1;
      if (r === start && !board[r + dir * 2][c]) pushMove(moves, board, r, c, r + dir * 2, c);
    }
    for (const dc of [-1, 1]) {
      const tc = c + dc;
      if (!inBounds(nr, tc)) continue;
      const t = board[nr][tc];
      if (t && t.c !== p.c) pushMove(moves, board, r, c, nr, tc);
    }
  } else if (p.t === "n") {
    for (const [dr, dc] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
    ]) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const t = board[rr][cc];
      if (!t || t.c !== p.c) pushMove(moves, board, r, c, rr, cc);
    }
  } else if (p.t === "b" || p.t === "r" || p.t === "q") {
    const rays = [];
    if (p.t !== "b") rays.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    if (p.t !== "r") rays.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    for (const [dr, dc] of rays) {
      let rr = r + dr;
      let cc = c + dc;
      while (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (!t) pushMove(moves, board, r, c, rr, cc);
        else {
          if (t.c !== p.c) pushMove(moves, board, r, c, rr, cc);
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  } else if (p.t === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        const t = board[rr][cc];
        if (!t || t.c !== p.c) pushMove(moves, board, r, c, rr, cc);
      }
    }
  }
  return moves;
}

function applyMove(board, m) {
  const next = cloneBoard(board);
  const piece = next[m.fr][m.fc];
  next[m.tr][m.tc] = piece;
  next[m.fr][m.fc] = null;
  // promoção
  if (piece.t === "p" && (m.tr === 0 || m.tr === 7)) next[m.tr][m.tc] = { t: "q", c: piece.c };
  return next;
}

function legalMoves(board, color) {
  const out = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.c !== color) continue;
      for (const m of genPseudo(board, r, c)) {
        const next = applyMove(board, m);
        if (!isInCheck(next, color)) out.push(m);
      }
    }
  }
  return out;
}

function evaluate(board, perspective) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = PIECE_VAL[p.t] || 0;
      // centro
      if (p.t === "p" || p.t === "n") {
        const center = 3.5;
        v += (3.5 - Math.abs(r - center) - Math.abs(c - center)) * 4;
      }
      score += p.c === perspective ? v : -v;
    }
  }
  return score;
}

function minimax(board, depth, alpha, beta, maximizing, color, rootColor) {
  if (depth === 0) return { score: evaluate(board, rootColor) };
  const moves = legalMoves(board, color);
  if (!moves.length) {
    if (isInCheck(board, color)) {
      return { score: maximizing ? -99999 + (4 - depth) : 99999 - (4 - depth) };
    }
    return { score: 0 };
  }
  let best = null;
  if (maximizing) {
    let bestScore = -Infinity;
    for (const m of moves) {
      const next = applyMove(board, m);
      const res = minimax(next, depth - 1, alpha, beta, false, color === "w" ? "b" : "w", rootColor);
      if (res.score > bestScore) {
        bestScore = res.score;
        best = m;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: best };
  }
  let bestScore = Infinity;
  for (const m of moves) {
    const next = applyMove(board, m);
    const res = minimax(next, depth - 1, alpha, beta, true, color === "w" ? "b" : "w", rootColor);
    if (res.score < bestScore) {
      bestScore = res.score;
      best = m;
    }
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: best };
}

function scoreAllMoves(board, color, depth) {
  const moves = legalMoves(board, color);
  return moves.map((m) => {
    const next = applyMove(board, m);
    const res = minimax(next, Math.max(0, depth - 1), -Infinity, Infinity, false, color === "w" ? "b" : "w", color);
    return { ...m, score: res.score };
  });
}

export function mountChessGame(root, { botTier, onExit, onEnd }) {
  const tier = getBotTier(botTier);
  let board = setupBoard();
  let turn = "w";
  let selected = null;
  let highlights = [];
  let status = "Sua vez — jogue com as brancas";
  let over = false;
  let botThinking = false;

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-chess-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Xadrez</div>
      <div class="tg-board-status" data-status></div>
      <div class="tg-board-meta">Bot: <strong>${tier.label}</strong></div>
    </div>
    <div class="tg-chess-stage">
      <div class="tg-chess-board" data-board role="grid" aria-label="Tabuleiro de xadrez"></div>
    </div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);

  const boardEl = wrap.querySelector("[data-board]");
  const statusEl = wrap.querySelector("[data-status]");

  function setStatus(msg) {
    status = msg;
    statusEl.textContent = msg;
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `tg-sq ${(r + c) % 2 === 0 ? "light" : "dark"}`;
        if (selected && selected.r === r && selected.c === c) cell.classList.add("selected");
        if (highlights.some((h) => h.r === r && h.c === c)) {
          cell.classList.add(board[r][c] ? "capture" : "move");
        }
        const p = board[r][c];
        if (p) {
          cell.textContent = UNICODE[p.c + p.t];
          cell.classList.add(p.c === "w" ? "piece-w" : "piece-b");
        }
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.setAttribute("aria-label", `${FILES[c]}${8 - r}`);
        boardEl.appendChild(cell);
      }
    }
  }

  function endGame(winner) {
    over = true;
    if (winner === "w") {
      setStatus("Xeque-mate! Você venceu.");
      playWin();
    } else if (winner === "b") {
      setStatus("Xeque-mate! O bot venceu.");
      playLose();
    } else {
      setStatus("Empate — afogamento.");
    }
    onEnd?.(winner);
  }

  function afterMove(colorMoved) {
    const opp = colorMoved === "w" ? "b" : "w";
    const moves = legalMoves(board, opp);
    if (!moves.length) {
      if (isInCheck(board, opp)) endGame(colorMoved);
      else endGame("draw");
      return false;
    }
    if (isInCheck(board, opp)) {
      playCheck();
      setStatus(opp === "w" ? "Xeque em você!" : "Xeque no bot!");
    }
    return true;
  }

  function doMove(m) {
    const captured = !!board[m.tr][m.tc];
    board = applyMove(board, m);
    if (captured) playCapture();
    else playPiecePlace(true);
    selected = null;
    highlights = [];
    render();
    return afterMove(turn);
  }

  function botPlay() {
    if (over || turn !== "b") return;
    botThinking = true;
    setStatus("Bot pensando...");
    playBotThink();
    const delay = 350 + tier.depth * 220 + Math.random() * 400;
    setTimeout(() => {
      if (over) return;
      const scored = scoreAllMoves(board, "b", tier.depth);
      const pick = pickMoveWithWisdom(scored, tier.id);
      if (!pick) {
        endGame("draw");
        return;
      }
      const cont = doMove(pick);
      botThinking = false;
      if (cont && !over) {
        turn = "w";
        setStatus(isInCheck(board, "w") ? "Xeque! Sua vez." : "Sua vez");
        render();
      }
    }, delay);
  }

  function onCell(r, c) {
    if (over || botThinking || turn !== "w") return;
    const p = board[r][c];
    if (selected) {
      const m = highlights.find((h) => h.r === r && h.c === c);
      if (m) {
        const move = legalMoves(board, "w").find(
          (x) => x.fr === selected.r && x.fc === selected.c && x.tr === r && x.tc === c
        );
        if (!move) {
          playIllegal();
          return;
        }
        const cont = doMove(move);
        if (cont && !over) {
          turn = "b";
          render();
          botPlay();
        }
        return;
      }
    }
    if (p && p.c === "w") {
      selected = { r, c };
      highlights = legalMoves(board, "w")
        .filter((m) => m.fr === r && m.fc === c)
        .map((m) => ({ r: m.tr, c: m.tc }));
      render();
    } else if (selected) {
      playIllegal();
      selected = null;
      highlights = [];
      render();
    }
  }

  boardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tg-sq");
    if (!btn) return;
    onCell(+btn.dataset.r, +btn.dataset.c);
  });

  wrap.querySelector("[data-exit]").addEventListener("click", () => onExit?.());
  wrap.querySelector("[data-restart]").addEventListener("click", () => {
    board = setupBoard();
    turn = "w";
    selected = null;
    highlights = [];
    over = false;
    botThinking = false;
    setStatus("Sua vez — jogue com as brancas");
    render();
  });

  setStatus(status);
  render();

  return () => {
    wrap.remove();
  };
}

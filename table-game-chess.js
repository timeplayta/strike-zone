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
const PIECE_NAME = {
  p: "Peão",
  n: "Cavalo",
  b: "Bispo",
  r: "Torre",
  q: "Rainha",
  k: "Rei",
};

/** Silhuetas SVG — legíveis em qualquer fonte/OS (unicode de xadrez vira emoji e some a cor) */
const PIECE_SVG = {
  k: `<path d="M20 6v3h-2.5V6h-3v3H12V6H9.5v3H7V6H4.5v4.5c0 1.2.7 2.2 1.8 2.7L5 16.5h14l-1.3-3.3c1.1-.5 1.8-1.5 1.8-2.7V6H20zM7 28h10l1.2-9.5H5.8L7 28zm-1.5 2.5h11L17 34H7l-.5-3.5z"/>`,
  q: `<path d="M6 10l2.2 8h7.6L18 10l-2.5 4.5L12.8 8 10.5 14.5 8 10zm1.2 10L6.5 28h11l-.7-8H7.2zM6.2 30h11.6L18.5 34h-13l.7-4z"/>`,
  r: `<path d="M7 8h2v3h2V8h2v3h2V8h2v5.5H7V8zm0 7h10l-.8 11H7.8L7 15zm.5 13h9L17 34H7l.5-6z"/>`,
  b: `<path d="M12 6c1.8 0 3.2 1.6 2.9 3.4-.2 1.1-.9 1.9-1.4 2.6-.4.5-.5.9-.5 1.2 0 .8.6 1.3 1.4 1.8 1.5.9 3.1 2.2 3.1 4.5V22H6.5v-2.5c0-2.3 1.6-3.6 3.1-4.5.8-.5 1.4-1 1.4-1.8 0-.3-.1-.7-.5-1.2-.5-.7-1.2-1.5-1.4-2.6C8.8 7.6 10.2 6 12 6zm-4 18h8l.6 4H7.4L7.2 24zm-.4 6h8.4L16 34H8l-.4-4z"/>`,
  n: `<path d="M16.5 9.5c.2-1.8-1-3.5-2.8-3.8-1.2-.2-2.3.3-3.1 1.2L7.5 11.5c-.8.9-.7 2.2.2 2.9l1.6 1.2c-1.2.6-2.3 1.8-2.8 3.3-.6 1.8.1 3.6 1.5 4.7L9 28h8.5l.8-4.2c1.2-1 1.9-2.5 1.9-4.1 0-2.2-1.2-3.9-2.7-5.1.5-.7.9-1.6 1-2.6l-2-.5zm-7.2 4.2l2.4-2.7c.4-.5 1.1-.7 1.7-.5.7.2 1.1.9 1 1.6l-.3 1.6-4.8 0zM8.2 30h9.2L18 34H7.5l.7-4z"/>`,
  p: `<path d="M12 7.5c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm-2.8 7.5h5.6c1.4 0 2.5 1.2 2.3 2.6L16.5 23h-9l-.6-5.4c-.2-1.4.9-2.6 2.3-2.6zM8 25h8l.7 3H7.3L8 25zm-.6 5h9.2L17 34H7l.4-4z"/>`,
};

function pieceGlyph(type, color) {
  const path = PIECE_SVG[type] || PIECE_SVG.p;
  const fill = color === "w" ? "#f7f0de" : "#1c1410";
  const stroke = color === "w" ? "#2a1c10" : "#e8d5a8";
  const accent = color === "w" ? "#c9a227" : "#d4b45a";
  return `
    <span class="tg-chess-piece piece-${color}" data-type="${type}" aria-hidden="true">
      <svg viewBox="0 0 24 36" width="100%" height="100%" focusable="false">
        <ellipse cx="12" cy="33.2" rx="7.5" ry="1.6" fill="rgba(0,0,0,0.22)"/>
        <g fill="${fill}" stroke="${stroke}" stroke-width="1.15" stroke-linejoin="round">${path}</g>
        ${type === "k" || type === "q" ? `<circle cx="12" cy="5.2" r="1.35" fill="${accent}" stroke="${stroke}" stroke-width="0.7"/>` : ""}
      </svg>
      <span class="tg-chess-badge" title="${type}">${type.toUpperCase()}</span>
    </span>
  `;
}

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
  // peões atacam na diagonal à frente (brancas sobem = row--)
  const pr = byColor === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pr, c + dc)) {
      const p = board[pr][c + dc];
      if (p && p.c === byColor && p.t === "p") return true;
    }
  }
  for (const [dr, dc] of [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
  ]) {
    const rr = r + dr;
    const cc = c + dc;
    if (!inBounds(rr, cc)) continue;
    const p = board[rr][cc];
    if (p && p.c === byColor && p.t === "n") return true;
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;
      const p = board[rr][cc];
      if (p && p.c === byColor && p.t === "k") return true;
    }
  }
  for (const [dr, dc] of [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ]) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.c === byColor && (p.t === "r" || p.t === "q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  for (const [dr, dc] of [
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.c === byColor && (p.t === "b" || p.t === "q")) return true;
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

function pushMove(moves, board, fr, fc, tr, tc) {
  moves.push({ fr, fc, tr, tc, captured: board[tr][tc] });
}

/** Raios deslizantes (torre / bispo / rainha) */
function genSliding(board, r, c, rays, moves) {
  const p = board[r][c];
  for (const [dr, dc] of rays) {
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc)) {
      const t = board[rr][cc];
      if (!t) {
        pushMove(moves, board, r, c, rr, cc);
      } else {
        if (t.c !== p.c) pushMove(moves, board, r, c, rr, cc);
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
}

const ROOK_RAYS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const BISHOP_RAYS = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const QUEEN_RAYS = [...ROOK_RAYS, ...BISHOP_RAYS];

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
  } else if (p.t === "r") {
    genSliding(board, r, c, ROOK_RAYS, moves);
  } else if (p.t === "b") {
    genSliding(board, r, c, BISHOP_RAYS, moves);
  } else if (p.t === "q") {
    // rainha = torre + bispo, qualquer distância nas 8 direções
    genSliding(board, r, c, QUEEN_RAYS, moves);
  } else if (p.t === "k") {
    // rei = 1 casa em qualquer direção
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
  if (!piece) return next;
  const captured = next[m.tr][m.tc];
  const wasPawn = piece.t === "p";
  next[m.tr][m.tc] = piece;
  next[m.fr][m.fc] = null;
  if (piece.t === "p" && (m.tr === 0 || m.tr === 7)) next[m.tr][m.tc] = { t: "q", c: piece.c };
  next._meta = { captured: !!captured, pawnMove: wasPawn };
  return next;
}

function positionKey(board, turn) {
  let s = turn + "|";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      s += p ? p.c + p.t : ".";
    }
  }
  return s;
}

/** Empate por insuficiência de material (FIDE simplificado) */
function insufficientMaterial(board) {
  const minors = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.t === "k") continue;
      if (p.t === "q" || p.t === "r" || p.t === "p") return false;
      if (p.t === "b" || p.t === "n") minors.push({ t: p.t, c: p.c, sq: (r + c) % 2 });
    }
  }
  if (minors.length === 0) return true; // K vs K
  if (minors.length === 1) return true; // K+B ou K+N vs K
  if (minors.length === 2) {
    const [a, b] = minors;
    // K+B vs K+B mesma cor de casa
    if (a.t === "b" && b.t === "b" && a.c !== b.c && a.sq === b.sq) return true;
  }
  return false;
}

function countRepetitions(history, key) {
  let n = 0;
  for (const h of history) if (h === key) n++;
  return n;
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

function legalMovesFrom(board, color, r, c) {
  return legalMoves(board, color).filter((m) => m.fr === r && m.fc === c);
}

function evaluate(board, perspective) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = PIECE_VAL[p.t] || 0;
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

function sqName(r, c) {
  return `${FILES[c]}${8 - r}`;
}

export function mountChessGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let board = setupBoard();
  let turn = "w";
  let selected = null;
  let highlights = [];
  let selectedMoves = [];
  let status = "Sua vez — jogue com as brancas";
  let over = false;
  let botThinking = false;
  let lastFrom = null;
  let lastTo = null;
  let halfmoveClock = 0;
  let plyCount = 0;
  let positionHistory = [positionKey(board, "w")];

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-chess-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Xadrez</div>
      <div class="tg-board-status" data-status></div>
      <div class="tg-board-meta">Bot: <strong>${tier.label}</strong> · K rei · Q rainha · R torre · B bispo · N cavalo · P peão</div>
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

  function startClockForPlayer() {
    match?.startPlayerClock?.(plyCount === 0);
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        const tone = (r + c) % 2 === 0 ? "light" : "dark";
        cell.className = `tg-sq tg-chess-sq ${tone}`;
        if (selected && selected.r === r && selected.c === c) cell.classList.add("selected");
        if (lastFrom && lastFrom.r === r && lastFrom.c === c) cell.classList.add("last-from");
        if (lastTo && lastTo.r === r && lastTo.c === c) cell.classList.add("last-to");
        const hi = highlights.find((h) => h.r === r && h.c === c);
        if (hi) cell.classList.add(hi.cap ? "capture" : "move");
        const p = board[r][c];
        if (p) {
          cell.innerHTML = pieceGlyph(p.t, p.c);
          cell.classList.add(p.c === "w" ? "has-w" : "has-b");
        }
        if (r === 7) {
          const lab = document.createElement("span");
          lab.className = "tg-coord file";
          lab.textContent = FILES[c];
          cell.appendChild(lab);
        }
        if (c === 0) {
          const lab = document.createElement("span");
          lab.className = "tg-coord rank";
          lab.textContent = String(8 - r);
          cell.appendChild(lab);
        }
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        const label = p
          ? `${PIECE_NAME[p.t]} ${p.c === "w" ? "branco" : "preto"} em ${sqName(r, c)}`
          : sqName(r, c);
        cell.setAttribute("aria-label", label);
        boardEl.appendChild(cell);
      }
    }
  }

  function endGame(result, reason = "") {
    if (over) return;
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    if (result === "w") {
      setStatus(reason || "Xeque-mate! Você venceu.");
      playWin();
    } else if (result === "b") {
      setStatus(reason || "Xeque-mate! O bot venceu.");
      playLose();
    } else {
      setStatus(reason || "Empate.");
      match?.pushChat?.("Mesa", reason || "Empate.", "system");
    }
    onEnd?.(result, reason);
  }

  function checkAutomaticDraws(nextTurn) {
    if (insufficientMaterial(board)) {
      endGame("draw", "Empate — insuficiência de material.");
      return true;
    }
    if (halfmoveClock >= 100) {
      endGame("draw", "Empate — regra dos 50 movimentos.");
      return true;
    }
    const key = positionKey(board, nextTurn);
    if (countRepetitions(positionHistory, key) >= 3) {
      endGame("draw", "Empate — repetição da mesma posição (3×).");
      return true;
    }
    return false;
  }

  function afterMove(colorMoved) {
    const opp = colorMoved === "w" ? "b" : "w";
    const key = positionKey(board, opp);
    positionHistory.push(key);

    if (checkAutomaticDraws(opp)) return false;

    const moves = legalMoves(board, opp);
    if (!moves.length) {
      if (isInCheck(board, opp)) endGame(colorMoved);
      else endGame("draw", "Empate — afogamento.");
      return false;
    }
    if (isInCheck(board, opp)) {
      playCheck();
      setStatus(opp === "w" ? "Xeque em você!" : "Xeque no bot!");
    }
    return true;
  }

  function doMove(m) {
    match?.endPlayerClock?.();
    const piece = board[m.fr][m.fc];
    const captured = !!board[m.tr][m.tc];
    const pawnMove = piece?.t === "p";
    lastFrom = { r: m.fr, c: m.fc };
    lastTo = { r: m.tr, c: m.tc };
    board = applyMove(board, m);
    if (pawnMove || captured) halfmoveClock = 0;
    else halfmoveClock += 1;
    plyCount += 1;
    if (captured) playCapture();
    else playPiecePlace(true);
    selected = null;
    highlights = [];
    selectedMoves = [];
    render();
    return afterMove(turn);
  }

  function explainIllegal(fr, fc, tr, tc) {
    const piece = board[fr][fc];
    if (!piece) return "Casa vazia.";
    const pseudo = genPseudo(board, fr, fc).find((m) => m.tr === tr && m.tc === tc);
    if (!pseudo) {
      if (piece.t === "q") return "A rainha anda em linha reta (↔ ↕ ou diagonal), sem pular peças.";
      if (piece.t === "k") return "O rei só anda 1 casa em qualquer direção.";
      return `${PIECE_NAME[piece.t]} não faz esse movimento.`;
    }
    const next = applyMove(board, pseudo);
    if (isInCheck(next, piece.c)) {
      if (piece.t === "k") return "O rei não pode ir para casa atacada.";
      return `${PIECE_NAME[piece.t]} está cravada — essa jogada deixa o rei em xeque.`;
    }
    return "Jogada ilegal.";
  }

  function botPlay() {
    if (over || turn !== "b") return;
    botThinking = true;
    match?.setActionsEnabled?.(false);
    setStatus("Bot pensando...");
    playBotThink();
    const delay = 350 + tier.depth * 220 + Math.random() * 400;
    setTimeout(() => {
      if (over) {
        botThinking = false;
        return;
      }
      try {
        const scored = scoreAllMoves(board, "b", tier.depth);
        const pick = pickMoveWithWisdom(scored, tier.id);
        if (!pick) {
          botThinking = false;
          endGame("draw", "Empate — sem jogadas.");
          return;
        }
        const cont = doMove(pick);
        botThinking = false;
        if (cont && !over) {
          turn = "w";
          match?.setActionsEnabled?.(true);
          match?.resetDrawOffer?.();
          setStatus(isInCheck(board, "w") ? "Xeque! Sua vez." : "Sua vez");
          render();
          startClockForPlayer();
        }
      } catch (err) {
        console.error(err);
        botThinking = false;
        turn = "w";
        match?.setActionsEnabled?.(true);
        setStatus("Erro no bot — sua vez.");
        render();
        startClockForPlayer();
      }
    }, delay);
  }

  function selectPiece(r, c) {
    const p = board[r][c];
    selected = { r, c };
    selectedMoves = legalMovesFrom(board, "w", r, c);
    highlights = selectedMoves.map((m) => ({ r: m.tr, c: m.tc, cap: !!board[m.tr][m.tc] }));
    const name = PIECE_NAME[p.t];
    if (!selectedMoves.length) {
      const pseudo = genPseudo(board, r, c);
      if (pseudo.length) {
        setStatus(`${name} cravada — não pode se mexer sem expor o rei.`);
      } else if (p.t === "k" && isInCheck(board, "w")) {
        setStatus("Rei em xeque sem escapatória nesta casa — use outra peça.");
      } else {
        setStatus(`${name} sem jogadas agora.`);
      }
    } else {
      setStatus(`${name} selecionada — ${selectedMoves.length} jogada(s).`);
    }
    render();
  }

  function onCell(r, c) {
    if (over || botThinking || turn !== "w") return;
    const p = board[r][c];

    if (selected) {
      const move = selectedMoves.find((x) => x.tr === r && x.tc === c);
      if (move) {
        const cont = doMove(move);
        if (cont && !over) {
          turn = "b";
          if (!isInCheck(board, "b")) setStatus("Bot pensando...");
          render();
          botPlay();
        }
        return;
      }
      if (p && p.c === "w") {
        selectPiece(r, c);
        return;
      }
      playIllegal();
      setStatus(explainIllegal(selected.r, selected.c, r, c));
      selected = null;
      highlights = [];
      selectedMoves = [];
      render();
      return;
    }

    if (p && p.c === "w") {
      selectPiece(r, c);
    }
  }

  function resign() {
    if (over) return;
    endGame("b", "Você desistiu.");
    match?.pushChat?.("Mesa", "Vitória do bot por desistência.", "system");
  }

  function timeout(kind) {
    if (over) return;
    const msg = kind === "first"
      ? "Você perdeu — demorou mais de 1 min no 1º lance."
      : "Você perdeu — offline (mais de 3 min sem jogar).";
    endGame("b", msg);
  }

  function offerDraw() {
    if (over || botThinking) {
      match?.resetDrawOffer?.();
      return;
    }
    // Bot aceita se a posição não for claramente vantajosa pra ele
    const evalW = evaluate(board, "w");
    const accept =
      evalW <= 80 || // igual ou pior pra brancas → bot (pretas) topa fácil
      (evalW <= 220 && Math.random() < 0.45) ||
      Math.random() < 0.12;

    setTimeout(() => {
      if (over) return;
      if (accept) {
        match?.pushChat?.("Bot", "Aceito o empate.", "bot");
        match?.markDrawResolved?.(true);
        endGame("draw", "Empate — por acordo.");
      } else {
        match?.pushChat?.("Bot", "Recuso o empate. Vamos jogar!", "bot");
        match?.markDrawResolved?.(false);
        setStatus("Bot recusou o empate.");
      }
    }, 600 + Math.random() * 900);
  }

  function resetMatch() {
    board = setupBoard();
    turn = "w";
    selected = null;
    highlights = [];
    selectedMoves = [];
    lastFrom = null;
    lastTo = null;
    halfmoveClock = 0;
    plyCount = 0;
    positionHistory = [positionKey(board, "w")];
    over = false;
    botThinking = false;
    match?.resetDrawOffer?.();
    match?.setActionsEnabled?.(true);
    setStatus("Sua vez — jogue com as brancas");
    render();
    startClockForPlayer();
  }

  boardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tg-sq");
    if (!btn) return;
    onCell(+btn.dataset.r, +btn.dataset.c);
  });

  wrap.querySelector("[data-exit]").addEventListener("click", () => {
    match?.stopClock?.();
    onExit?.();
  });
  wrap.querySelector("[data-restart]").addEventListener("click", () => {
    match?.endPlayerClock?.();
    resetMatch();
  });

  onBind?.({
    resign,
    offerDraw,
    timeout,
  });

  setStatus(status);
  render();
  match?.setActionsEnabled?.(true);
  startClockForPlayer();

  return () => {
    match?.stopClock?.();
    wrap.remove();
  };
}

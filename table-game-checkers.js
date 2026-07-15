/**
 * Damas (regras estilo brasileiro 8x8) — capturas obrigatórias, dama voadora
 */

import {
  playPiecePlace,
  playCapture,
  playIllegal,
  playWin,
  playLose,
  playBotThink,
} from "./table-games-audio.js";
import { getBotTier, pickMoveWithWisdom } from "./table-games-bots.js";

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function setupBoard() {
  const b = emptyBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) b[r][c] = { c: "b", k: false };
        if (r > 4) b[r][c] = { c: "w", k: false };
      }
    }
  }
  return b;
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/** Gera sequências de captura a partir de uma peça (recursivo) */
function captureSequences(board, r, c, piece, path = [], captured = []) {
  const results = [];
  const dirs = piece.k
    ? [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : piece.c === "w"
    ? [
        [-1, -1], [-1, 1],
      ]
    : [
        [1, -1], [1, 1],
      ];

  // damas voadoras também capturam nas 4 diagonais
  const searchDirs = piece.k
    ? [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : dirs;

  let found = false;
  for (const [dr, dc] of searchDirs) {
    if (piece.k) {
      let rr = r + dr;
      let cc = c + dc;
      let enemy = null;
      let er = -1;
      let ec = -1;
      while (inBounds(rr, cc)) {
        const cell = board[rr][cc];
        if (cell) {
          if (cell.c === piece.c || enemy) break;
          enemy = cell;
          er = rr;
          ec = cc;
          rr += dr;
          cc += dc;
          continue;
        }
        if (enemy) {
          if (captured.some((x) => x.r === er && x.c === ec)) break;
          const next = cloneBoard(board);
          next[r][c] = null;
          next[er][ec] = null;
          const landed = { ...piece };
          if ((landed.c === "w" && rr === 0) || (landed.c === "b" && rr === 7)) landed.k = true;
          next[rr][cc] = landed;
          const step = {
            fr: r,
            fc: c,
            tr: rr,
            tc: cc,
            captures: [...captured, { r: er, c: ec }],
            path: [...path, { r: rr, c: cc }],
          };
          const deeper = captureSequences(next, rr, cc, landed, step.path, step.captures);
          if (deeper.length) results.push(...deeper);
          else results.push(step);
          found = true;
        }
        if (!enemy) {
          rr += dr;
          cc += dc;
          continue;
        }
        // após inimigo, pode pousar em várias casas vazias
        let lr = rr;
        let lc = cc;
        while (inBounds(lr, lc) && !board[lr][lc]) {
          if (captured.some((x) => x.r === er && x.c === ec)) break;
          const next = cloneBoard(board);
          next[r][c] = null;
          next[er][ec] = null;
          const landed = { ...piece };
          if ((landed.c === "w" && lr === 0) || (landed.c === "b" && lr === 7)) landed.k = true;
          next[lr][lc] = landed;
          const step = {
            fr: r,
            fc: c,
            tr: lr,
            tc: lc,
            captures: [...captured, { r: er, c: ec }],
            path: [...path, { r: lr, c: lc }],
          };
          const deeper = captureSequences(next, lr, lc, landed, step.path, step.captures);
          if (deeper.length) results.push(...deeper);
          else results.push(step);
          found = true;
          lr += dr;
          lc += dc;
        }
        break;
      }
    } else {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (!inBounds(lr, lc)) continue;
      const mid = board[mr]?.[mc];
      if (!mid || mid.c === piece.c) continue;
      if (board[lr][lc]) continue;
      if (captured.some((x) => x.r === mr && x.c === mc)) continue;
      const next = cloneBoard(board);
      next[r][c] = null;
      next[mr][mc] = null;
      const landed = { ...piece };
      if ((landed.c === "w" && lr === 0) || (landed.c === "b" && lr === 7)) landed.k = true;
      next[lr][lc] = landed;
      const step = {
        fr: r,
        fc: c,
        tr: lr,
        tc: lc,
        captures: [...captured, { r: mr, c: mc }],
        path: [...path, { r: lr, c: lc }],
      };
      const deeper = captureSequences(next, lr, lc, landed, step.path, step.captures);
      if (deeper.length) results.push(...deeper);
      else results.push(step);
      found = true;
    }
  }
  if (!found && path.length) {
    return [
      {
        fr: path.length ? /* filled by caller */ 0 : 0,
        fc: 0,
        tr: r,
        tc: c,
        captures: captured,
        path,
        _fromPiece: true,
      },
    ];
  }
  return results;
}

function simpleMoves(board, r, c, piece) {
  const moves = [];
  const dirs = piece.k
    ? [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : piece.c === "w"
    ? [
        [-1, -1], [-1, 1],
      ]
    : [
        [1, -1], [1, 1],
      ];
  for (const [dr, dc] of dirs) {
    if (piece.k) {
      let rr = r + dr;
      let cc = c + dc;
      while (inBounds(rr, cc) && !board[rr][cc]) {
        moves.push({ fr: r, fc: c, tr: rr, tc: cc, captures: [], path: [{ r: rr, c: cc }] });
        rr += dr;
        cc += dc;
      }
    } else {
      const rr = r + dr;
      const cc = c + dc;
      if (inBounds(rr, cc) && !board[rr][cc]) {
        moves.push({ fr: r, fc: c, tr: rr, tc: cc, captures: [], path: [{ r: rr, c: cc }] });
      }
    }
  }
  return moves;
}

function allMovesForColor(board, color) {
  const captures = [];
  const quiet = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.c !== color) continue;
      // captura a partir da posição atual
      const caps = getCapturesFrom(board, r, c, p);
      if (caps.length) captures.push(...caps);
      else quiet.push(...simpleMoves(board, r, c, p));
    }
  }
  if (captures.length) {
    const maxCap = Math.max(...captures.map((m) => m.captures.length));
    return captures.filter((m) => m.captures.length === maxCap);
  }
  return quiet;
}

function getCapturesFrom(board, r, c, piece) {
  // implementação limpa de captura
  const out = [];
  exploreCaptures(board, r, c, piece, r, c, [], [], out);
  return out;
}

function exploreCaptures(board, startR, startC, piece, r, c, path, captured, out) {
  const dirs = [
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];
  let extended = false;

  for (const [dr, dc] of dirs) {
    if (!piece.k) {
      // peão: só captura "para frente" na primeira? No brasileiro peão captura nas 4 diagonais
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (!inBounds(lr, lc)) continue;
      const mid = board[mr][mc];
      if (!mid || mid.c === piece.c) continue;
      if (board[lr][lc]) continue;
      if (captured.some((x) => x.r === mr && x.c === mc)) continue;
      const next = cloneBoard(board);
      next[r][c] = null;
      next[mr][mc] = null;
      const landed = { ...piece };
      if ((landed.c === "w" && lr === 0) || (landed.c === "b" && lr === 7)) landed.k = true;
      next[lr][lc] = landed;
      exploreCaptures(
        next,
        startR,
        startC,
        landed,
        lr,
        lc,
        [...path, { r: lr, c: lc }],
        [...captured, { r: mr, c: mc }],
        out
      );
      extended = true;
    } else {
      let rr = r + dr;
      let cc = c + dc;
      let enemy = null;
      let er = -1;
      let ec = -1;
      while (inBounds(rr, cc)) {
        const cell = board[rr][cc];
        if (!enemy) {
          if (cell) {
            if (cell.c === piece.c) break;
            enemy = cell;
            er = rr;
            ec = cc;
          }
          rr += dr;
          cc += dc;
          continue;
        }
        if (cell) break;
        if (captured.some((x) => x.r === er && x.c === ec)) break;
        const next = cloneBoard(board);
        next[r][c] = null;
        next[er][ec] = null;
        const landed = { ...piece };
        next[rr][cc] = landed;
        exploreCaptures(
          next,
          startR,
          startC,
          landed,
          rr,
          cc,
          [...path, { r: rr, c: cc }],
          [...captured, { r: er, c: ec }],
          out
        );
        extended = true;
        rr += dr;
        cc += dc;
      }
    }
  }

  if (!extended && captured.length) {
    out.push({
      fr: startR,
      fc: startC,
      tr: r,
      tc: c,
      captures: captured,
      path: path.length ? path : [{ r, c }],
    });
  }
}

function applyMove(board, m) {
  const next = cloneBoard(board);
  const piece = { ...next[m.fr][m.fc] };
  next[m.fr][m.fc] = null;
  for (const cap of m.captures || []) next[cap.r][cap.c] = null;
  if ((piece.c === "w" && m.tr === 0) || (piece.c === "b" && m.tr === 7)) piece.k = true;
  next[m.tr][m.tc] = piece;
  return next;
}

function countPieces(board, color) {
  let n = 0;
  for (const row of board) {
    for (const p of row) if (p && p.c === color) n++;
  }
  return n;
}

function evaluate(board, perspective) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = p.k ? 450 : 100;
      v += (p.c === "w" ? 7 - r : r) * 3;
      score += p.c === perspective ? v : -v;
    }
  }
  return score;
}

function minimax(board, depth, maximizing, color, root) {
  if (depth === 0) return { score: evaluate(board, root) };
  const moves = allMovesForColor(board, color);
  if (!moves.length) return { score: maximizing ? -50000 : 50000 };
  let best = null;
  let bestScore = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const next = applyMove(board, m);
    const res = minimax(next, depth - 1, !maximizing, color === "w" ? "b" : "w", root);
    if (maximizing ? res.score > bestScore : res.score < bestScore) {
      bestScore = res.score;
      best = m;
    }
  }
  return { score: bestScore, move: best };
}

function scoreMoves(board, color, depth) {
  return allMovesForColor(board, color).map((m) => {
    const next = applyMove(board, m);
    const res = minimax(next, Math.max(0, depth - 1), false, color === "w" ? "b" : "w", color);
    return { ...m, score: res.score + (m.captures?.length || 0) * 80 };
  });
}

export function mountCheckersGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let board = setupBoard();
  let turn = "w";
  let selected = null;
  let highlights = [];
  let over = false;
  let botThinking = false;
  let plyCount = 0;

  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-dama-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Dama</div>
      <div class="tg-board-status" data-status></div>
      <div class="tg-board-meta">Bot: <strong>${tier.label}</strong> · capturas obrigatórias</div>
    </div>
    <div class="tg-dama-stage">
      <div class="tg-dama-board" data-board role="grid" aria-label="Tabuleiro de damas"></div>
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
        cell.className = `tg-sq ${(r + c) % 2 === 0 ? "light" : "dark"}`;
        if (selected && selected.r === r && selected.c === c) cell.classList.add("selected");
        if (highlights.some((h) => h.r === r && h.c === c)) {
          cell.classList.add(highlights.find((h) => h.r === r && h.c === c).cap ? "capture" : "move");
        }
        const p = board[r][c];
        if (p) {
          const disc = document.createElement("span");
          disc.className = `tg-disc ${p.c === "w" ? "disc-w" : "disc-b"}${p.k ? " king" : ""}`;
          disc.textContent = p.k ? "♛" : "";
          cell.appendChild(disc);
        }
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        boardEl.appendChild(cell);
      }
    }
  }

  function endGame(winner, reason = "") {
    if (over) return;
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    if (winner === "w") {
      setStatus(reason || "Você venceu!");
      playWin();
    } else if (winner === "draw") {
      setStatus(reason || "Empate.");
      match?.pushChat?.("Mesa", reason || "Empate.", "system");
    } else {
      setStatus(reason || "O bot venceu.");
      playLose();
    }
    onEnd?.(winner, reason);
  }

  function checkEnd(afterColor) {
    const opp = afterColor === "w" ? "b" : "w";
    if (!countPieces(board, opp) || !allMovesForColor(board, opp).length) {
      endGame(afterColor);
      return true;
    }
    return false;
  }

  function doMove(m) {
    match?.endPlayerClock?.();
    board = applyMove(board, m);
    plyCount += 1;
    if (m.captures?.length) playCapture();
    else playPiecePlace();
    selected = null;
    highlights = [];
    render();
    return !checkEnd(turn);
  }

  function botPlay() {
    if (over || turn !== "b") return;
    botThinking = true;
    match?.setActionsEnabled?.(false);
    setStatus("Bot pensando...");
    playBotThink();
    setTimeout(() => {
      if (over) {
        botThinking = false;
        return;
      }
      const scored = scoreMoves(board, "b", tier.depth);
      const pick = pickMoveWithWisdom(scored, tier.id);
      if (!pick) {
        endGame("w");
        return;
      }
      const cont = doMove(pick);
      botThinking = false;
      if (cont && !over) {
        turn = "w";
        match?.setActionsEnabled?.(true);
        match?.resetDrawOffer?.();
        setStatus("Sua vez");
        render();
        startClockForPlayer();
      }
    }, 400 + tier.depth * 180);
  }

  function onCell(r, c) {
    if (over || botThinking || turn !== "w") return;
    const moves = allMovesForColor(board, "w");
    if (selected) {
      const m = moves.find((x) => x.fr === selected.r && x.fc === selected.c && x.tr === r && x.tc === c);
      if (m) {
        const cont = doMove(m);
        if (cont && !over) {
          turn = "b";
          botPlay();
        }
        return;
      }
    }
    const p = board[r][c];
    if (p && p.c === "w") {
      const mine = moves.filter((m) => m.fr === r && m.fc === c);
      if (!mine.length) {
        playIllegal();
        setStatus("Essa peça não tem jogada válida (captura obrigatória?)");
        return;
      }
      selected = { r, c };
      highlights = mine.map((m) => ({ r: m.tr, c: m.tc, cap: !!m.captures?.length }));
      render();
    } else if (selected) {
      playIllegal();
      selected = null;
      highlights = [];
      render();
    }
  }

  function resign() {
    if (over) return;
    endGame("b", "Você desistiu.");
    match?.pushChat?.("Mesa", "Vitória do bot por desistência.", "system");
  }

  function timeout(kind) {
    if (over) return;
    endGame(
      "b",
      kind === "first"
        ? "Você perdeu — demorou mais de 1 min no 1º lance."
        : "Você perdeu — offline (mais de 3 min sem jogar)."
    );
  }

  function offerDraw() {
    if (over || botThinking) {
      match?.resetDrawOffer?.();
      return;
    }
    const my = countPieces(board, "w");
    const opp = countPieces(board, "b");
    const accept = my <= opp + 1 || Math.random() < 0.2;
    setTimeout(() => {
      if (over) return;
      if (accept) {
        match?.pushChat?.("Bot", "Aceito o empate.", "bot");
        match?.markDrawResolved?.(true);
        endGame("draw", "Empate — por acordo.");
      } else {
        match?.pushChat?.("Bot", "Recuso o empate.", "bot");
        match?.markDrawResolved?.(false);
        setStatus("Bot recusou o empate.");
      }
    }, 500 + Math.random() * 800);
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
    board = setupBoard();
    turn = "w";
    selected = null;
    highlights = [];
    over = false;
    botThinking = false;
    plyCount = 0;
    match?.resetDrawOffer?.();
    match?.setActionsEnabled?.(true);
    setStatus("Sua vez — peças claras");
    render();
    startClockForPlayer();
  });

  onBind?.({ resign, offerDraw, timeout });
  setStatus("Sua vez — peças claras");
  render();
  match?.setActionsEnabled?.(true);
  startClockForPlayer();
  return () => {
    match?.stopClock?.();
    wrap.remove();
  };
}

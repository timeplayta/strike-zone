/**
 * Revisão pós-partida — bot comenta lance a lance
 */

import { speakBotReact } from "./table-games-audio.js";

const VERDICT = {
  great: { cls: "great", emoji: "⭐", tag: "Excelente" },
  good: { cls: "good", emoji: "✓", tag: "Boa jogada" },
  ok: { cls: "ok", emoji: "◐", tag: "Ok" },
  warn: { cls: "warn", emoji: "!", tag: "Imprecisão" },
  bad: { cls: "bad", emoji: "✗", tag: "Erro" },
  info: { cls: "info", emoji: "·", tag: "Info" },
};

const BOARD_REVIEW_GAMES = new Set(["chess", "dama"]);

function v(key, comment) {
  const m = VERDICT[key] || VERDICT.info;
  return { verdict: key, ...m, comment };
}

function evalGapComment(gap, bestLabel) {
  const alt = bestLabel || "outra jogada";
  if (gap <= 25) return v("great", "Esse foi o melhor lance possível. Mandou muito bem!");
  if (gap <= 70) return v("good", `Jogada boa. Se quiser afinar, ${alt} era um pouco melhor.`);
  if (gap <= 160) return v("warn", `Aqui você perdeu vantagem. O ideal era ${alt}.`);
  return v("bad", `Erro importante. Nesta posição, o bot jogaria ${alt}.`);
}

function analyzeChess(move) {
  const a = move.analysis;
  if (!a) return v("info", move.label ? `Você jogou ${move.label}.` : "Lance registrado.");
  const gap = (a.evalBest ?? 0) - (a.evalPlayed ?? 0);
  const alt = a.bestLabel || "outra casa";
  if (move.capture) {
    const base = evalGapComment(gap, alt);
    if (gap <= 70) return v("good", `Boa captura! ${base.comment}`);
    return base;
  }
  if (move.check) {
    const base = evalGapComment(gap, alt);
    return v(base.verdict === "great" ? "great" : base.verdict, `Xeque! ${base.comment}`);
  }
  return evalGapComment(gap, alt);
}

function analyzeCheckers(move) {
  const a = move.analysis;
  if (!a) {
    if (move.capture) return v("good", "Boa captura — na dama, tomar peça costuma ser a jogada certa.");
    return v("info", move.label ? `Você jogou ${move.label}.` : "Lance registrado.");
  }
  const gap = (a.evalBest ?? 0) - (a.evalPlayed ?? 0);
  if (move.capture && gap <= 60) return v("great", "Ótima captura! Você manteve a pressão no tabuleiro.");
  return evalGapComment(gap, a.bestLabel || "outra casa");
}

function analyzeVelha(move) {
  if (move.winning) return v("great", "Jogada vencedora! Você fechou a sequência e ganhou.");
  if (move.blocking) return v("good", "Defesa certeira — você bloqueou a ameaça do bot.");
  if (move.cell === 4) return v("good", "Centro é a melhor casa no jogo da velha. Boa escolha!");
  if ([0, 2, 6, 8].includes(move.cell)) return v("ok", "Canto é ok, mas o centro costuma ser mais forte.");
  return v("warn", "Borda é fraca — o bot pode explorar melhor essa escolha.");
}

function analyzeLig4(move) {
  if (move.winning) return v("great", "Lance decisivo — você montou ameaça de 4 peças!");
  if (move.blocking) return v("good", "Bloqueou a linha do bot. Defesa essencial.");
  if (move.col === 3) return v("good", "Coluna do meio — clássica e forte no Lig 4.");
  if ([2, 4].includes(move.col)) return v("ok", "Coluna perto do centro — jogada razoável.");
  return v("warn", "Borda dá menos opções. Tente mirar o centro nas próximas.");
}

function analyzeTruco(move) {
  if (move.type === "truco") {
    return move.accepted === false
      ? v("good", "Correr com mão fraca foi sensato — você guardou pontos.")
      : v("ok", "Pediu truco! Só vale a pena com mão forte.");
  }
  if (move.type === "trick") {
    if (move.won) return v("great", "Venceu a vaza — carta certa na hora certa.");
    if (move.tie) return v("ok", "Empate na vaza — ok, o jogo continua.");
    return v("warn", "Perdeu a vaza — talvez outra carta segurava melhor.");
  }
  return v("info", move.label || "Carta jogada.");
}

function analyzeUno(move) {
  if (move.wild) return v("good", "Coringa na hora certa — você controlou a cor.");
  if (move.special === "+2" || move.special === "+4") return v("great", "Ataque! Você forçou o bot a comprar cartas.");
  if (move.uno) return v("good", "UNO! Só faltava uma carta — pressão máxima.");
  return v("ok", move.label || "Carta jogada dentro da regra.");
}

function analyzeDomino(move) {
  if (move.blocked) return v("warn", "Você passou a vez — talvez faltou encaixar antes; o monte pode ajudar.");
  if (move.endsBlocked) return v("great", "Travou uma ponta — boa tática!");
  return v("ok", move.label || "Pedra encaixada.");
}

function analyzeBattleship(move) {
  if (move.hit && move.sunk) return v("great", "Afundou um navio! Tiro certeiro.");
  if (move.hit) return v("good", "Acertou! Continue atirando na mesma região.");
  if (move.pattern === "center") return v("ok", "Tiro no centro — boa cobertura inicial.");
  return v("warn", "Água… na próxima, rastreie em cruz a partir dos acertos.");
}

function analyzeGeneric(move) {
  if (move.positive) return v("good", move.comment || "Boa decisão neste lance.");
  if (move.negative) return v("warn", move.comment || "Aqui dava para jogar melhor.");
  return v("info", move.comment || move.label || "Lance registrado.");
}

export function analyzePlayerMove(gameId, move) {
  switch (gameId) {
    case "chess":
      return analyzeChess(move);
    case "dama":
      return analyzeCheckers(move);
    case "velha":
      return analyzeVelha(move);
    case "lig4":
      return analyzeLig4(move);
    case "truco":
      return analyzeTruco(move);
    case "uno":
      return analyzeUno(move);
    case "domino":
      return analyzeDomino(move);
    case "batalha":
      return analyzeBattleship(move);
    default:
      return analyzeGeneric(move);
  }
}

function playerSteps(snapshot) {
  return snapshot.moves.filter((m) => m.actor === "you");
}

function introLine(snapshot, boardDock) {
  const n = playerSteps(snapshot).length;
  const name = snapshot.meta?.gameName || "Partida";
  if (!n) return `Revisei o ${name}, mas não encontrei lances seus nesta partida.`;
  const res = snapshot.result?.value;
  const boardHint = boardDock ? " Veja cada jogada destacada no tabuleiro acima." : "";
  if (["you", "w", "player", "1", "white"].includes(String(res ?? "").toLowerCase())) {
    return `Parabéns! Vamos rever seus ${n} lance(s) no ${name}.${boardHint}`;
  }
  if (String(res ?? "").toLowerCase() === "draw" || res === 0) {
    return `Empate apertado. Revise seus ${n} lance(s) no ${name}.${boardHint}`;
  }
  return `Vamos aprender juntos. Revise seus ${n} lance(s) no ${name} — dá para evoluir daqui.${boardHint}`;
}

/**
 * @param {HTMLElement} matchEl
 * @param {object} snapshot
 * @param {{ onClose: () => void, onStep?: (plyIndex: number|null, move: object|null) => void }} opts
 */
export function openMatchReview(matchEl, snapshot, { onClose, onStep } = {}) {
  const steps = playerSteps(snapshot);
  let stepIdx = 0;
  let closed = false;
  const boardDock = BOARD_REVIEW_GAMES.has(snapshot.gameId);

  const overlay = document.createElement("div");
  overlay.className = boardDock ? "tg-review-overlay tg-review-dock" : "tg-review-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="tg-review-card">
      <header class="tg-review-head">
        <div class="tg-review-bot">🤖 Coach da mesa</div>
        <button type="button" class="tg-review-close" aria-label="Fechar revisão">✕</button>
      </header>
      <p class="tg-review-intro" data-intro></p>
      <div class="tg-review-step" data-step-panel>
        <div class="tg-review-step-head">
          <span class="tg-review-step-num" data-step-num>—</span>
          <span class="tg-review-step-move" data-step-move>—</span>
        </div>
        <div class="tg-review-verdict" data-verdict>
          <span class="tg-review-verdict-emoji" data-v-emoji></span>
          <span class="tg-review-verdict-tag" data-v-tag></span>
        </div>
        <p class="tg-review-comment" data-comment></p>
      </div>
      <div class="tg-review-nav">
        <button type="button" class="tg-btn tg-btn-ghost" data-prev disabled>Anterior</button>
        <span class="tg-review-counter" data-counter>0 / 0</span>
        <button type="button" class="tg-btn tg-btn-ghost" data-next>Próximo</button>
      </div>
      <div class="tg-review-foot">
        <button type="button" class="tg-btn tg-btn-primary" data-speak>Ouvir dica</button>
        <button type="button" class="tg-btn tg-btn-ghost" data-close>Voltar</button>
      </div>
    </div>
  `;
  matchEl.appendChild(overlay);
  if (boardDock) {
    matchEl.classList.add("tg-review-active", `tg-review-game-${snapshot.gameId}`);
  }

  const introEl = overlay.querySelector("[data-intro]");
  const stepNum = overlay.querySelector("[data-step-num]");
  const stepMove = overlay.querySelector("[data-step-move]");
  const vEmoji = overlay.querySelector("[data-v-emoji]");
  const vTag = overlay.querySelector("[data-v-tag]");
  const verdictEl = overlay.querySelector("[data-verdict]");
  const commentEl = overlay.querySelector("[data-comment]");
  const counterEl = overlay.querySelector("[data-counter]");
  const prevBtn = overlay.querySelector("[data-prev]");
  const nextBtn = overlay.querySelector("[data-next]");
  const speakBtn = overlay.querySelector("[data-speak]");
  const closeBtn = overlay.querySelector("[data-close]");
  const xBtn = overlay.querySelector(".tg-review-close");
  const stepPanel = overlay.querySelector("[data-step-panel]");

  introEl.textContent = introLine(snapshot, boardDock);

  function paint() {
    if (!steps.length) {
      stepPanel.classList.add("empty");
      stepNum.textContent = "—";
      stepMove.textContent = "Sem lances seus gravados";
      commentEl.textContent = "Jogue uma partida completa para eu comentar lance a lance.";
      counterEl.textContent = "0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      onStep?.(null, null);
      return;
    }

    const move = steps[stepIdx];
    const ply = snapshot.moves.indexOf(move) + 1;
    const analysis = analyzePlayerMove(snapshot.gameId, move);

    stepNum.textContent = `Seu lance ${stepIdx + 1}`;
    stepMove.textContent = move.label || "—";
    vEmoji.textContent = analysis.emoji;
    vTag.textContent = analysis.tag;
    verdictEl.className = `tg-review-verdict tg-review-${analysis.cls}`;
    commentEl.textContent = analysis.comment;
    counterEl.textContent = `${stepIdx + 1} / ${steps.length}`;
    prevBtn.disabled = stepIdx <= 0;
    nextBtn.disabled = stepIdx >= steps.length - 1;

    onStep?.(ply, move);
    move._lastComment = analysis.comment;
  }

  function close() {
    if (closed) return;
    closed = true;
    onStep?.(null, null);
    matchEl.classList.remove("tg-review-active", `tg-review-game-${snapshot.gameId}`);
    overlay.remove();
    onClose?.();
  }

  prevBtn.addEventListener("click", () => {
    if (stepIdx > 0) {
      stepIdx -= 1;
      paint();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (stepIdx < steps.length - 1) {
      stepIdx += 1;
      paint();
    }
  });

  speakBtn.addEventListener("click", () => {
    const move = steps[stepIdx];
    if (!move?._lastComment) return;
    speakBotReact(move._lastComment, { rate: 1.02 });
  });

  closeBtn.addEventListener("click", close);
  xBtn.addEventListener("click", close);

  paint();
  return { close, paint };
}

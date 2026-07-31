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

function v(key, comment) {
  const m = VERDICT[key] || VERDICT.info;
  return { verdict: key, ...m, comment };
}

function evalGapComment(gap, bestLabel) {
  if (gap <= 25) return v("great", "Era a melhor opção — ou quase. Mandou bem!");
  if (gap <= 70) return v("good", `Jogada sólida. Se quiser afinar, ${bestLabel} era um tiquinho melhor.`);
  if (gap <= 160) return v("warn", `Deixou escapar um pouco de vantagem. Melhor era ${bestLabel}.`);
  return v("bad", `Aqui doeu! O bot teria preferido ${bestLabel}.`);
}

function analyzeChess(move) {
  const a = move.analysis;
  if (!a) return v("info", move.label || "Jogada registrada.");
  const gap = (a.evalBest ?? 0) - (a.evalPlayed ?? 0);
  if (move.capture) {
    const base = evalGapComment(gap, a.bestLabel || "outra casa");
    if (gap <= 70) base.comment = `Captura correta! ${base.comment}`;
    return base;
  }
  if (move.check) {
    const base = evalGapComment(gap, a.bestLabel || "outra casa");
    base.comment = `Xeque! ${base.comment}`;
    return base;
  }
  return evalGapComment(gap, a.bestLabel || "outra jogada");
}

function analyzeCheckers(move) {
  const a = move.analysis;
  if (!a) {
    if (move.capture) return v("good", "Captura — na dama isso costuma ser obrigatório e forte.");
    return v("info", move.label || "Jogada registrada.");
  }
  const gap = (a.evalBest ?? 0) - (a.evalPlayed ?? 0);
  if (move.capture && gap <= 60) return v("great", "Ótima captura! Você manteve a pressão.");
  return evalGapComment(gap, a.bestLabel || "outra casa");
}

function analyzeVelha(move) {
  if (move.winning) return v("great", "Jogada vencedora! Você fechou a sequência.");
  if (move.blocking) return v("good", "Defesa certeira — bloqueou a ameaça do bot.");
  if (move.cell === 4) return v("good", "Centro é ouro no jogo da velha. Boa escolha.");
  if ([0, 2, 6, 8].includes(move.cell)) return v("ok", "Canto — posição razoável, mas o centro manda mais.");
  return v("warn", "Casa de borda — o bot pode explorar melhor que isso.");
}

function analyzeLig4(move) {
  if (move.winning) return v("great", "Lance decisivo — montou ameaça de 4!");
  if (move.blocking) return v("good", "Bloqueou a linha do bot. Defesa essencial.");
  if (move.col === 3) return v("good", "Coluna central — clássico e forte no Lig 4.");
  if ([2, 4].includes(move.col)) return v("ok", "Coluna vizinha ao centro — jogada ok.");
  return v("warn", "Borda — dá menos opções. Centro costuma render mais.");
}

function analyzeTruco(move) {
  if (move.type === "truco") {
    return move.accepted === false
      ? v("good", "Correr com mão fraca pode ser sensato — você guardou pontos.")
      : v("ok", "Pediu truco! Só valia se a mão aguentava a pressão.");
  }
  if (move.type === "trick") {
    if (move.won) return v("great", "Venceu a vaza — carta no momento certo.");
    if (move.tie) return v("ok", "Empate na vaza — ok, segue o jogo.");
    return v("warn", "Perdeu a vaza — talvez outra carta segurava melhor.");
  }
  return v("info", move.label || "Carta jogada.");
}

function analyzeUno(move) {
  if (move.wild) return v("good", "Coringa na hora certa — controlou a cor.");
  if (move.special === "+2" || move.special === "+4") return v("great", "Ataque! Forçou o bot a comprar.");
  if (move.uno) return v("good", "UNO! Só faltava uma — pressão máxima.");
  return v("ok", move.label || "Carta jogada dentro da regra.");
}

function analyzeDomino(move) {
  if (move.blocked) return v("warn", "Passou vez — talvez faltou opção antes; boneyard ajuda.");
  if (move.endsBlocked) return v("great", "Travou uma ponta — boa tática!");
  return v("ok", move.label || "Pedra encaixada.");
}

function analyzeBattleship(move) {
  if (move.hit && move.sunk) return v("great", "Afundou um navio! Tiro certeiro.");
  if (move.hit) return v("good", "Acertou! Continue na mesma região.");
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

function introLine(snapshot) {
  const n = playerSteps(snapshot).length;
  const name = snapshot.meta?.gameName || "Partida";
  if (!n) return `Revisei o ${name}, mas não registrei lances seus nesta partida.`;
  const res = snapshot.result?.value;
  if (["you", "w", "player", "1", "white"].includes(String(res ?? "").toLowerCase())) {
    return `Parabéns! Vamos rever seus ${n} lance(s) no ${name} — veja o que funcionou.`;
  }
  if (String(res ?? "").toLowerCase() === "draw" || res === 0) {
    return `Empate apertado. Revise seus ${n} lance(s) no ${name}.`;
  }
  return `Vamos aprender. Revise seus ${n} lance(s) no ${name} — acho que aqui dá para evoluir.`;
}

/**
 * @param {HTMLElement} matchEl
 * @param {object} snapshot
 * @param {{ onClose: () => void, onStep?: (plyIndex: number, move: object|null) => void }} opts
 */
export function openMatchReview(matchEl, snapshot, { onClose, onStep } = {}) {
  const steps = playerSteps(snapshot);
  let stepIdx = 0;
  let closed = false;

  const overlay = document.createElement("div");
  overlay.className = "tg-review-overlay";
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

  introEl.textContent = introLine(snapshot);

  function paint() {
    if (!steps.length) {
      stepPanel.classList.add("empty");
      stepNum.textContent = "—";
      stepMove.textContent = "Sem lances seus gravados";
      commentEl.textContent = "Jogue uma partida completa para eu comentar lance a lance.";
      counterEl.textContent = "0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const move = steps[stepIdx];
    const ply = snapshot.moves.indexOf(move) + 1;
    const analysis = analyzePlayerMove(snapshot.gameId, move);

    stepNum.textContent = `Lance ${stepIdx + 1}`;
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
    speakBotReact(move._lastComment, { rate: 1.05 });
  });

  closeBtn.addEventListener("click", close);
  xBtn.addEventListener("click", close);

  paint();
  return { close, paint };
}

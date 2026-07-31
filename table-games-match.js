/**
 * Chrome da partida — timer, desistir/empate, chat + voz com o bot
 */

import { isSessionAdult } from "./player-account.js";
import { announceMatchEnd, speakBotReact } from "./table-games-audio.js";

function normalizeMatchOutcome(result) {
  const r = String(result ?? "").toLowerCase();
  if (!r || r === "draw" || r === "empate" || r === "0" || r === "d") {
    return { outcome: "draw", title: "Empate!", emoji: "🤝" };
  }
  if (["you", "w", "player", "1", "white"].includes(r)) {
    return { outcome: "win", title: "Você venceu!", emoji: "🏆" };
  }
  if (["bot", "b", "2", "dealer", "black"].includes(r)) {
    return { outcome: "lose", title: "O bot venceu.", emoji: "🤖" };
  }
  return { outcome: "draw", title: "Partida encerrada", emoji: "🏁" };
}

export const FIRST_MOVE_LIMIT_MS = 60_000;
export const MOVE_LIMIT_MS = 180_000;

const BOT_CHAT_REPLIES = [
  "Boa jogada!",
  "Deixa eu pensar um pouco…",
  "Interessante essa escolha.",
  "Vamos lá, continua!",
  "Tá ficando tenso!",
  "Ainda dá para virar — foco!",
  "Calma, o jogo não acabou.",
  "Mandou bem!",
  "Pode falar — estou ouvindo.",
  "Gostei da conversa. Agora é minha vez de pensar.",
  "Hehe, boa essa.",
  "Show! Vamos ver no tabuleiro.",
];

function formatMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function pickBotReply(playerText = "") {
  const t = playerText.toLowerCase();
  if (/oi|olá|ola|e a[ií]|fala|hey|hello/.test(t)) {
    return "E aí! Bora jogar — pode falar no mic ou escrever aqui no chat.";
  }
  if (/obrigad|valeu|thanks/.test(t)) return "Por nada! Bora focar no tabuleiro.";
  if (/ganhei|ganhar|win|gg/.test(t)) return "Calma, ainda não acabou… vamos ver!";
  if (/perdi|lose|aff|nossa|droga/.test(t)) return "Relaxa, ainda dá tempo de virar o jogo.";
  if (/ajuda|dica|help/.test(t)) {
    return "Dica rápida: respira, olha o tabuleiro inteiro e pensa na melhor casa antes de clicar.";
  }
  if (/burro|lixo|idiota|ot[aá]rio|merda|porra/.test(t)) {
    return "Ei, respeito na mesa. Vamos jogar limpo.";
  }
  if (/voz|mic|microfone|ouvindo/.test(t)) {
    return "Estou no modo voz + texto. Se a fala falhar, eu respondo por escrito aqui.";
  }
  if (/xadrez|dama|velha|truco|uno/.test(t)) {
    return "Boa! Foca na partida — estou acompanhando.";
  }
  return BOT_CHAT_REPLIES[Math.floor(Math.random() * BOT_CHAT_REPLIES.length)];
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speakBotLine(text) {
  return speakBotReact(text, { rate: 1.14 });
}

function stopBotSpeech() {
  try {
    speechSynthesis?.cancel?.();
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement} matchEl — .tg-match
 * @param {{ onResign: () => void, onOfferDraw: () => void, onTimeout: (kind: 'first'|'move') => void }} handlers
 */
export function mountMatchChrome(matchEl, handlers = {}) {
  let destroyed = false;
  let clockRaf = 0;
  let deadline = 0;
  let running = false;
  let clockKind = "move";
  let drawPending = false;
  let chatOpen = false;
  let unread = 0;
  let micOn = false;
  let recognition = null;
  let recognizing = false;
  let botSpeaking = false;
  let restartTimer = 0;
  let lastHeard = "";
  let lastHeardAt = 0;
  const voiceSupported = !!getSpeechRecognition();

  const chrome = document.createElement("div");
  chrome.className = "tg-match-chrome";
  chrome.innerHTML = `
    <div class="tg-match-bar">
      <div class="tg-match-clock" data-clock title="Tempo da jogada">
        <span class="tg-clock-label">Tempo</span>
        <span class="tg-clock-value" data-clock-val>1:00</span>
      </div>
      <button type="button" class="tg-match-menu-toggle" data-menu-toggle aria-expanded="false" aria-label="Menu da partida">☰</button>
    </div>
    <div class="tg-match-actions-row" data-actions-row>
      <div class="tg-match-actions">
        <button type="button" class="tg-match-action tg-action-resign" data-resign title="Desistir" aria-label="Desistir">
          🏳 <span class="tg-action-label">Desistir</span>
        </button>
        <button type="button" class="tg-match-action tg-action-draw" data-draw title="Pedir empate" aria-label="Empate">
          🤝 <span class="tg-action-label">Empate</span>
        </button>
        <button type="button" class="tg-match-action tg-action-mic" data-mic-toggle title="Falar com o bot (microfone)" aria-pressed="false" aria-label="Microfone">
          🎙 <span class="tg-action-label" data-mic-label>Mic</span>
        </button>
        <button type="button" class="tg-match-action tg-action-chat" data-chat-toggle title="Abrir/fechar chat" aria-expanded="false" aria-label="Chat">
          💬 <span class="tg-action-label">Chat</span>
          <span class="tg-chat-badge hidden" data-chat-badge aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="tg-chat hidden" data-chat>
      <div class="tg-chat-head">
        <span>Chat da mesa</span>
        <span class="tg-voice-status" data-voice-status></span>
        <button type="button" class="tg-chat-close" data-chat-close title="Fechar chat" aria-label="Fechar chat">✕</button>
      </div>
      <div class="tg-chat-log" data-chat-log aria-live="polite"></div>
      <p class="tg-voice-hint" data-voice-hint>Liga o Mic e fala. O bot responde em voz + texto. Se falhar, escreve abaixo.</p>
      <form class="tg-chat-form" data-chat-form>
        <input type="text" class="tg-chat-input" data-chat-input maxlength="120" placeholder="Escreva…" autocomplete="off" />
        <button type="submit" class="tg-btn tg-chat-send">Enviar</button>
      </form>
    </div>
    <div class="tg-result-overlay hidden" data-result-overlay aria-live="assertive" role="alertdialog" aria-modal="true">
      <div class="tg-result-card">
        <div class="tg-result-emoji" data-result-emoji>🏆</div>
        <div class="tg-result-title" data-result-title>Partida encerrada</div>
        <div class="tg-result-desc" data-result-desc></div>
        <div class="tg-result-actions">
          <button type="button" class="tg-btn tg-btn-review hidden" data-result-review>Revisar partida</button>
          <button type="button" class="tg-btn tg-btn-ghost" data-result-lobby>Voltar ao lobby</button>
          <button type="button" class="tg-btn tg-btn-primary" data-result-again>Jogar de novo</button>
        </div>
      </div>
    </div>
  `;

  matchEl.prepend(chrome);

  const clockEl = chrome.querySelector("[data-clock]");
  const clockVal = chrome.querySelector("[data-clock-val]");
  const resignBtn = chrome.querySelector("[data-resign]");
  const drawBtn = chrome.querySelector("[data-draw]");
  const micBtn = chrome.querySelector("[data-mic-toggle]");
  const chatToggle = chrome.querySelector("[data-chat-toggle]");
  const chatBadge = chrome.querySelector("[data-chat-badge]");
  const chat = chrome.querySelector("[data-chat]");
  const logEl = chrome.querySelector("[data-chat-log]");
  const form = chrome.querySelector("[data-chat-form]");
  const input = chrome.querySelector("[data-chat-input]");
  const chatClose = chrome.querySelector("[data-chat-close]");
  const voiceStatus = chrome.querySelector("[data-voice-status]");
  const voiceHint = chrome.querySelector("[data-voice-hint]");
  const menuToggle = chrome.querySelector("[data-menu-toggle]");
  const resultOverlay = chrome.querySelector("[data-result-overlay]");
  const resultEmoji = chrome.querySelector("[data-result-emoji]");
  const resultTitle = chrome.querySelector("[data-result-title]");
  const resultDesc = chrome.querySelector("[data-result-desc]");
  const resultAgain = chrome.querySelector("[data-result-again]");
  const resultLobby = chrome.querySelector("[data-result-lobby]");
  const resultReview = chrome.querySelector("[data-result-review]");
  let resultShown = false;
  let reviewSnapshot = null;
  let reviewOpen = null;

  function hideMatchResult() {
    resultShown = false;
    resultOverlay?.classList.add("hidden");
  }

  function showMatchResult(result, reason = "", snapshot = null) {
    if (destroyed || resultShown) return;
    resultShown = true;
    reviewSnapshot = snapshot;
    endPlayerClock();
    setActionsEnabled(false);
    setMenuOpen(false);

    const { outcome, title, emoji } = normalizeMatchOutcome(result);
    const detail = String(reason || "").trim();
    const speech =
      detail ||
      (outcome === "win" ? "Você venceu!" : outcome === "lose" ? "O bot venceu." : "Empate!");

    if (resultEmoji) resultEmoji.textContent = emoji;
    if (resultTitle) resultTitle.textContent = title;
    if (resultDesc) {
      const subtitle =
        detail && detail !== title
          ? detail
          : outcome === "win"
            ? "Parabéns — você levou a mesa!"
            : outcome === "lose"
              ? "Não foi dessa vez. Revise seus lances para melhorar."
              : "Ninguém levou vantagem — partida equilibrada.";
      resultDesc.textContent = subtitle;
      resultDesc.classList.remove("hidden");
    }

    const canReview = snapshot?.moves?.some((m) => m.actor === "you");
    resultReview?.classList.toggle("hidden", !canReview);

    resultOverlay?.classList.remove("hidden");
    resultOverlay?.setAttribute("data-outcome", outcome);
    pushChat("Mesa", speech, "system", { countUnread: false });
    announceMatchEnd(outcome, speech);
    (canReview ? resultReview : resultAgain)?.focus?.();
  }

  resultReview?.addEventListener("click", () => {
    if (!reviewSnapshot?.moves?.length) return;
    resultOverlay?.classList.add("hidden");
    reviewOpen = handlers.onReview?.(reviewSnapshot, {
      onClose: () => {
        reviewOpen = null;
        if (!destroyed && resultShown) resultOverlay?.classList.remove("hidden");
      },
      onStep: (ply, move) => handlers.onReviewStep?.(ply, move),
    }) || null;
  });

  resultAgain?.addEventListener("click", () => {
    hideMatchResult();
    handlers.onPlayAgain?.();
  });

  resultLobby?.addEventListener("click", () => {
    hideMatchResult();
    handlers.onBackToLobby?.();
  });

  function isMobileMatch() {
    return window.matchMedia("(max-width: 768px), (max-height: 640px)").matches;
  }

  function syncMobileLayout() {
    matchEl.classList.toggle("tg-match-mobile", isMobileMatch());
    if (!isMobileMatch()) setMenuOpen(false);
  }

  function setMenuOpen(open) {
    chrome.classList.toggle("menu-open", open);
    menuToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  syncMobileLayout();
  window.addEventListener("resize", syncMobileLayout);

  menuToggle?.addEventListener("click", () => {
    setMenuOpen(!chrome.classList.contains("menu-open"));
  });

  function setVoiceStatus(text) {
    if (voiceStatus) voiceStatus.textContent = text || "";
  }

  function updateMicUi() {
    micBtn.classList.toggle("active", micOn);
    micBtn.classList.toggle("tg-mic-live", micOn);
    micBtn.setAttribute("aria-pressed", micOn ? "true" : "false");
    const micLabel = micBtn.querySelector("[data-mic-label]");
    if (micLabel) {
      micLabel.textContent = micOn ? "Ouvindo…" : "Mic";
    } else {
      micBtn.textContent = micOn ? "🎙 Ouvindo…" : "🎙 Mic";
    }
    micBtn.setAttribute("aria-label", micOn ? "Microfone ligado" : "Microfone");
    if (!voiceSupported) {
      setVoiceStatus("Sem reconhecimento neste navegador");
      micBtn.disabled = true;
      micBtn.title = "Seu navegador não suporte fala→texto. Use o chat escrito.";
    } else if (micOn) {
      setVoiceStatus(botSpeaking ? "Bot falando…" : "Mic ligado — pode falar");
    } else {
      setVoiceStatus("");
    }
  }

  function clearRestartTimer() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = 0;
    }
  }

  function stopRecognition() {
    clearRestartTimer();
    recognizing = false;
    if (!recognition) return;
    const rec = recognition;
    recognition = null;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      rec.stop();
    } catch {
      try {
        rec.abort?.();
      } catch {
        /* ignore */
      }
    }
  }

  function stopVoice() {
    micOn = false;
    stopRecognition();
    updateMicUi();
  }

  function scheduleRecognitionRestart(delay = 280) {
    clearRestartTimer();
    if (!micOn || destroyed || botSpeaking) return;
    restartTimer = window.setTimeout(() => {
      restartTimer = 0;
      startRecognitionSession();
    }, delay);
  }

  function startRecognitionSession() {
    if (destroyed || !micOn || botSpeaking || recognizing) return;
    const SR = getSpeechRecognition();
    if (!SR) return;

    stopRecognition();
    recognition = new SR();
    recognition.lang = "pt-BR";
    // continuous=false é bem mais estável no Chrome
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognizing = true;
      if (micOn && !botSpeaking) setVoiceStatus("Mic ligado — pode falar");
    };

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const say = (res[0]?.transcript || "").trim();
        if (!say) continue;
        if (res.isFinal) finalChunk += (finalChunk ? " " : "") + say;
        else interim += (interim ? " " : "") + say;
      }
      if (interim) setVoiceStatus(`Ouvindo: ${interim.slice(0, 40)}…`);
      if (finalChunk) {
        const now = Date.now();
        const norm = finalChunk.toLowerCase();
        if (norm === lastHeard && now - lastHeardAt < 2500) return;
        lastHeard = norm;
        lastHeardAt = now;
        setVoiceStatus("Enviando…");
        handlePlayerUtterance(finalChunk);
      }
    };

    recognition.onerror = (ev) => {
      recognizing = false;
      if (destroyed || !micOn) return;
      const err = ev?.error || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        pushChat(
          "Mesa",
          "Microfone ou reconhecimento bloqueado. Libera o mic nas permissões do site e tenta de novo — ou escreve no chat.",
          "system"
        );
        stopVoice();
        setChatOpen(true);
        return;
      }
      if (err === "network") {
        setVoiceStatus("Sem rede pro reconhecimento");
        pushChat(
          "Mesa",
          "Reconhecimento de voz precisa de internet (serviço do navegador). Escreve no chat por enquanto.",
          "system"
        );
        scheduleRecognitionRestart(1200);
        return;
      }
      if (err === "no-speech" || err === "aborted" || err === "audio-capture") {
        scheduleRecognitionRestart(err === "audio-capture" ? 600 : 200);
        return;
      }
      setVoiceStatus(`Erro de voz: ${err}`);
      scheduleRecognitionRestart(700);
    };

    recognition.onend = () => {
      recognizing = false;
      if (destroyed || !micOn || botSpeaking) return;
      scheduleRecognitionRestart(220);
    };

    try {
      recognition.start();
    } catch {
      recognizing = false;
      scheduleRecognitionRestart(400);
    }
  }

  async function botRespond(playerText) {
    const reply = pickBotReply(playerText);
    botSpeaking = true;
    stopRecognition();
    updateMicUi();

    pushChat("Bot", reply, "bot");
    const spokePromise = speakBotLine(reply);
    setVoiceStatus("Bot falando…");
    const spoke = await spokePromise;
    if (!spoke) setVoiceStatus("Bot em texto (TTS falhou)");

    botSpeaking = false;
    if (micOn && !destroyed) {
      updateMicUi();
      scheduleRecognitionRestart(120);
    } else {
      updateMicUi();
    }
  }

  function handlePlayerUtterance(text) {
    const clean = (text || "").trim();
    if (!clean || destroyed) return;
    pushChat("Você", clean, "player");
    setTimeout(() => {
      if (!destroyed) botRespond(clean);
    }, 60);
  }

  async function startVoice() {
    if (destroyed || micOn) return;

    if (!isSessionAdult()) {
      alert("Chat de voz na mesa é só pra maiores de 18 anos.");
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) {
      pushChat(
        "Mesa",
        "Este navegador não transcreve fala (falta SpeechRecognition). No desktop, Chrome ou Edge funcionam melhor. Por enquanto use o texto.",
        "system"
      );
      setChatOpen(true);
      updateMicUi();
      return;
    }

    // Importante: NÃO abrir getUserMedia em paralelo.
    // Segurar o stream trava o SpeechRecognition no Chrome.
    micOn = true;
    updateMicUi();
    setChatOpen(true);
    pushChat("Mesa", "Mic ligado. Fala naturalmente — eu mando pro bot quando você pausar.", "system", {
      countUnread: false,
    });
    startRecognitionSession();
  }

  async function toggleMic() {
    if (micOn) {
      stopVoice();
      pushChat("Mesa", "Mic desligado.", "system", { countUnread: false });
      return;
    }
    await startVoice();
  }

  function updateBadge() {
    const show = !chatOpen && unread > 0;
    chatBadge.classList.toggle("hidden", !show);
    chatBadge.textContent = show ? (unread > 9 ? "9+" : String(unread)) : "";
    chatToggle.classList.toggle("has-unread", show);
  }

  function setChatOpen(open) {
    chatOpen = open;
    chat.classList.toggle("hidden", !open);
    chatToggle.setAttribute("aria-expanded", open ? "true" : "false");
    chatToggle.classList.toggle("active", open);
    if (open) {
      setMenuOpen(false);
      unread = 0;
      updateBadge();
      logEl.scrollTop = logEl.scrollHeight;
      if (!micOn) input.focus();
    }
  }

  function pushChat(who, text, kind = "", opts = {}) {
    if (destroyed || !text) return;
    const row = document.createElement("div");
    row.className = `tg-chat-row ${kind || who}`;
    row.innerHTML = `<span class="tg-chat-who">${who}</span><span class="tg-chat-msg"></span>`;
    row.querySelector(".tg-chat-msg").textContent = text;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;

    const countUnread = opts.countUnread !== false;
    if (!chatOpen && countUnread && kind !== "player") {
      unread += 1;
      updateBadge();
    }
  }

  function setActionsEnabled(on) {
    resignBtn.disabled = !on;
    drawBtn.disabled = !on || drawPending;
  }

  function paintClock(msLeft) {
    clockVal.textContent = formatMs(msLeft);
    clockEl.classList.toggle("urgent", msLeft <= 15_000);
    clockEl.classList.toggle("critical", msLeft <= 5_000);
    clockEl.dataset.kind = clockKind;
  }

  function tick() {
    if (!running || destroyed) return;
    const left = deadline - performance.now();
    paintClock(left);
    if (left <= 0) {
      running = false;
      const kind = clockKind;
      pushChat(
        "Mesa",
        kind === "first"
          ? "Tempo esgotado no 1º lance — derrota."
          : "Jogador offline (3 min sem jogar) — derrota.",
        "system"
      );
      handlers.onTimeout?.(kind);
      return;
    }
    clockRaf = requestAnimationFrame(tick);
  }

  function stopClock() {
    running = false;
    if (clockRaf) cancelAnimationFrame(clockRaf);
    clockRaf = 0;
  }

  function startPlayerClock(isFirstMove) {
    if (destroyed) return;
    stopClock();
    clockKind = isFirstMove ? "first" : "move";
    const limit = isFirstMove ? FIRST_MOVE_LIMIT_MS : MOVE_LIMIT_MS;
    deadline = performance.now() + limit;
    running = true;
    paintClock(limit);
    clockEl.classList.add("active");
    clockRaf = requestAnimationFrame(tick);
  }

  function endPlayerClock() {
    stopClock();
    clockEl.classList.remove("active", "urgent", "critical");
  }

  resignBtn.addEventListener("click", () => {
    if (resignBtn.disabled) return;
    pushChat("Você", "Desisti da partida.", "player");
    handlers.onResign?.();
  });

  drawBtn.addEventListener("click", () => {
    if (drawBtn.disabled || drawPending) return;
    drawPending = true;
    drawBtn.disabled = true;
    drawBtn.textContent = "Empate…";
    pushChat("Você", "Ofereceu empate.", "player");
    handlers.onOfferDraw?.();
  });

  micBtn.addEventListener("click", () => {
    toggleMic();
  });

  chatToggle.addEventListener("click", () => setChatOpen(!chatOpen));
  chatClose.addEventListener("click", () => setChatOpen(false));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    handlePlayerUtterance(text);
  });

  try {
    speechSynthesis?.getVoices?.();
    speechSynthesis?.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
  } catch {
    /* ignore */
  }

  if (!voiceSupported) {
    voiceHint.textContent =
      "Este navegador não tem fala→texto. Use Chrome/Edge no PC, ou escreva no chat.";
  }

  pushChat("Mesa", "Partida iniciada! 1º lance: 1 minuto · depois: 3 minutos. Use o Mic para falar com o bot.", "system", {
    countUnread: false,
  });
  setChatOpen(false);
  updateMicUi();

  return {
    startPlayerClock,
    endPlayerClock,
    stopClock,
    pushChat,
    setActionsEnabled,
    resetDrawOffer() {
      drawPending = false;
      drawBtn.disabled = false;
      drawBtn.textContent = "🤝 Empate";
    },
    markDrawResolved(accepted) {
      drawPending = false;
      drawBtn.disabled = accepted;
      drawBtn.textContent = accepted ? "Empate" : "🤝 Empate";
      if (!accepted) drawBtn.disabled = false;
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("resize", syncMobileLayout);
      stopVoice();
      stopBotSpeech();
      stopClock();
      hideMatchResult();
      reviewOpen?.close?.();
      reviewOpen = null;
      chrome.remove();
    },
    showMatchResult,
    hideMatchResult,
  };
}

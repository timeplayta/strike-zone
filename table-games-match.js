/**
 * Chrome da partida — timer, desistir/empate, chat + voz com o bot
 */

import { isSessionAdult } from "./player-account.js";

export const FIRST_MOVE_LIMIT_MS = 60_000;
export const MOVE_LIMIT_MS = 180_000;

const BOT_CHAT_REPLIES = [
  "Boa.",
  "Hmm… deixa eu pensar.",
  "Interessante.",
  "Ok, vamos nessa.",
  "Pressão!",
  "gg se continuar assim.",
  "Calma, ainda tem jogo.",
  "Mandou bem.",
  "Tô ouvindo. Joga com calma.",
  "Pode falar — eu respondo por aqui.",
  "Boa conversa. Agora é minha vez de pensar.",
  "Heh, gostei dessa.",
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
    return "E aí! Bora jogar — pode falar no mic ou escrever.";
  }
  if (/obrigad|valeu|thanks/.test(t)) return "Por nada! Foco no tabuleiro.";
  if (/ganhei|ganhar|win|gg/.test(t)) return "Ainda não acabou… pressão!";
  if (/perdi|lose|aff|nossa/.test(t)) return "Calma, ainda tem jogo.";
  if (/ajuda|dica|help/.test(t)) return "Dica de bot: respira e olha o centro do tabuleiro.";
  if (/burro|lixo|idiota|ot[aá]rio|merda|porra/.test(t)) {
    return "Ei, respeito na mesa. Joga limpo.";
  }
  if (/voz|mic|microfone|ouvindo/.test(t)) {
    return "Tô no modo voz+texto. Se a fala falhar, eu escrevo aqui.";
  }
  return BOT_CHAT_REPLIES[Math.floor(Math.random() * BOT_CHAT_REPLIES.length)];
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speakBotLine(text) {
  try {
    if (typeof speechSynthesis === "undefined") return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1.02;
    u.pitch = 1.05;
    u.volume = 0.92;
    const voices = speechSynthesis.getVoices?.() || [];
    const pt = voices.find((v) => /pt(-|_)?BR/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
    if (pt) u.voice = pt;
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
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
  let micStream = null;
  let recognition = null;
  let voiceSupported = !!getSpeechRecognition();

  const chrome = document.createElement("div");
  chrome.className = "tg-match-chrome";
  chrome.innerHTML = `
    <div class="tg-match-bar">
      <div class="tg-match-clock" data-clock title="Tempo da jogada">
        <span class="tg-clock-label">Tempo</span>
        <span class="tg-clock-value" data-clock-val>1:00</span>
      </div>
      <div class="tg-match-actions">
        <button type="button" class="tg-match-action tg-action-resign" data-resign title="Desistir">🏳 Desistir</button>
        <button type="button" class="tg-match-action tg-action-draw" data-draw title="Pedir empate">🤝 Empate</button>
        <button type="button" class="tg-match-action tg-action-mic" data-mic-toggle title="Falar com o bot (microfone)" aria-pressed="false">
          🎙 Mic
        </button>
        <button type="button" class="tg-match-action tg-action-chat" data-chat-toggle title="Abrir/fechar chat" aria-expanded="false">
          💬 Chat
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
      <p class="tg-voice-hint" data-voice-hint>Liga o Mic pra falar com o bot. Se a voz falhar, escreve aqui.</p>
      <form class="tg-chat-form" data-chat-form>
        <input type="text" class="tg-chat-input" data-chat-input maxlength="120" placeholder="Escreva…" autocomplete="off" />
        <button type="submit" class="tg-btn tg-chat-send">Enviar</button>
      </form>
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

  function setVoiceStatus(text) {
    if (voiceStatus) voiceStatus.textContent = text || "";
  }

  function updateMicUi() {
    micBtn.classList.toggle("active", micOn);
    micBtn.classList.toggle("tg-mic-live", micOn);
    micBtn.setAttribute("aria-pressed", micOn ? "true" : "false");
    micBtn.textContent = micOn ? "🎙 Ouvindo…" : "🎙 Mic";
    if (!voiceSupported) {
      setVoiceStatus("Voz do jogador: só texto neste navegador");
    } else if (micOn) {
      setVoiceStatus("Mic ligado — fala com o bot");
    } else {
      setVoiceStatus("");
    }
  }

  function stopMicTracks() {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
  }

  function stopRecognition() {
    if (!recognition) return;
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    } catch {
      /* ignore */
    }
    recognition = null;
  }

  function stopVoice() {
    micOn = false;
    stopRecognition();
    stopMicTracks();
    updateMicUi();
  }

  function botRespond(playerText) {
    const reply = pickBotReply(playerText);
    const spoke = speakBotLine(reply);
    pushChat("Bot", spoke ? reply : `${reply} (só texto — voz indisponível)`, "bot");
  }

  function handlePlayerUtterance(text) {
    const clean = (text || "").trim();
    if (!clean || destroyed) return;
    pushChat("Você", clean, "player");
    setTimeout(() => {
      if (!destroyed) botRespond(clean);
    }, 400 + Math.random() * 500);
  }

  async function startVoice() {
    if (destroyed || micOn) return;

    if (!isSessionAdult()) {
      alert("Chat de voz na mesa é só pra maiores de 18 anos.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      pushChat("Mesa", "Microfone indisponível neste dispositivo. Usa o chat de texto.", "system");
      setChatOpen(true);
      return;
    }

    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch {
      pushChat("Mesa", "Permissão de microfone negada. Pode escrever no chat.", "system");
      setChatOpen(true);
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) {
      micOn = true;
      voiceSupported = false;
      updateMicUi();
      setChatOpen(true);
      pushChat(
        "Mesa",
        "Mic ligado, mas este navegador não transcreve fala. O áudio fica local — escreve pro bot responder. Chrome/Edge costumam funcionar melhor.",
        "system"
      );
      return;
    }

    recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let interimBuf = "";

    recognition.onresult = (event) => {
      let finalChunk = "";
      interimBuf = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const say = res[0]?.transcript || "";
        if (res.isFinal) finalChunk += say;
        else interimBuf += say;
      }
      if (interimBuf) setVoiceStatus(`Ouvindo: ${interimBuf.trim().slice(0, 42)}…`);
      if (finalChunk.trim()) {
        setVoiceStatus("Mic ligado — fala com o bot");
        handlePlayerUtterance(finalChunk);
      }
    };

    recognition.onerror = (ev) => {
      if (destroyed || !micOn) return;
      const err = ev?.error || "";
      if (err === "not-allowed") {
        pushChat("Mesa", "Microfone bloqueado. Usa o texto.", "system");
        stopVoice();
        setChatOpen(true);
        return;
      }
      if (err === "no-speech" || err === "aborted") return;
      setVoiceStatus("Voz falhou — pode escrever");
    };

    recognition.onend = () => {
      if (destroyed || !micOn) return;
      // Reinicia enquanto o mic estiver ligado
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    };

    try {
      recognition.start();
    } catch {
      pushChat("Mesa", "Não deu pra iniciar reconhecimento de voz. Usa o texto.", "system");
      stopVoice();
      setChatOpen(true);
      return;
    }

    micOn = true;
    voiceSupported = true;
    updateMicUi();
    setChatOpen(true);
    pushChat("Mesa", "Mic ligado. Fala com o bot — ele responde em voz e texto.", "system", {
      countUnread: false,
    });
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

  // Preload voices (Chrome)
  try {
    speechSynthesis?.getVoices?.();
    speechSynthesis?.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
  } catch {
    /* ignore */
  }

  if (!voiceSupported) {
    voiceHint.textContent =
      "Este navegador pode não transcrever voz. O Mic ainda pede permissão; use o texto se precisar.";
  }

  pushChat("Mesa", "Partida iniciada. 1º lance: 1 min · demais: 3 min. Mic = falar com o bot.", "system", {
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
      stopVoice();
      stopBotSpeech();
      stopClock();
      chrome.remove();
    },
  };
}

/**
 * Chrome da partida — timer, desistir/empate (canto da engrenagem) e chat
 */

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
];

function formatMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
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
  let clockKind = "move"; // 'first' | 'move'
  let drawPending = false;

  const bar = document.createElement("div");
  bar.className = "tg-match-bar";
  bar.innerHTML = `
    <div class="tg-match-clock" data-clock title="Tempo da jogada">
      <span class="tg-clock-label">Tempo</span>
      <span class="tg-clock-value" data-clock-val>1:00</span>
    </div>
    <div class="tg-match-actions">
      <button type="button" class="tg-match-action tg-action-resign" data-resign title="Desistir">🏳 Desistir</button>
      <button type="button" class="tg-match-action tg-action-draw" data-draw title="Pedir empate">🤝 Empate</button>
    </div>
  `;

  const chat = document.createElement("div");
  chat.className = "tg-chat";
  chat.innerHTML = `
    <div class="tg-chat-log" data-chat-log aria-live="polite"></div>
    <form class="tg-chat-form" data-chat-form>
      <input type="text" class="tg-chat-input" data-chat-input maxlength="120" placeholder="Chat da mesa…" autocomplete="off" />
      <button type="submit" class="tg-btn tg-chat-send">Enviar</button>
    </form>
  `;

  matchEl.prepend(bar);
  matchEl.appendChild(chat);

  const clockEl = bar.querySelector("[data-clock]");
  const clockVal = bar.querySelector("[data-clock-val]");
  const resignBtn = bar.querySelector("[data-resign]");
  const drawBtn = bar.querySelector("[data-draw]");
  const logEl = chat.querySelector("[data-chat-log]");
  const form = chat.querySelector("[data-chat-form]");
  const input = chat.querySelector("[data-chat-input]");

  function pushChat(who, text, kind = "") {
    if (destroyed || !text) return;
    const row = document.createElement("div");
    row.className = `tg-chat-row ${kind || who}`;
    row.innerHTML = `<span class="tg-chat-who">${who}</span><span class="tg-chat-msg"></span>`;
    row.querySelector(".tg-chat-msg").textContent = text;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
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
      pushChat("Mesa", kind === "first"
        ? "Tempo esgotado no 1º lance — derrota."
        : "Jogador offline (3 min sem jogar) — derrota.", "system");
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    pushChat("Você", text, "player");
    const reply = BOT_CHAT_REPLIES[Math.floor(Math.random() * BOT_CHAT_REPLIES.length)];
    setTimeout(() => {
      if (!destroyed) pushChat("Bot", reply, "bot");
    }, 450 + Math.random() * 700);
  });

  pushChat("Mesa", "Partida iniciada. 1º lance: 1 min · demais: 3 min.", "system");

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
      stopClock();
      bar.remove();
      chat.remove();
    },
  };
}

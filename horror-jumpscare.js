/** Jumpscares — overlay + sons altos (sintéticos) */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playHorrorScream(kind = "death") {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const volume = kind === "death" ? 0.95 : 0.75;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.4);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(kind === "death" ? 180 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.4);

    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(kind === "death" ? 0.7 : 0.5, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.6);
  } catch { /* opcional */ }
}

const FACE_STYLES = {
  death: { bg: "radial-gradient(circle,#ff2200 0%,#1a0000 55%,#000 100%)", emoji: "💀", scale: 1.15 },
  devorador: { bg: "radial-gradient(circle,#440000 0%,#0a0000 70%)", emoji: "🩸", scale: 1.2 },
  observador: { bg: "radial-gradient(circle,#223344 0%,#000 65%)", emoji: "👁", scale: 1.25 },
  vazio: { bg: "radial-gradient(circle,#111 0%,#000 80%)", emoji: "🕳", scale: 1.3 },
};

export function showJumpscareOverlay(opts = {}) {
  const el = document.getElementById("jumpscareOverlay");
  const face = document.getElementById("jumpscareFace");
  const nameEl = document.getElementById("jumpscareName");
  if (!el || !face) return Promise.resolve();

  const style = FACE_STYLES[opts.style] || FACE_STYLES.death;
  const duration = opts.duration ?? 1200;

  el.style.background = style.bg;
  face.textContent = opts.emoji || style.emoji;
  face.style.transform = `scale(${style.scale})`;
  if (nameEl) {
    nameEl.textContent = opts.name || "";
    if (opts.name) nameEl.classList.remove("hidden");
    else nameEl.classList.add("hidden");
  }

  el.classList.remove("hidden");
  el.classList.add("active");
  document.body.classList.add("jumpscare-active");

  playHorrorScream(opts.sound || opts.style === "death" ? "death" : "monster");

  return new Promise((resolve) => {
    setTimeout(() => {
      el.classList.add("hidden");
      el.classList.remove("active");
      document.body.classList.remove("jumpscare-active");
      resolve();
    }, duration);
  });
}

/** Sons sintéticos imersivos para jogos de mesa (Web Audio API) */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, dur, type = "sine", vol = 0.12, delay = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* áudio opcional */
  }
}

function noiseBurst(dur, vol, lowpass = 1800) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.22));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export function unlockTableAudio() {
  try {
    getCtx();
  } catch {
    /* ignore */
  }
}

/** Peça de madeira batendo no tabuleiro */
export function playPiecePlace(heavy = false) {
  noiseBurst(heavy ? 0.08 : 0.05, heavy ? 0.22 : 0.14, heavy ? 900 : 1400);
  tone(heavy ? 180 : 240, 0.06, "triangle", heavy ? 0.08 : 0.05);
}

/** Captura / captura em dama */
export function playCapture() {
  noiseBurst(0.1, 0.2, 1200);
  tone(320, 0.08, "square", 0.06);
  tone(160, 0.12, "triangle", 0.08, 0.04);
}

/** Movimento inválido */
export function playIllegal() {
  tone(140, 0.12, "sawtooth", 0.05);
  tone(110, 0.1, "sawtooth", 0.04, 0.06);
}

/** Xeque */
export function playCheck() {
  tone(520, 0.08, "sine", 0.07);
  tone(660, 0.1, "sine", 0.08, 0.07);
  tone(880, 0.14, "triangle", 0.06, 0.14);
}

/** Vitória / derrota */
export function playWin() {
  [392, 494, 587, 784].forEach((f, i) => tone(f, 0.18, "triangle", 0.09, i * 0.1));
}

export function playLose() {
  [330, 277, 220, 165].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.12));
}

/** Ambiente de salão — loop leve */
let ambienceNodes = null;

export function startTableAmbience(kind = "salon") {
  stopTableAmbience();
  try {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = kind === "pool" ? 0.035 : 0.028;
    master.connect(ctx.destination);

    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = kind === "pool" ? 55 : 72;
    const humG = ctx.createGain();
    humG.gain.value = 0.55;
    hum.connect(humG);
    humG.connect(master);
    hum.start();

    const n = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = kind === "pool" ? 400 : 900;
    nf.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(master);
    noise.start();

    ambienceNodes = { master, hum, noise };
  } catch {
    ambienceNodes = null;
  }
}

export function stopTableAmbience() {
  if (!ambienceNodes) return;
  try {
    ambienceNodes.hum.stop();
    ambienceNodes.noise.stop();
    ambienceNodes.master.disconnect();
  } catch {
    /* ignore */
  }
  ambienceNodes = null;
}

/** Tacada / bola batendo */
export function playCueStrike(power = 0.5) {
  const p = Math.max(0.15, Math.min(1, power));
  noiseBurst(0.06 + p * 0.06, 0.18 + p * 0.25, 2200);
  tone(90 + p * 40, 0.08, "triangle", 0.1 * p);
}

export function playBallHit(intensity = 0.5) {
  const i = Math.max(0.1, Math.min(1, intensity));
  noiseBurst(0.04 + i * 0.04, 0.1 + i * 0.18, 2800);
  tone(400 + i * 200, 0.04, "sine", 0.04 * i);
}

export function playCushion() {
  noiseBurst(0.05, 0.12, 1600);
  tone(220, 0.05, "triangle", 0.05);
}

export function playPocket() {
  noiseBurst(0.12, 0.2, 800);
  tone(180, 0.1, "sine", 0.07);
  tone(120, 0.16, "triangle", 0.06, 0.05);
}

export function playBotThink() {
  tone(260, 0.05, "sine", 0.03);
}

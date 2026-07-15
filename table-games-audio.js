/** Sons + falas sintéticas para jogos de mesa */

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
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices?.();
  } catch {
    /* ignore */
  }
}

export function speakLine(text, opts = {}) {
  return new Promise((resolve) => {
    try {
      if (typeof speechSynthesis === "undefined") {
        resolve(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = opts.lang || "pt-BR";
      u.rate = opts.rate ?? 1.05;
      u.pitch = opts.pitch ?? 1.08;
      u.volume = opts.volume ?? 0.95;
      const voices = speechSynthesis.getVoices?.() || [];
      const pt =
        voices.find((v) => /pt(-|_)?BR/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
      if (pt) u.voice = pt;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      speechSynthesis.speak(u);
      setTimeout(() => finish(true), Math.min(5000, 500 + String(text).length * 70));
    } catch {
      resolve(false);
    }
  });
}

/** Contagem 1, 2, 3… Começou! */
export async function announceMatchStart(gameName = "") {
  unlockTableAudio();
  tone(320, 0.08, "triangle", 0.06);
  await speakLine("Um", { rate: 1.15 });
  tone(380, 0.08, "triangle", 0.07);
  await speakLine("Dois", { rate: 1.15 });
  tone(440, 0.08, "triangle", 0.08);
  await speakLine("Três", { rate: 1.15 });
  playWinShort();
  const line = gameName ? `Começou! ${gameName}!` : "Começou!";
  await speakLine(line, { rate: 1.08, pitch: 1.12 });
}

export function playWinShort() {
  [523, 659, 784].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, i * 0.07));
}

export function playPiecePlace(heavy = false) {
  noiseBurst(heavy ? 0.08 : 0.05, heavy ? 0.22 : 0.14, heavy ? 900 : 1400);
  tone(heavy ? 180 : 240, 0.06, "triangle", heavy ? 0.08 : 0.05);
}

export function playCapture() {
  noiseBurst(0.1, 0.2, 1200);
  tone(320, 0.08, "square", 0.06);
  tone(160, 0.12, "triangle", 0.08, 0.04);
}

export function playIllegal() {
  tone(140, 0.12, "sawtooth", 0.05);
  tone(110, 0.1, "sawtooth", 0.04, 0.06);
}

export function playCheck() {
  tone(520, 0.08, "sine", 0.07);
  tone(660, 0.1, "sine", 0.08, 0.07);
  tone(880, 0.14, "triangle", 0.06, 0.14);
}

export function playWin() {
  [392, 494, 587, 784].forEach((f, i) => tone(f, 0.18, "triangle", 0.09, i * 0.1));
}

export function playLose() {
  [330, 277, 220, 165].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.12));
}

let ambienceNodes = null;

export function startTableAmbience(kind = "salon") {
  stopTableAmbience();
  try {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = kind === "pool" ? 0.035 : kind === "cards" ? 0.03 : 0.028;
    master.connect(ctx.destination);

    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = kind === "pool" ? 55 : kind === "cards" ? 68 : 72;
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
    nf.frequency.value = kind === "pool" ? 400 : kind === "cards" ? 1200 : 900;
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

/** Carta batendo / sendo dada */
export function playCardDeal() {
  noiseBurst(0.035, 0.12, 3200);
  tone(520, 0.03, "triangle", 0.04);
}

export function playCardPlay() {
  noiseBurst(0.05, 0.16, 2400);
  tone(280, 0.05, "triangle", 0.06);
}

export function playCardShuffle() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => noiseBurst(0.04, 0.1, 2800 + i * 100), i * 45);
  }
}

export async function announceDealing() {
  playCardShuffle();
  await speakLine("Cartas sendo dadas!", { rate: 1.1 });
}

export function playDominoPlace() {
  noiseBurst(0.07, 0.18, 1100);
  tone(200, 0.06, "triangle", 0.07);
}

export function playChip() {
  tone(880, 0.04, "sine", 0.05);
  tone(660, 0.05, "triangle", 0.04, 0.03);
}

export function playTrucoCall() {
  tone(300, 0.1, "sawtooth", 0.08);
  tone(450, 0.12, "square", 0.07, 0.08);
  speakLine("Truco!", { rate: 1.2, pitch: 1.15 });
}

export function playFlip() {
  noiseBurst(0.04, 0.14, 2600);
  tone(400, 0.05, "triangle", 0.05);
}

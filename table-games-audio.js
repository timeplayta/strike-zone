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

/* ——— Vozes da IA — seleção inteligente de voz + 2 locutores (M/F) ——— */
let voiceCache = [];
function refreshVoices() {
  try {
    voiceCache = speechSynthesis.getVoices?.() || [];
  } catch {
    voiceCache = [];
  }
  return voiceCache;
}
if (typeof speechSynthesis !== "undefined") {
  try {
    speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  } catch {
    /* ignore */
  }
}

const FEMALE_HINTS = ["maria", "francisca", "fernanda", "camila", "luciana", "yara", "helena", "isabela", "female", "mulher"];
const MALE_HINTS = ["daniel", "antonio", "antônio", "fabio", "fábio", "ricardo", "humberto", "julio", "júlio", "felipe", "male", "homem"];

function classifyVoice(v) {
  const n = v.name.toLowerCase();
  const natural = /natural|online|neural/.test(n);
  let gender = null;
  if (FEMALE_HINTS.some((h) => n.includes(h))) gender = "female";
  else if (MALE_HINTS.some((h) => n.includes(h))) gender = "male";
  return { voice: v, natural, gender };
}

function ptVoices() {
  const voices = voiceCache.length ? voiceCache : refreshVoices();
  return voices.filter((v) => /^pt/i.test(v.lang));
}

/** Acha a melhor voz do sistema pro gênero pedido; prioriza vozes "Natural/Online" */
function resolveVoice(gender) {
  const list = ptVoices().map(classifyVoice);
  if (!list.length) return { voice: null, matched: false };
  const byNatural = (a, b) => (b.natural ? 1 : 0) - (a.natural ? 1 : 0);
  const exact = list.filter((c) => c.gender === gender).sort(byNatural);
  if (exact.length) return { voice: exact[0].voice, matched: true };
  const rest = [...list].sort(byNatural);
  return { voice: rest[0]?.voice || null, matched: false };
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Duas personas de locutor: quando o sistema só tem 1 voz em pt-BR, a diferença
// de tom/velocidade ainda deixa as duas audivelmente diferentes.
const VOICE_PERSONAS = {
  female: { gender: "female", pitch: 1.05, rate: 1.08, fallbackPitch: 1.22 },
  male: { gender: "male", pitch: 0.9, rate: 1.06, fallbackPitch: 0.76 },
};

let ttsWarmed = false;

/** Chrome atrasa a 1ª fala — aquece no clique do lobby */
function warmTtsEngine() {
  if (typeof speechSynthesis === "undefined") return;
  refreshVoices();
  if (ttsWarmed) return;
  ttsWarmed = true;
  try {
    const u = new SpeechSynthesisUtterance(".");
    u.volume = 0.001;
    u.rate = 3;
    const { voice } = resolveVoice("female");
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
    window.setTimeout(() => {
      try {
        speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }, 50);
  } catch {
    /* ignore */
  }
}

let currentPersona = "female";
export function setAnnouncerPersona(id) {
  if (VOICE_PERSONAS[id]) currentPersona = id;
}
export function getAnnouncerPersona() {
  return currentPersona;
}
export function listAnnouncerPersonas() {
  return Object.keys(VOICE_PERSONAS);
}

export function unlockTableAudio() {
  try {
    getCtx();
    if (typeof speechSynthesis !== "undefined") {
      refreshVoices();
      warmTtsEngine();
      if (!voiceCache.length) {
        speechSynthesis.addEventListener?.(
          "voiceschanged",
          () => {
            refreshVoices();
            warmTtsEngine();
          },
          { once: true }
        );
      }
    }
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
      const interrupt = opts.interrupt !== false;
      if (interrupt) {
        try {
          speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
      const persona = VOICE_PERSONAS[opts.persona || currentPersona] || VOICE_PERSONAS.female;
      const { voice, matched } = resolveVoice(persona.gender);
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = opts.lang || "pt-BR";
      if (voice) u.voice = voice;
      const excited = opts.excited ? 0.05 : 0;
      const jitter = (Math.random() - 0.5) * 0.02;
      const basePitch = matched ? persona.pitch : persona.fallbackPitch;
      u.pitch = clamp((opts.pitch ?? basePitch + excited) + jitter, 0.3, 2);
      const baseRate = opts.rate ?? persona.rate + excited + (opts.bot ? 0.06 : 0);
      u.rate = clamp(baseRate + jitter, 0.5, 2);
      u.volume = opts.volume ?? 0.95;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      speechSynthesis.speak(u);
      setTimeout(() => finish(true), Math.min(3500, 220 + String(text).length * 42));
    } catch {
      resolve(false);
    }
  });
}

/** Falas reativas do bot — corta fila anterior e fala mais rápido */
export function speakBotReact(text, opts = {}) {
  return speakLine(text, { rate: 1.16, interrupt: true, bot: true, ...opts });
}

/** Contagem 1-2-3 sincronizada: voz + visual no mesmo passo, ritmo fixo */
export async function runMatchCountdown(gameName = "", onVisualStep = null) {
  unlockTableAudio();
  currentPersona = Math.random() < 0.5 ? "female" : "male";

  const COUNTDOWN_RATE = 1.48;
  const STEP_MS = 540;
  const FINAL_MS = 680;

  const steps = [
    { visual: "1", speech: "Um", freq: 320 },
    { visual: "2", speech: "Dois", freq: 380 },
    { visual: "3", speech: "Três", freq: 440 },
    {
      visual: "COMEÇOU!",
      speech: gameName ? `Começou! ${gameName}!` : "Começou!",
      excited: true,
      final: true,
    },
  ];

  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }

  for (const step of steps) {
    onVisualStep?.(step.visual);
    if (step.freq) tone(step.freq, 0.08, "triangle", step.freq >= 440 ? 0.08 : 0.07);
    else playWinShort();

    speakLine(step.speech, { excited: step.excited, rate: COUNTDOWN_RATE });

    await new Promise((r) => setTimeout(r, step.final ? FINAL_MS : STEP_MS));
  }

  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/** Contagem 1, 2, 3… Começou! — cada partida sorteia um locutor (homem ou mulher) */
export async function announceMatchStart(gameName = "") {
  await runMatchCountdown(gameName);
}

/** Aviso claro de fim de partida — voz (sons já tocam nos jogos individuais) */
export function announceMatchEnd(outcome, detail = "") {
  unlockTableAudio();
  if (outcome === "win") {
    speakLine(detail || "Você venceu!", { excited: true, rate: 1.08 });
  } else if (outcome === "lose") {
    speakLine(detail || "O bot venceu.", { rate: 1.05 });
  } else {
    speakLine(detail || "Empate!", { rate: 1.05 });
  }
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

export function announceDealing() {
  playCardShuffle();
  speakBotReact("Cartas!", { rate: 1.24, interrupt: false });
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
  speakBotReact("Truco!", { rate: 1.22, pitch: 1.12, excited: true });
}

export function playFlip() {
  noiseBurst(0.04, 0.14, 2600);
  tone(400, 0.05, "triangle", 0.05);
}

/** Sons dos monstros do labirinto — stalk, gosma, mãos, pelúcia */

let audioCtx = null;
const loops = new Map();

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function noiseBurst(ctx, t, dur, vol, freq = 800) {
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.12));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}

export function playMonsterStalk(kind, intensity = 0.5) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const vol = Math.min(0.55, 0.08 + intensity * 0.35);

    if (kind === "gosmento") {
      noiseBurst(ctx, t, 0.35, vol * 0.7, 320);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(90 + intensity * 40, t);
      o.frequency.linearRampToValueAtTime(55, t + 0.3);
      g.gain.setValueAtTime(vol * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    } else if (kind === "gigante") {
      noiseBurst(ctx, t, 0.5, vol * 0.9, 180);
      noiseBurst(ctx, t + 0.28, 0.45, vol * 0.75, 120);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(45, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.55);
      g.gain.setValueAtTime(vol * 0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    } else if (kind === "pelucia") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(520 + intensity * 80, t);
      o.frequency.linearRampToValueAtTime(380, t + 0.25);
      g.gain.setValueAtTime(vol * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.35);
    }
  } catch { /* opcional */ }
}

export function startMonsterDrone(kind, intensity = 0.3) {
  stopMonsterDrone(kind);
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    const g = ctx.createGain();
    lfo.frequency.value = kind === "gigante" ? 0.35 : kind === "gosmento" ? 1.2 : 2.4;
    lfoG.gain.value = kind === "gigante" ? 18 : 12;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    osc.type = kind === "pelucia" ? "triangle" : "sawtooth";
    osc.frequency.value = kind === "gigante" ? 38 : kind === "gosmento" ? 72 : 200;
    g.gain.value = Math.min(0.22, 0.04 + intensity * 0.16);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    lfo.start(t);
    loops.set(kind, { osc, lfo, g });
  } catch { /* opcional */ }
}

export function updateMonsterDrone(kind, intensity) {
  const loop = loops.get(kind);
  if (!loop) return;
  const vol = Math.min(0.28, 0.05 + intensity * 0.2);
  loop.g.gain.setTargetAtTime(vol, getCtx().currentTime, 0.15);
}

export function stopMonsterDrone(kind) {
  const loop = loops.get(kind);
  if (!loop) return;
  try {
    loop.osc.stop();
    loop.lfo.stop();
  } catch { /* já parado */ }
  loops.delete(kind);
}

export function stopAllMonsterDrones() {
  for (const k of [...loops.keys()]) stopMonsterDrone(k);
}

export function speakPlushLine(line = "Vem brincar comigo") {
  try {
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(line);
      u.lang = "pt-BR";
      u.rate = 0.82;
      u.pitch = 1.55;
      u.volume = 0.9;
      speechSynthesis.speak(u);
      return;
    }
  } catch { /* fallback */ }

  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      const base = 280 + i * 60;
      o.frequency.setValueAtTime(base, t + i * 0.12);
      o.frequency.linearRampToValueAtTime(base * 0.85, t + i * 0.12 + 0.1);
      g.gain.setValueAtTime(0.001, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.14);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.16);
    }
  } catch { /* opcional */ }
}

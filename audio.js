/** Sons sintéticos (sem arquivos externos) */
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playGunshot(weaponName = "rifle") {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const isPistol = weaponName.toLowerCase().includes("glock");
    const isKnife = weaponName.toLowerCase().includes("faca");

    if (isKnife) return;

    const bufferSize = ctx.sampleRate * (isPistol ? 0.08 : 0.12);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = isPistol ? 2200 : 1400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isPistol ? 0.35 : 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.2);
  } catch {
    /* áudio opcional */
  }
}

export function playEmptyClip() {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 800;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.05);
  } catch {
    /* ignore */
  }
}

/** Jumpscares cinematográficos 3D — monstro ataca a câmera + áudio + overlay */

import * as THREE from "three";

let audioCtx = null;
let jumpscareActive = false;

export function isJumpscareActive() {
  return jumpscareActive;
}

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function easeInExpo(t) {
  return t <= 0 ? 0 : Math.pow(2, 10 * t - 10);
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

/** Áudio em camadas — impacto + grito + sub */
export function playHorrorScream(kind = "death") {
  const screamKind =
    kind === "gosmento" ? "slime"
    : kind === "gigante" ? "giant"
    : kind === "pelucia" ? "plush"
    : kind;
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const master = ctx.createGain();
    const loud = screamKind === "death" || screamKind === "giant" ? 0.92 : 0.78;
    master.gain.setValueAtTime(loud, t);
    master.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    master.connect(ctx.destination);

    const boomFreq = screamKind === "giant" ? 35 : screamKind === "slime" ? 70 : 55;
    const boom = ctx.createOscillator();
    const boomG = ctx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(boomFreq, t);
    boom.frequency.exponentialRampToValueAtTime(screamKind === "plush" ? 140 : 18, t + 0.45);
    boomG.gain.setValueAtTime(0.95, t);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    boom.connect(boomG);
    boomG.connect(master);
    boom.start(t);
    boom.stop(t + 0.55);

    const slamSize = Math.floor(ctx.sampleRate * 0.12);
    const slamBuf = ctx.createBuffer(1, slamSize, ctx.sampleRate);
    const slamData = slamBuf.getChannelData(0);
    for (let i = 0; i < slamSize; i++) {
      slamData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (slamSize * 0.06));
    }
    const slam = ctx.createBufferSource();
    slam.buffer = slamBuf;
    const slamG = ctx.createGain();
    slamG.gain.setValueAtTime(0.85, t);
    slamG.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    slam.connect(slamG);
    slamG.connect(master);
    slam.start(t + 0.01);

    const screamDelay = 0.04;
    const screamT = t + screamDelay;
    for (let layer = 0; layer < 3; layer++) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = layer === 0 ? "sawtooth" : layer === 1 ? "square" : "triangle";
      const base =
        screamKind === "plush" ? 420
        : screamKind === "slime" ? 180
        : screamKind === "giant" ? 120
        : screamKind === "death" ? 280
        : 340;
      osc.frequency.setValueAtTime(base + layer * 40, screamT);
      osc.frequency.exponentialRampToValueAtTime(90 + layer * 20, screamT + 0.55);
      og.gain.setValueAtTime(0.001, screamT);
      og.gain.linearRampToValueAtTime(0.22 - layer * 0.04, screamT + 0.02);
      og.gain.exponentialRampToValueAtTime(0.001, screamT + 0.85);
      osc.connect(og);
      og.connect(master);
      osc.start(screamT + layer * 0.03);
      osc.stop(screamT + 0.9);
    }

    const hissSize = Math.floor(ctx.sampleRate * 0.7);
    const hissBuf = ctx.createBuffer(1, hissSize, ctx.sampleRate);
    const hissData = hissBuf.getChannelData(0);
    for (let i = 0; i < hissSize; i++) {
      hissData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hissSize * 0.14));
    }
    const hiss = ctx.createBufferSource();
    hiss.buffer = hissBuf;
    const hissG = ctx.createGain();
    hissG.gain.setValueAtTime(0.45, screamT);
    hissG.gain.exponentialRampToValueAtTime(0.001, screamT + 0.75);
    hiss.connect(hissG);
    hissG.connect(master);
    hiss.start(screamT);

    const sting = ctx.createOscillator();
    const stingG = ctx.createGain();
    sting.type = "sawtooth";
    sting.frequency.setValueAtTime(1200, screamT + 0.35);
    sting.frequency.exponentialRampToValueAtTime(200, screamT + 0.55);
    stingG.gain.setValueAtTime(0.001, screamT + 0.35);
    stingG.gain.linearRampToValueAtTime(0.35, screamT + 0.38);
    stingG.gain.exponentialRampToValueAtTime(0.001, screamT + 0.7);
    sting.connect(stingG);
    stingG.connect(master);
    sting.start(screamT + 0.35);
    sting.stop(screamT + 0.75);
  } catch { /* opcional */ }
}

const STYLE_PALETTE = {
  death: { vignette: "#8a0000", blood: "#cc0000", static: 0.55 },
  gosmento: { vignette: "#1a0a28", blood: "#8868aa", static: 0.5 },
  gigante: { vignette: "#220008", blood: "#660011", static: 0.62 },
  pelucia: { vignette: "#3a2010", blood: "#aa4422", static: 0.48 },
  devorador: { vignette: "#6a0000", blood: "#aa1100", static: 0.5 },
  observador: { vignette: "#1a2848", blood: "#2244aa", static: 0.45 },
  vazio: { vignette: "#0a0a14", blood: "#333344", static: 0.65 },
};

function showHorrorOverlay(style, name) {
  const el = document.getElementById("jumpscareOverlay");
  const nameEl = document.getElementById("jumpscareName");
  const pal = STYLE_PALETTE[style] || STYLE_PALETTE.death;
  if (!el) return;

  el.style.setProperty("--js-vignette", pal.vignette);
  el.style.setProperty("--js-blood", pal.blood);
  el.style.setProperty("--js-static", String(pal.static));

  if (nameEl) {
    nameEl.textContent = name || "";
    if (name) nameEl.classList.remove("hidden");
    else nameEl.classList.add("hidden");
  }

  el.classList.remove("hidden");
  el.classList.add("active");
  document.body.classList.add("jumpscare-active");
}

function setJumpscareMode(mode) {
  const el = document.getElementById("jumpscareOverlay");
  if (!el) return;
  el.classList.remove("mode-plush", "mode-slime");
  if (mode === "plush") el.classList.add("mode-plush");
  if (mode === "slime") el.classList.add("mode-slime");
}

function updateOverlayIntensity(attack) {
  const el = document.getElementById("jumpscareOverlay");
  if (!el) return;
  const blood = el.querySelector(".jumpscare-blood");
  const vignette = el.querySelector(".jumpscare-vignette");
  const stat = el.querySelector(".jumpscare-static");
  const pulse = Math.min(1, attack * 1.4);
  if (blood) blood.style.opacity = String(0.15 + pulse * 0.85);
  if (vignette) vignette.style.opacity = String(0.35 + pulse * 0.65);
  if (stat) stat.style.opacity = String(0.2 + pulse * 0.55);
}

function hideHorrorOverlay() {
  const el = document.getElementById("jumpscareOverlay");
  if (el) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }
  document.body.classList.remove("jumpscare-active");
  setJumpscareMode(null);
}

/** Monstro procedural para fallback (morte sem modelo visível) */
function buildHorrorJumper(def = {}) {
  const group = new THREE.Group();
  const color = def.color ?? 0x1a0808;
  const eyeColor = def.eye ?? 0xff2200;
  const height = def.height ?? 2.5;
  const scale = def.scale ?? 1.35;

  const flesh = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    emissive: new THREE.Color(color).multiplyScalar(0.2),
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0404, roughness: 1 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 1.4,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 6, 12), flesh);
  torso.position.y = height * 0.38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), flesh);
  head.scale.set(1.15, 1.05, 1.2);
  head.position.y = height * 0.82;

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), dark);
  jaw.position.set(0, height * 0.68, 0.28);
  jaw.rotation.x = 0.35;

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), eyeMat);
  eyeL.position.set(-0.16, height * 0.88, 0.32);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.16;

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8), flesh);
  armL.position.set(-0.62, height * 0.55, 0.35);
  armL.rotation.z = 0.55;
  armL.rotation.x = -0.9;
  const armR = armL.clone();
  armR.position.x = 0.62;
  armR.rotation.z = -0.55;
  armR.rotation.x = -0.9;

  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.04), new THREE.MeshStandardMaterial({ color: 0xddd8cc }));
    tooth.position.set(-0.2 + i * 0.08, height * 0.72, 0.42);
    group.add(tooth);
  }

  group.add(torso, head, jaw, eyeL, eyeR, armL, armR);
  group.scale.setScalar(scale);
  return group;
}

function saveJumperTransform(jumper) {
  return {
    pos: jumper.position.clone(),
    quat: jumper.quaternion.clone(),
    scale: jumper.scale.clone(),
    visible: jumper.visible,
  };
}

function restoreJumperTransform(jumper, saved) {
  if (!saved) return;
  jumper.position.copy(saved.pos);
  jumper.quaternion.copy(saved.quat);
  jumper.scale.copy(saved.scale);
  jumper.visible = saved.visible;
}

/**
 * Jumpscare 3D — monstro avança na câmera
 * opts: camera, scene, renderer, sourceGroup?, def?, style, name, duration, sound
 */
export function playCinematicJumpscare(opts = {}) {
  const { camera, scene, renderer } = opts;
  if (!camera || !scene || !renderer) {
    return showJumpscareOverlay(opts);
  }

  const style = opts.style || "death";
  const duration = opts.duration ?? 1350;
  const sound = opts.sound || (style === "death" ? "death" : "monster");
  const name = opts.name || "";
  const jumpscareType = opts.jumpscareType || "default";

  jumpscareActive = true;
  setJumpscareMode(jumpscareType === "plush" ? "plush" : jumpscareType === "slime" ? "slime" : null);
  showHorrorOverlay(style, name);
  playHorrorScream(sound === "monster" ? style : sound);

  const usesOriginal = !!opts.sourceGroup;
  let jumper = opts.sourceGroup;
  let savedTransform = null;
  let builtJumper = null;

  if (jumper) {
    savedTransform = saveJumperTransform(jumper);
    jumper.visible = true;
  } else {
    builtJumper = buildHorrorJumper(opts.def);
    jumper = builtJumper;
    scene.add(jumper);
  }

  const origFov = camera.fov;
  const origPos = camera.position.clone();
  const forward = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const startT = performance.now();

  const scareLight = new THREE.PointLight(
    STYLE_PALETTE[style]?.vignette === "#1a2848" ? 0x4466aa : 0xff2200,
    0,
    8,
    2
  );
  scene.add(scareLight);

  return new Promise((resolve) => {
    function tick() {
      const elapsed = performance.now() - startT;
      const t = Math.min(1, elapsed / duration);
      const attack = easeInExpo(Math.min(1, t * 1.65));
      const lunge = easeOutQuad(Math.min(1, t * 2.2));

      const dist = 3.2 - lunge * 2.75;
      camera.getWorldDirection(forward);
      forward.multiplyScalar(dist);
      scratch.copy(camera.position).add(forward);

      if (jumpscareType === "plush" && t < 0.42) {
        const rise = easeOutQuad(t / 0.42);
        jumper.position.copy(scratch);
        jumper.position.y = camera.position.y - 1.85 + rise * 1.55;
      } else if (jumpscareType === "slime") {
        jumper.position.copy(scratch);
        jumper.position.y = camera.position.y - 0.45 + lunge * 0.2;
      } else {
        jumper.position.copy(scratch);
        jumper.position.y = camera.position.y - 0.55 + lunge * 0.35;
      }

      jumper.lookAt(camera.position.x, camera.position.y - 0.1, camera.position.z);
      jumper.rotateX(-0.15 - lunge * 0.25);

      const shake = attack > 0.55 ? (attack - 0.55) * 0.35 : 0;
      camera.position.x = origPos.x + (Math.random() - 0.5) * shake;
      camera.position.y = origPos.y + (Math.random() - 0.5) * shake * 0.7;
      camera.fov = origFov + lunge * 14 - attack * 4;
      camera.updateProjectionMatrix();

      scareLight.position.copy(camera.position);
      scareLight.intensity = 0.5 + attack * 4.5;
      scareLight.color.set(
        attack > 0.7
          ? new THREE.Color(0xff0000)
          : new THREE.Color(STYLE_PALETTE[style]?.vignette || "#8a0000")
      );

      updateOverlayIntensity(attack);
      renderer.render(scene, camera);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        if (builtJumper) scene.remove(builtJumper);
        else restoreJumperTransform(jumper, savedTransform);
        scene.remove(scareLight);
        camera.position.copy(origPos);
        camera.fov = origFov;
        camera.updateProjectionMatrix();
        hideHorrorOverlay();
        jumpscareActive = false;
        resolve();
      }
    }
    tick();
  });
}

/** API principal — usa 3D se tiver cena, senão overlay só */
export function showJumpscareOverlay(opts = {}) {
  if (opts.camera && opts.scene && opts.renderer) {
    return playCinematicJumpscare(opts);
  }

  const style = opts.style || "death";
  const duration = opts.duration ?? 1200;
  jumpscareActive = true;
  showHorrorOverlay(style, opts.name);
  playHorrorScream(opts.sound || (style === "death" ? "death" : "monster"));

  return new Promise((resolve) => {
    setTimeout(() => {
      hideHorrorOverlay();
      jumpscareActive = false;
      resolve();
    }, duration);
  });
}

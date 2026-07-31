/** Esconde-Esconde clássico — esconda-se do caçador atrás dos obstáculos */

import * as THREE from "three";
import { buildChameleonArena } from "./chameleon-map.js";
import { buildChameleonAnimal, buildHunter, ANIMAL_META } from "./chameleon-animals.js";
import { attachOrbitDrag } from "./orbit-drag.js";
import { attachPixelPaintBrush } from "./chameleon-paint.js";
import { speakLine, unlockTableAudio } from "./table-games-audio.js";

const VARIANTS = {
  esconde: {
    title: "Esconde-Esconde",
    emoji: "🙈",
    desc: "O caçador conta até 12… depois te procura! Esconda-se atrás das jarras e patos. WASD · arraste o mouse (lados/cima/baixo) · Shift corre · 🖌️ pinte pixel a pixel.",
    duration: 120,
    countdown: 12,
    arenaSeed: 42,
    bg: 0x87b8e8,
    fog: 0x6a9cc8,
    hunterPatrol: 3.2,
    hunterChase: 5.4,
    visionRange: 14,
    playerColor: 0xf2f2f2,
  },
  sombras: {
    title: "Sombras no Porão",
    emoji: "🔦",
    desc: "Porão escuro — fique nas sombras. Caçador agressivo e rápido. WASD · mouse olha em todas direções · 🎨+🖌️ pintar camuflagem.",
    duration: 90,
    countdown: 10,
    arenaSeed: 88,
    bg: 0x0a0808,
    fog: 0x060404,
    hunterPatrol: 3.5,
    hunterChase: 5.8,
    visionRange: 10,
    playerColor: 0xd8d0e8,
    dark: true,
  },
};

const CONE_COS = 0.52;
const CLOSE_RADIUS = 2.1;
const CATCH_RADIUS = 0.95;
const HUNTER_SCALE = 1.9;
const HUNTER_COLLIDE_R = 0.42;
const PLAYER_COLLIDE_R = 0.09;
const ANIMAL_SCALE = 0.19;
const BASE_SPEED = 3.8;

let currentHue = 0.58;
let currentSat = 0.35;
let currentLum = 0.55;
let paintTool = null; // null | 'brush' | 'eraser'
let detachPaintBrush = null;

function setPaintTool(tool) {
  paintTool = paintTool === tool ? null : tool;
  const paintBtn = shell?.querySelector("[data-paint-btn]");
  const eraseBtn = shell?.querySelector("[data-erase-btn]");
  paintBtn?.classList.toggle("active", paintTool === "brush");
  paintBtn && (paintBtn.textContent = paintTool === "brush" ? "🖌️ Pintando…" : "🖌️ Pintar");
  eraseBtn?.classList.toggle("active", paintTool === "eraser");
  eraseBtn && (eraseBtn.textContent = paintTool === "eraser" ? "🧽 Apagando…" : "🧽 Borracha");
}

function currentColorHex() {
  const c = new THREE.Color();
  c.setHSL(currentHue, currentSat, currentLum);
  return c.getHex();
}

function $(id) {
  return document.getElementById(id);
}

let shell = null;
let activeVariant = "esconde";
let cfg = VARIANTS.esconde;
let renderer = null;
let scene = null;
let camera = null;
let raf = null;
let clock = null;
let orbitPivot = null;
let keys = new Set();
let touchDir = { x: 0, z: 0 };
let cleanupFns = [];
let running = false;

let player = null;
let hunter = null;
let arena = null;
let hiderRig = null;
let hunterRig = null;
let matchState = null;

function drawColorWheel(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) - 2;
  const img = ctx.createImageData(w, h);
  const tmp = new THREE.Color();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const idx = (y * w + x) * 4;
      if (dist > radius) {
        img.data[idx + 3] = 0;
        continue;
      }
      const hue = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const sat = Math.min(1, dist / radius);
      tmp.setHSL(hue, sat, 0.5);
      img.data[idx] = Math.round(tmp.r * 255);
      img.data[idx + 1] = Math.round(tmp.g * 255);
      img.data[idx + 2] = Math.round(tmp.b * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function applyBrushPreview() {
  const hex = currentColorHex();
  const preview = shell?.querySelector("[data-color-preview]");
  if (preview) preview.style.background = `#${hex.toString(16).padStart(6, "0")}`;
}

function initColorWheel() {
  const dock = shell.querySelector("[data-color-dock]");
  if (!dock || dock.dataset.ready) return;
  dock.dataset.ready = "1";
  const btn = dock.querySelector("[data-color-btn]");
  const panel = dock.querySelector("[data-color-panel]");
  const wheel = dock.querySelector("[data-wheel]");
  const lum = dock.querySelector("[data-lum]");
  const paintBtn = dock.querySelector("[data-paint-btn]");
  drawColorWheel(wheel);

  btn.addEventListener("click", () => panel.classList.toggle("hidden"));
  paintBtn?.addEventListener("click", () => setPaintTool("brush"));
  dock.querySelector("[data-erase-btn]")?.addEventListener("click", () => setPaintTool("eraser"));

  const pickFromWheel = (e) => {
    const rect = wheel.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * wheel.width;
    const y = ((e.clientY - rect.top) / rect.height) * wheel.height;
    const cx = wheel.width / 2;
    const cy = wheel.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.min(cx, cy) - 2;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return;
    currentHue = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
    currentSat = Math.min(1, dist / radius);
    applyBrushPreview();
  };
  let wheelDown = false;
  wheel.addEventListener("pointerdown", (e) => {
    wheelDown = true;
    wheel.setPointerCapture?.(e.pointerId);
    pickFromWheel(e);
  });
  wheel.addEventListener("pointermove", (e) => {
    if (wheelDown) pickFromWheel(e);
  });
  wheel.addEventListener("pointerup", () => {
    wheelDown = false;
  });
  lum.addEventListener("input", () => {
    currentLum = Number(lum.value) / 100;
    applyBrushPreview();
  });
  applyBrushPreview();
}

function hasLineOfSight(hx, hz, px, pz) {
  if (!arena?.colliders?.length) return true;
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = hx + (px - hx) * t;
    const z = hz + (pz - hz) * t;
    for (const c of arena.colliders) {
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
    }
  }
  return true;
}

function ensureShell() {
  if (shell) return shell;
  shell = document.createElement("div");
  shell.id = "hsScreen";
  shell.className = "cha-screen hidden";
  shell.setAttribute("aria-hidden", "true");
  shell.innerHTML = `
    <div class="cha-lobby" data-lobby>
      <div class="cha-lobby-card">
        <p class="cha-eyebrow">Esconde-esconde</p>
        <h1 class="cha-title" data-title>🙈 Esconde-Esconde</h1>
        <p class="cha-desc" data-desc></p>
        <div class="cha-lobby-foot">
          <button type="button" class="tg-btn tg-btn-ghost" data-back>Voltar ao menu</button>
          <button type="button" class="tg-btn tg-btn-primary" data-start>Entrar na arena</button>
        </div>
      </div>
    </div>
    <div class="cha-match hidden" data-match>
      <canvas class="cha-canvas" data-canvas></canvas>
      <div class="cha-hud">
        <div class="cha-hud-top">
          <div class="cha-timer" data-timer>1:30</div>
          <button type="button" class="cha-exit-btn" data-exit>Sair</button>
        </div>
        <div class="cha-meters">
          <div class="cha-meter">
            <span class="cha-meter-label">Risco de ser visto</span>
            <div class="cha-meter-bar"><div class="cha-meter-fill cha-meter-susp" data-susp></div></div>
          </div>
          <div class="cha-meter">
            <span class="cha-meter-label">Cobertura</span>
            <div class="cha-meter-bar"><div class="cha-meter-fill cha-meter-light" data-cover></div></div>
          </div>
        </div>
        <div class="cha-status" data-status>Esconda-se!</div>
        <div class="cha-color-dock" data-color-dock>
          <div class="cha-color-panel hidden" data-color-panel>
            <canvas class="cha-wheel" data-wheel width="170" height="170"></canvas>
            <label class="cha-lum-label">Luminosidade</label>
            <input type="range" class="cha-lum-slider" data-lum min="8" max="95" value="55" />
            <div class="cha-color-preview-row">
              <span class="cha-color-preview" data-color-preview></span>
              <span class="cha-color-hint">Cor do pincel — 🖌️ pintar · 🧽 borracha apaga</span>
            </div>
          </div>
          <button type="button" class="cha-color-btn" data-color-btn>🎨 Cores</button>
          <button type="button" class="cha-paint-btn" data-paint-btn>🖌️ Pintar</button>
          <button type="button" class="cha-erase-btn" data-erase-btn>🧽 Borracha</button>
        </div>
        <div class="cha-touch" data-touch>
          <div class="cha-touch-move">
            <button type="button" class="cha-touch-btn" data-move="up">▲</button>
            <div class="cha-touch-row">
              <button type="button" class="cha-touch-btn" data-move="left">◀</button>
              <button type="button" class="cha-touch-btn" data-move="right">▶</button>
            </div>
            <button type="button" class="cha-touch-btn" data-move="down">▼</button>
          </div>
          <div class="cha-touch-actions">
            <button type="button" class="cha-touch-btn cha-touch-wide" data-action="crouch">🫥 Agachar</button>
            <button type="button" class="cha-touch-btn cha-touch-wide" data-action="run">🏃 Correr</button>
          </div>
        </div>
      </div>
      <div class="cha-end hidden" data-end>
        <div class="cha-end-card">
          <div class="cha-end-title" data-end-title>Você escapou!</div>
          <div class="cha-end-desc" data-end-desc></div>
          <div class="cha-end-actions">
            <button type="button" class="tg-btn tg-btn-ghost" data-end-exit>Sair</button>
            <button type="button" class="tg-btn tg-btn-primary" data-end-again>Jogar de novo</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(shell);

  shell.querySelector("[data-back]").addEventListener("click", closeHideSeekMode);
  shell.querySelector("[data-start]").addEventListener("click", startMatch);
  shell.querySelector("[data-exit]").addEventListener("click", closeHideSeekMode);
  shell.querySelector("[data-end-exit]").addEventListener("click", closeHideSeekMode);
  shell.querySelector("[data-end-again]").addEventListener("click", () => {
    shell.querySelector("[data-end]").classList.add("hidden");
    startMatch();
  });

  const touchEl = shell.querySelector("[data-touch]");
  const setTouchDir = (dir, x, z) => {
    touchEl.querySelectorAll("[data-move]").forEach((b) => b.classList.toggle("active", b.dataset.move === dir));
    touchDir.x = x;
    touchDir.z = z;
  };
  touchEl.querySelectorAll("[data-move]").forEach((btn) => {
    const dir = btn.dataset.move;
    const vec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const start = (e) => {
      e.preventDefault();
      setTouchDir(dir, vec[0], vec[1]);
    };
    const end = (e) => {
      e.preventDefault();
      if (touchDir.x === vec[0] && touchDir.z === vec[1]) setTouchDir(null, 0, 0);
    };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointerleave", end);
  });
  touchEl.querySelector('[data-action="crouch"]').addEventListener("click", () => toggleCrouch());
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerdown", () => keys.add("run-touch"));
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerup", () => keys.delete("run-touch"));
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerleave", () => keys.delete("run-touch"));

  return shell;
}

function applyLobbyCopy() {
  cfg = VARIANTS[activeVariant] || VARIANTS.esconde;
  shell.querySelector("[data-title]").textContent = `${cfg.emoji} ${cfg.title}`;
  shell.querySelector("[data-desc]").textContent = cfg.desc;
}

function toggleCrouch() {
  if (!matchState || matchState.over) return;
  player.crouching = !player.crouching;
}

function disposeScene(sceneObj) {
  if (!sceneObj) return;
  sceneObj.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose?.());
    }
  });
}

function flushCleanup() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
}

function setupScene(canvas) {
  flushCleanup();
  disposeScene(scene);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.bg);
  scene.fog = new THREE.Fog(cfg.fog, cfg.dark ? 8 : 16, cfg.dark ? 22 : 38);

  camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, cfg.dark ? 0.22 : 0.55));
  const hemi = new THREE.HemisphereLight(cfg.dark ? 0x334455 : 0x8fa0ff, 0x1a1410, cfg.dark ? 0.15 : 0.35);
  scene.add(hemi);

  arena = buildChameleonArena(cfg.arenaSeed);
  scene.add(arena.group);

  hiderRig = buildChameleonAnimal("leao", cfg.playerColor);
  hiderRig.group.scale.setScalar(ANIMAL_SCALE);
  scene.add(hiderRig.group);

  hunterRig = buildHunter();
  hunterRig.group.scale.setScalar(HUNTER_SCALE);
  scene.add(hunterRig.group);

  player = {
    x: arena.spawnPlayer.x,
    z: arena.spawnPlayer.z,
    angle: Math.PI,
    crouching: false,
    stillT: 0,
  };
  hunter = {
    x: arena.spawnHunter.x,
    z: arena.spawnHunter.z,
    angle: 0,
    state: "wait",
    waypoint: null,
    chaseLostT: 0,
    lastSeenX: arena.spawnPlayer.x,
    lastSeenZ: arena.spawnPlayer.z,
  };

  orbitPivot = new THREE.Object3D();
  orbitPivot.rotation.y = player.angle;
  orbitPivot.rotation.x = 0.1;
  attachOrbitDrag(canvas, () => orbitPivot, undefined, {
    invertYaw: true,
    sensitivity: 0.014,
    allowPitch: true,
    canDrag: () => !paintTool,
  });

  if (detachPaintBrush) detachPaintBrush();
  detachPaintBrush = attachPixelPaintBrush(canvas, {
    camera,
    getTargets: () => (hiderRig ? [hiderRig.group] : []),
    getBrushColor: currentColorHex,
    getTool: () => paintTool ?? "brush",
    isActive: () => !!paintTool && matchState?.phase === "play" && !matchState?.over,
    onPaint: () => {},
  });
  cleanupFns.push(() => {
    detachPaintBrush?.();
    detachPaintBrush = null;
  });

  function resize() {
    const rect = shell.querySelector("[data-match]").getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  cleanupFns.push(() => window.removeEventListener("resize", resize));
}

function pickWaypoint() {
  const h = arena.half * 0.85;
  return { x: (Math.random() * 2 - 1) * h, z: (Math.random() * 2 - 1) * h };
}

function animateLegs(legs, moveAmount, t) {
  if (!legs?.length) return;
  legs.forEach((leg, i) => {
    const phase = i % 2 === 0 ? 0 : Math.PI;
    const amp = Math.min(0.55, 0.12 + moveAmount * 0.85);
    leg.rotation.x = Math.sin(t * 7 + phase) * amp;
  });
}

function updatePlayer(dt, t) {
  let inputX = touchDir.x;
  let inputZ = -touchDir.z;
  if (keys.has("KeyW") || keys.has("ArrowUp")) inputZ += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) inputZ -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) inputX -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) inputX += 1;
  inputX = Math.max(-1, Math.min(1, inputX));
  inputZ = Math.max(-1, Math.min(1, inputZ));
  if (keys.has("KeyC") || keys.has("ControlLeft")) player.crouching = true;

  const isRunning = (keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("run-touch")) && !player.crouching;
  const camYaw = orbitPivot?.rotation.y ?? player.angle;
  const fx = Math.sin(camYaw);
  const fz = Math.cos(camYaw);
  const rx = Math.cos(camYaw);
  const rz = -Math.sin(camYaw);

  let moveX = fx * inputZ + rx * inputX;
  let moveZ = fz * inputZ + rz * inputX;
  const moveLen = Math.hypot(moveX, moveZ);
  if (moveLen > 1) {
    moveX /= moveLen;
    moveZ /= moveLen;
  }

  let moveAmount = 0;
  if (moveLen > 0.001 && matchState.phase !== "countdown") {
    const speed = BASE_SPEED * ANIMAL_META.leao.speed * (player.crouching ? 0.55 : 1) * (isRunning ? 1.45 : 1);
    const nx = player.x + moveX * speed * dt;
    const nz = player.z + moveZ * speed * dt;
    const resolved = arena.resolveCollision(nx, nz, PLAYER_COLLIDE_R);
    player.x = resolved.x;
    player.z = resolved.z;
    player.angle = Math.atan2(moveX, moveZ);
    moveAmount = speed / BASE_SPEED;
    player.stillT = 0;
  } else if (moveLen < 0.001) {
    player.stillT += dt;
  }

  player.isRunning = isRunning && moveAmount > 0;
  hiderRig.group.position.set(player.x, 0, player.z);
  hiderRig.group.rotation.y = player.angle;
  const squat = player.crouching ? 0.18 : 0;
  hiderRig.group.scale.set(ANIMAL_SCALE, ANIMAL_SCALE * (player.crouching ? 0.82 : 1), ANIMAL_SCALE);
  hiderRig.group.position.y = -squat;
  animateLegs(hiderRig.legs, moveAmount, t);

  const camDist = player.crouching ? 2.6 : 3.1;
  const camHeight = player.crouching ? 1.35 : 1.7;
  const camPitch = orbitPivot?.rotation.x ?? 0;
  const cosP = Math.cos(camPitch);
  const desiredX = player.x - Math.sin(camYaw) * camDist * cosP;
  const desiredZ = player.z - Math.cos(camYaw) * camDist * cosP;
  const desiredY = camHeight + Math.sin(camPitch) * camDist * 0.55;
  camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 8);
  camera.position.z += (desiredZ - camera.position.z) * Math.min(1, dt * 8);
  camera.position.y += (desiredY - camera.position.y) * Math.min(1, dt * 8);
  camera.lookAt(player.x, (player.crouching ? 0.22 : 0.35) + Math.sin(camPitch) * 0.12, player.z);
}

function updateHunter(dt, t) {
  if (matchState.phase === "countdown") {
    hunterRig.group.position.set(hunter.x, 0, hunter.z);
    hunterRig.group.rotation.y = hunter.angle;
    return;
  }

  if (hunter.state === "wait") hunter.state = "patrol";

  if (hunter.state === "chase") {
    const dx = player.x - hunter.x;
    const dz = player.z - hunter.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.01) hunter.angle = Math.atan2(dx, dz);
    const nx = hunter.x + Math.sin(hunter.angle) * cfg.hunterChase * dt;
    const nz = hunter.z + Math.cos(hunter.angle) * cfg.hunterChase * dt;
    const resolved = arena.resolveCollision(nx, nz, HUNTER_COLLIDE_R);
    hunter.x = resolved.x;
    hunter.z = resolved.z;
    if (dist > 12) {
      hunter.chaseLostT += dt;
      if (hunter.chaseLostT > 1.6) {
        hunter.state = "patrol";
        hunter.waypoint = null;
        matchState.suspicion = 30;
      }
    } else hunter.chaseLostT = 0;
    if (dist < CATCH_RADIUS) {
      endMatch(false);
      return;
    }
  } else {
    if (matchState.suspicion > 35) {
      hunter.waypoint = { x: hunter.lastSeenX, z: hunter.lastSeenZ };
    } else if (!hunter.waypoint || Math.hypot(hunter.waypoint.x - hunter.x, hunter.waypoint.z - hunter.z) < 1) {
      hunter.waypoint = Math.random() < 0.4
        ? { x: player.x + (Math.random() - 0.5) * 5, z: player.z + (Math.random() - 0.5) * 5 }
        : pickWaypoint();
    }
    const dx = hunter.waypoint.x - hunter.x;
    const dz = hunter.waypoint.z - hunter.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      hunter.angle = Math.atan2(dx, dz);
      const nx = hunter.x + Math.sin(hunter.angle) * cfg.hunterPatrol * dt;
      const nz = hunter.z + Math.cos(hunter.angle) * cfg.hunterPatrol * dt;
      const resolved = arena.resolveCollision(nx, nz, HUNTER_COLLIDE_R);
      hunter.x = resolved.x;
      hunter.z = resolved.z;
    }
  }

  hunterRig.group.position.set(hunter.x, 0, hunter.z);
  hunterRig.group.rotation.y = hunter.angle;
  animateLegs(hunterRig.legs, hunter.state === "chase" ? 1 : 0.45, t);

  const dist = Math.hypot(player.x - hunter.x, player.z - hunter.z);
  const light = arena.lightAt(player.x, player.z);
  const nearCover = arena.findStickable(player.x, player.z, 0.85);
  let cover = (nearCover ? 0.45 : 0) + (player.crouching ? 0.25 : 0) + (player.stillT > 0.6 ? 0.15 : 0);
  cover += (1 - light) * (cfg.dark ? 0.35 : 0.12);
  cover = Math.max(0, Math.min(1, cover));
  matchState.cover = cover;

  if (hunter.state === "patrol") {
    const toPlayer = Math.atan2(player.x - hunter.x, player.z - hunter.z);
    const inCone = Math.cos(toPlayer - hunter.angle) > CONE_COS;
    const los = hasLineOfSight(hunter.x, hunter.z, player.x, player.z);
    const spotted = los && dist < cfg.visionRange && (inCone || dist < CLOSE_RADIUS);
    if (spotted) {
      hunter.lastSeenX = player.x;
      hunter.lastSeenZ = player.z;
      const proximity = Math.max(0, 1 - dist / cfg.visionRange);
      const expose = (1 - cover) + (player.isRunning ? 0.4 : 0);
      matchState.suspicion += 62 * proximity * expose * dt;
      if (matchState.suspicion >= 100) {
        hunter.state = "chase";
        hunter.chaseLostT = 0;
        speakLine("Te achou! Corre!", { excited: true });
      }
    } else {
      matchState.suspicion -= 18 * dt;
    }
  }
  matchState.suspicion = Math.max(0, Math.min(100, matchState.suspicion));
}

function updateHud() {
  const susp = shell.querySelector("[data-susp]");
  const coverEl = shell.querySelector("[data-cover]");
  const status = shell.querySelector("[data-status]");
  const timer = shell.querySelector("[data-timer]");
  if (susp) {
    susp.style.width = `${matchState.suspicion}%`;
    susp.classList.toggle("cha-meter-danger", matchState.suspicion > 65);
  }
  if (coverEl) coverEl.style.width = `${(matchState.cover ?? 0) * 100}%`;
  if (timer) {
    const s = Math.max(0, Math.ceil(matchState.phase === "countdown" ? matchState.countdownLeft : matchState.timeLeft));
    timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  if (status) {
    if (matchState.phase === "countdown") {
      status.textContent = `Esconda-se! Caçador conta… ${Math.ceil(matchState.countdownLeft)}s`;
    } else if (matchState.timeLeft <= 15) {
      status.textContent = `⏱ ${Math.ceil(matchState.timeLeft)}s — aguente!`;
    } else if (hunter.state === "chase") {
      status.textContent = "🏃 CAÇADOR TE VIU — CORRE!";
    } else if (player.crouching) status.textContent = "Agachado — mais difícil de te ver";
    else if (matchState.cover > 0.65) status.textContent = "Boa cobertura!";
    else if (matchState.cover > 0.35) status.textContent = "Parcialmente exposto";
    else status.textContent = "Exposto! Corra pra trás de um obstáculo";
  }
}

function endMatch(won) {
  if (matchState.over) return;
  matchState.over = true;
  running = false;
  const endEl = shell.querySelector("[data-end]");
  const title = shell.querySelector("[data-end-title]");
  const desc = shell.querySelector("[data-end-desc]");
  if (won) {
    title.textContent = "Você escapou! 🎉";
    desc.textContent = "Sobreviveu sem ser pego pelo caçador.";
    speakLine("Você escapou! Muito bem escondido.", { excited: true });
  } else {
    title.textContent = "O caçador te achou!";
    desc.textContent = "Tente ficar atrás dos obstáculos e agachar na próxima.";
    speakLine("Ele te pegou!");
  }
  endEl.classList.remove("hidden");
}

function tick() {
  if (!running) return;
  raf = requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();
  if (!matchState.over) {
    if (matchState.phase === "countdown") {
      matchState.countdownLeft -= dt;
      if (matchState.countdownLeft <= 0) {
        matchState.phase = "play";
        hunter.state = "patrol";
        speakLine("Pronto ou não, lá vou eu!", { excited: true });
      }
    } else {
      matchState.timeLeft -= dt;
      if (matchState.timeLeft <= 0) endMatch(true);
    }
    updatePlayer(dt, t);
    updateHunter(dt, t);
    updateHud();
  }
  renderer.render(scene, camera);
}

function onKeyDown(e) {
  if (e.code === "KeyE") {
    e.preventDefault();
    toggleCrouch();
    return;
  }
  keys.add(e.code);
}
function onKeyUp(e) {
  keys.delete(e.code);
  if (e.code === "KeyC" || e.code === "ControlLeft") player.crouching = false;
}

function startMatch() {
  applyLobbyCopy();
  shell.querySelector("[data-lobby]").classList.add("hidden");
  shell.querySelector("[data-match]").classList.remove("hidden");
  shell.querySelector("[data-end]")?.classList.add("hidden");
  const canvas = shell.querySelector("[data-canvas]");

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  setupScene(canvas);

  matchState = {
    phase: "countdown",
    countdownLeft: cfg.countdown,
    timeLeft: cfg.duration,
    suspicion: 0,
    cover: 0.2,
    over: false,
  };
  clock = new THREE.Clock();
  keys.clear();
  touchDir = { x: 0, z: 0 };
  running = true;
  unlockTableAudio();
  initColorWheel();
  applyBrushPreview();
  setPaintTool(null);
  speakLine("Esconda-se! O caçador está contando…", { excited: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  cleanupFns.push(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  });
  if (raf) cancelAnimationFrame(raf);
  tick();
}

export function openHideSeekMode(mapKey = "esconde") {
  activeVariant = VARIANTS[mapKey] ? mapKey : "esconde";
  const el = ensureShell();
  applyLobbyCopy();
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  el.querySelector("[data-lobby]").classList.remove("hidden");
  el.querySelector("[data-match]").classList.add("hidden");
  el.querySelector("[data-end]")?.classList.add("hidden");
  document.body.classList.add("cha-active");
  window.__strikeZoneOnMatchStart?.({ mapKey: activeVariant, gameMode: "hide-seek" });
}

export function closeHideSeekMode() {
  if (!shell) return;
  running = false;
  if (raf) cancelAnimationFrame(raf);
  flushCleanup();
  shell.classList.add("hidden");
  shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cha-active");
}

window.openHideSeekMode = openHideSeekMode;
window.closeHideSeekMode = closeHideSeekMode;

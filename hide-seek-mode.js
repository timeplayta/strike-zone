/** Esconde-Esconde clássico — esconda-se do caçador atrás dos obstáculos */

import * as THREE from "three";
import { buildChameleonArena } from "./chameleon-map.js";
import { buildHunter } from "./chameleon-animals.js";
import { attachOrbitDrag } from "./orbit-drag.js";
import { speakLine, unlockTableAudio } from "./table-games-audio.js";

const VARIANTS = {
  esconde: {
    title: "Esconde-Esconde",
    emoji: "🙈",
    desc: "O caçador conta até 15… depois te procura! Esconda-se atrás das jarras e patos. WASD anda pra onde a câmera aponta · arraste pra olhar · Shift corre.",
    duration: 90,
    countdown: 15,
    arenaSeed: 42,
    bg: 0x87b8e8,
    fog: 0x6a9cc8,
    hunterPatrol: 2.4,
    hunterChase: 4.1,
    visionRange: 13,
    playerColor: 0x4a90d9,
  },
  sombras: {
    title: "Sombras no Porão",
    emoji: "🔦",
    desc: "Porão escuro com poucas luzes. Fique nas sombras e longe da lanterna do caçador. WASD · arraste a câmera · Shift corre.",
    duration: 75,
    countdown: 12,
    arenaSeed: 88,
    bg: 0x0a0808,
    fog: 0x060404,
    hunterPatrol: 2.7,
    hunterChase: 4.6,
    visionRange: 9,
    playerColor: 0x6b5b95,
    dark: true,
  },
};

const CONE_COS = 0.52;
const CLOSE_RADIUS = 2.1;
const CATCH_RADIUS = 0.95;
const HUNTER_SCALE = 1.9;
const HUNTER_COLLIDE_R = 0.42;
const PLAYER_COLLIDE_R = 0.09;
const BASE_SPEED = 3.7;

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

function buildHiderMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.32, 4, 8), bodyMat);
  body.position.y = 0.34;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat);
  head.position.y = 0.6;
  g.add(head);
  return { group: g };
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

  hiderRig = buildHiderMesh(cfg.playerColor);
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
  };

  orbitPivot = new THREE.Object3D();
  orbitPivot.rotation.y = player.angle;
  attachOrbitDrag(canvas, () => orbitPivot, undefined, { invertYaw: true, sensitivity: 0.014 });

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
    const speed = BASE_SPEED * (player.crouching ? 0.55 : 1) * (isRunning ? 1.45 : 1);
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
  hiderRig.group.scale.y = player.crouching ? 0.82 : 1;
  hiderRig.group.position.y = -squat;

  const camDist = player.crouching ? 2.6 : 3.1;
  const camHeight = player.crouching ? 1.35 : 1.7;
  const desiredX = player.x - Math.sin(camYaw) * camDist;
  const desiredZ = player.z - Math.cos(camYaw) * camDist;
  camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 8);
  camera.position.z += (desiredZ - camera.position.z) * Math.min(1, dt * 8);
  camera.position.y += (camHeight - camera.position.y) * Math.min(1, dt * 8);
  camera.lookAt(player.x, player.crouching ? 0.22 : 0.35, player.z);
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
    if (dist > 14) {
      hunter.chaseLostT += dt;
      if (hunter.chaseLostT > 2.2) {
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
    if (!hunter.waypoint || Math.hypot(hunter.waypoint.x - hunter.x, hunter.waypoint.z - hunter.z) < 1) {
      hunter.waypoint = pickWaypoint();
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
      const proximity = Math.max(0, 1 - dist / cfg.visionRange);
      const expose = (1 - cover) + (player.isRunning ? 0.35 : 0);
      matchState.suspicion += 48 * proximity * expose * dt;
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

/** Esconde-Bicho — modo esconde-esconde: vire um bichinho, pinte sua cor e se camufle do caçador */

import * as THREE from "three";
import { buildChameleonAnimal, buildHunter, ANIMAL_TYPES, ANIMAL_META } from "./chameleon-animals.js";
import { buildChameleonArena } from "./chameleon-map.js";
import { attachOrbitDrag } from "./orbit-drag.js";
import { speakLine, unlockTableAudio } from "./table-games-audio.js";

const MATCH_DURATION = 100;
const VISION_RANGE = 12;
const CONE_COS = 0.5;
const CLOSE_RADIUS = 2.3;
const CATCH_RADIUS = 0.95;
const ANIMAL_SCALE = 0.19;
const HUNTER_SCALE = ANIMAL_SCALE * 10;
const HUNTER_COLLIDE_R = 0.42;
const BASE_SPEED = 3.6;
const HUNTER_PATROL_SPEED = 2.35;
const HUNTER_CHASE_SPEED = 4.4;

function $(id) {
  return document.getElementById(id);
}

let shell = null;
let renderer = null;
let scene = null;
let camera = null;
let raf = null;
let clock = null;
let orbitPivot = null;
let keys = new Set();
let touchDir = { x: 0, z: 0 };
let cleanupFns = [];

let chosenAnimal = "leao";
let running = false;

// Cor atual do bicho — começa branco, o jogador pinta DURANTE a partida
let currentHue = 0;
let currentSat = 0;
let currentLum = 0.95;

function currentColorHex() {
  const c = new THREE.Color();
  c.setHSL(currentHue, currentSat, currentLum);
  return c.getHex();
}

function ensureShell() {
  if (shell) return shell;
  shell = document.createElement("div");
  shell.id = "chaScreen";
  shell.className = "cha-screen hidden";
  shell.setAttribute("aria-hidden", "true");
  shell.innerHTML = `
    <div class="cha-lobby" data-lobby>
      <div class="cha-lobby-card">
        <p class="cha-eyebrow">Esconde-esconde</p>
        <h1 class="cha-title">🦎 Esconde-Bicho</h1>
        <p class="cha-desc">Escolha seu bichinho e entre na arena. Lá dentro, use o botão 🎨 pra pintar sua cor na hora — combine com o chão, as jarras e os patos pra sumir da vista do caçador. Arraste o mouse pra olhar · WASD anda pra onde a câmera aponta.</p>
        <h2 class="cha-sub">Seu bichinho</h2>
        <div class="cha-animal-grid" data-animals></div>
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
          <div class="cha-timer" data-timer>1:40</div>
          <button type="button" class="cha-exit-btn" data-exit>Sair</button>
        </div>
        <div class="cha-meters">
          <div class="cha-meter">
            <span class="cha-meter-label">Suspeita do caçador</span>
            <div class="cha-meter-bar"><div class="cha-meter-fill cha-meter-susp" data-susp></div></div>
          </div>
          <div class="cha-meter">
            <span class="cha-meter-label">Nível de luz</span>
            <div class="cha-meter-bar"><div class="cha-meter-fill cha-meter-light" data-light></div></div>
          </div>
        </div>
        <div class="cha-status" data-status>Combine sua cor com o chão pra se camuflar</div>
        <div class="cha-color-dock" data-color-dock>
          <div class="cha-color-panel hidden" data-color-panel>
            <canvas class="cha-wheel" data-wheel width="170" height="170"></canvas>
            <label class="cha-lum-label">Luminosidade</label>
            <input type="range" class="cha-lum-slider" data-lum min="8" max="95" value="95" />
            <div class="cha-color-preview-row">
              <span class="cha-color-preview" data-color-preview></span>
              <span class="cha-color-hint">Toque na roda pra escolher a cor</span>
            </div>
          </div>
          <button type="button" class="cha-color-btn" data-color-btn>🎨 Cores</button>
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
            <button type="button" class="cha-touch-btn cha-touch-wide" data-action="stick">🖐 Colar</button>
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

  const animalsEl = shell.querySelector("[data-animals]");
  animalsEl.innerHTML = ANIMAL_TYPES.map(
    (type) =>
      `<button type="button" class="cha-animal-card${type === chosenAnimal ? " selected" : ""}" data-animal="${type}">` +
      `<span class="cha-animal-emoji">${ANIMAL_META[type].emoji}</span>` +
      `<span class="cha-animal-name">${ANIMAL_META[type].label}</span>` +
      `<span class="cha-animal-hint">${ANIMAL_META[type].hp}</span>` +
      `</button>`
  ).join("");
  animalsEl.querySelectorAll("[data-animal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chosenAnimal = btn.dataset.animal;
      animalsEl.querySelectorAll(".cha-animal-card").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });

  initColorWheel();

  shell.querySelector("[data-back]").addEventListener("click", closeChameleonMode);
  shell.querySelector("[data-start]").addEventListener("click", startMatch);
  shell.querySelector("[data-exit]").addEventListener("click", closeChameleonMode);
  shell.querySelector("[data-end-exit]").addEventListener("click", closeChameleonMode);
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
  touchEl.querySelector('[data-action="stick"]').addEventListener("click", () => toggleStick());
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerdown", () => keys.add("run-touch"));
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerup", () => keys.delete("run-touch"));
  touchEl.querySelector('[data-action="run"]').addEventListener("pointerleave", () => keys.delete("run-touch"));

  return shell;
}

/** Aplica a cor escolhida no bicho e no estado do jogador, ao vivo */
function applyPlayerColor() {
  const hex = currentColorHex();
  if (animalRig) animalRig.setColor(hex);
  if (player) player.color = new THREE.Color(hex);
  const preview = shell?.querySelector("[data-color-preview]");
  if (preview) preview.style.background = `#${hex.toString(16).padStart(6, "0")}`;
}

/** Roda cromática: matiz no ângulo, saturação no raio; luminosidade no slider */
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

function initColorWheel() {
  const dock = shell.querySelector("[data-color-dock]");
  const btn = dock.querySelector("[data-color-btn]");
  const panel = dock.querySelector("[data-color-panel]");
  const wheel = dock.querySelector("[data-wheel]");
  const lum = dock.querySelector("[data-lum]");

  drawColorWheel(wheel);

  btn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

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
    applyPlayerColor();
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
    applyPlayerColor();
  });
}

let player = null;
let hunter = null;
let arena = null;
let animalRig = null;
let hunterRig = null;
let matchState = null;

function colorDistance(c1, c2) {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2) / Math.sqrt(3);
}

function toggleStick() {
  if (!matchState || matchState.over) return;
  if (player.stuck) {
    player.stuck = null;
    return;
  }
  const s = arena.findStickable(player.x, player.z);
  if (s) player.stuck = s;
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
  scene.background = new THREE.Color(0x0a0a12);
  scene.fog = new THREE.Fog(0x0a0a12, 14, 34);

  camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const hemi = new THREE.HemisphereLight(0x8fa0ff, 0x1a1410, 0.4);
  scene.add(hemi);

  arena = buildChameleonArena(Math.floor(Math.random() * 99999) + 1);
  scene.add(arena.group);

  const colorHex = currentColorHex();
  animalRig = buildChameleonAnimal(chosenAnimal, colorHex);
  animalRig.group.scale.setScalar(ANIMAL_SCALE);
  scene.add(animalRig.group);

  hunterRig = buildHunter();
  hunterRig.group.scale.setScalar(HUNTER_SCALE);
  scene.add(hunterRig.group);

  player = {
    x: arena.spawnPlayer.x,
    z: arena.spawnPlayer.z,
    angle: Math.PI,
    color: new THREE.Color(colorHex),
    stuck: null,
  };
  hunter = {
    x: arena.spawnHunter.x,
    z: arena.spawnHunter.z,
    angle: 0,
    state: "patrol",
    waypoint: null,
    chaseLostT: 0,
  };

  orbitPivot = new THREE.Object3D();
  // Yaw absoluto da câmera (independente do corpo do bicho)
  orbitPivot.rotation.y = player.angle;
  // invertYaw: arrastar pra esquerda olha pra esquerda (não espelhado)
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

function animateLegs(legs, moveAmount, t, freeze) {
  if (!legs?.length) return;
  legs.forEach((leg, i) => {
    const phase = i % 2 === 0 ? 0 : Math.PI;
    const extra = i >= 2 ? 0.3 : 0;
    const amp = freeze ? 0 : Math.min(0.55, 0.15 + moveAmount * 0.9);
    leg.rotation.x = Math.sin(t * 7 + phase + extra) * amp;
  });
}

const PLAYER_COLLIDE_R = 0.09;

function updatePlayer(dt, t) {
  // Eixos da tela: Z frente/trás, X strafe — relativo à câmera, não ao corpo
  let inputX = touchDir.x;
  let inputZ = -touchDir.z;
  if (keys.has("KeyW") || keys.has("ArrowUp")) inputZ += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) inputZ -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) inputX -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) inputX += 1;
  inputX = Math.max(-1, Math.min(1, inputX));
  inputZ = Math.max(-1, Math.min(1, inputZ));
  const isRunning = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("run-touch");

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
  if (moveLen > 0.001 && !player.stuck) {
    const speed = BASE_SPEED * ANIMAL_META[chosenAnimal].speed * (isRunning ? 1.55 : 1);
    const nx = player.x + moveX * speed * dt;
    const nz = player.z + moveZ * speed * dt;
    const resolved = arena.resolveCollision(nx, nz, PLAYER_COLLIDE_R);
    player.x = resolved.x;
    player.z = resolved.z;
    player.angle = Math.atan2(moveX, moveZ);
    moveAmount = speed / (BASE_SPEED * 1.6);
    player.stuck = null;
  }

  player.isRunning = isRunning && moveAmount > 0;

  animalRig.group.position.set(player.x, 0, player.z);
  animalRig.group.rotation.y = player.angle;
  animateLegs(animalRig.legs, moveAmount, t, !!player.stuck);
  if (animalRig.headGroup) animalRig.headGroup.rotation.z = Math.sin(t * 1.4) * 0.05;
  if (animalRig.trunk) animalRig.trunk.rotation.x = Math.sin(t * 1.8) * 0.12 - 0.1;

  const camDist = 3.1;
  const camHeight = 1.7;
  const desiredX = player.x - Math.sin(camYaw) * camDist;
  const desiredZ = player.z - Math.cos(camYaw) * camDist;
  const desiredY = camHeight;
  camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 8);
  camera.position.z += (desiredZ - camera.position.z) * Math.min(1, dt * 8);
  camera.position.y += (desiredY - camera.position.y) * Math.min(1, dt * 8);
  camera.lookAt(player.x, 0.35, player.z);
}

function updateHunter(dt, t) {
  if (hunter.state === "chase") {
    const dx = player.x - hunter.x;
    const dz = player.z - hunter.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.01) {
      hunter.angle = Math.atan2(dx, dz);
    }
    const nx = hunter.x + Math.sin(hunter.angle) * HUNTER_CHASE_SPEED * dt;
    const nz = hunter.z + Math.cos(hunter.angle) * HUNTER_CHASE_SPEED * dt;
    const resolved = arena.resolveCollision(nx, nz, HUNTER_COLLIDE_R);
    hunter.x = resolved.x;
    hunter.z = resolved.z;
    if (dist > 15) {
      hunter.chaseLostT += dt;
      if (hunter.chaseLostT > 2.5) {
        hunter.state = "patrol";
        hunter.waypoint = null;
        matchState.suspicion = 35;
      }
    } else {
      hunter.chaseLostT = 0;
    }
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
      const nx = hunter.x + Math.sin(hunter.angle) * HUNTER_PATROL_SPEED * dt;
      const nz = hunter.z + Math.cos(hunter.angle) * HUNTER_PATROL_SPEED * dt;
      const resolved = arena.resolveCollision(nx, nz, HUNTER_COLLIDE_R);
      hunter.x = resolved.x;
      hunter.z = resolved.z;
    }
  }

  hunterRig.group.position.set(hunter.x, 0, hunter.z);
  hunterRig.group.rotation.y = hunter.angle;
  animateLegs(hunterRig.legs, hunter.state === "chase" ? 1 : 0.5, t, false);

  // ---- Detecção por contraste de cor + luz + distância ----
  const dist = Math.hypot(player.x - hunter.x, player.z - hunter.z);
  const groundColor = player.stuck ? player.stuck.color : arena.colorAt(player.x, player.z);
  const colorSim = 1 - colorDistance(player.color, groundColor);
  const light = arena.lightAt(player.x, player.z);
  let concealment = colorSim * 0.55 + (1 - light) * 0.28 + (player.stuck ? 0.28 : 0) - (player.isRunning ? 0.3 : 0);
  concealment = Math.max(0, Math.min(1, concealment));
  matchState.concealment = concealment;
  matchState.light = light;

  if (hunter.state === "patrol") {
    const toPlayer = Math.atan2(player.x - hunter.x, player.z - hunter.z);
    // cos() é periódico e par, então funciona direto na diferença "crua" sem normalizar o ângulo
    const inCone = Math.cos(toPlayer - hunter.angle) > CONE_COS;
    const spotted = dist < VISION_RANGE && (inCone || dist < CLOSE_RADIUS);
    if (spotted) {
      const proximity = Math.max(0, 1 - dist / VISION_RANGE);
      matchState.suspicion += 52 * proximity * (1 - concealment) * dt;
      if (matchState.suspicion >= 100 && hunter.state !== "chase") {
        hunter.state = "chase";
        hunter.chaseLostT = 0;
        speakLine("Ele te viu! Corre!", { excited: true });
      }
    } else {
      matchState.suspicion -= 20 * dt;
    }
  }
  matchState.suspicion = Math.max(0, Math.min(100, matchState.suspicion));
}

function updateHud() {
  const susp = shell.querySelector("[data-susp]");
  const light = shell.querySelector("[data-light]");
  const status = shell.querySelector("[data-status]");
  const timer = shell.querySelector("[data-timer]");
  if (susp) {
    susp.style.width = `${matchState.suspicion}%`;
    susp.classList.toggle("cha-meter-danger", matchState.suspicion > 65);
  }
  if (light) light.style.width = `${(matchState.light ?? 0.3) * 100}%`;
  if (timer) {
    const s = Math.max(0, Math.ceil(matchState.timeLeft));
    timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  if (status) {
    if (player.stuck) status.textContent = "Colado — bem escondido enquanto não se mover";
    else if (matchState.concealment > 0.7) status.textContent = "Camuflagem excelente!";
    else if (matchState.concealment > 0.4) status.textContent = "Camuflagem razoável — cuidado";
    else status.textContent = "Exposto! Combine sua cor com o ambiente ou se esconda";
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
    desc.textContent = "Sobreviveu até o fim sem ser pego pelo caçador.";
    speakLine("Você escapou! Muito bem camuflado.", { excited: true });
  } else {
    title.textContent = "O caçador te achou!";
    desc.textContent = "Tente combinar melhor sua cor com o ambiente da próxima vez.";
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
    updatePlayer(dt, t);
    updateHunter(dt, t);
    matchState.timeLeft -= dt;
    if (matchState.timeLeft <= 0) {
      endMatch(true);
    }
    updateHud();
  }
  renderer.render(scene, camera);
}

function onKeyDown(e) {
  if (["Space", "KeyE"].includes(e.code)) {
    e.preventDefault();
    toggleStick();
    return;
  }
  keys.add(e.code);
}
function onKeyUp(e) {
  keys.delete(e.code);
}

function startMatch() {
  shell.querySelector("[data-lobby]").classList.add("hidden");
  const matchEl = shell.querySelector("[data-match]");
  matchEl.classList.remove("hidden");
  const canvas = shell.querySelector("[data-canvas]");

  // Bicho sempre entra branco — pinta durante a partida com o botão 🎨
  currentHue = 0;
  currentSat = 0;
  currentLum = 0.95;
  const lumSlider = shell.querySelector("[data-lum]");
  if (lumSlider) lumSlider.value = "95";
  shell.querySelector("[data-color-panel]")?.classList.add("hidden");

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  setupScene(canvas);
  applyPlayerColor();

  matchState = { timeLeft: MATCH_DURATION, suspicion: 0, concealment: 0.3, light: 0.3, over: false };
  clock = new THREE.Clock();
  keys.clear();
  touchDir = { x: 0, z: 0 };
  running = true;
  unlockTableAudio();
  speakLine("Se esconda! Pinte sua cor com o botão de cores e engane o caçador.", { excited: true });
  if (raf) cancelAnimationFrame(raf);
  tick();
}

export function openChameleonMode() {
  const el = ensureShell();
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  el.querySelector("[data-lobby]").classList.remove("hidden");
  el.querySelector("[data-match]").classList.add("hidden");
  el.querySelector("[data-end]").classList.add("hidden");
  document.getElementById("menu")?.classList.add("hidden");
  document.body.classList.add("cha-open");
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  try {
    window.__strikeZoneOnMatchStart?.({ mapKey: "camaleao", gameMode: "chameleon" });
  } catch {
    /* tutorial opcional */
  }
  return true;
}

export function closeChameleonMode() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  keys.clear();
  flushCleanup();
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  disposeScene(scene);
  scene = null;
  if (shell) {
    shell.classList.add("hidden");
    shell.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("cha-open");
  document.getElementById("menu")?.classList.remove("hidden");
  try {
    window.__strikeZoneOnTableGamesClose?.();
  } catch {
    /* tutorial opcional */
  }
}

window.openChameleonMode = openChameleonMode;
window.closeChameleonMode = closeChameleonMode;

import * as THREE from "three";
import { createHostage, createPhysicsParticles, updatePhysicsParticles } from "./characters.js";

let cinematicActive = false;
let cinematicParticles = [];
let cinematicHostages = [];
let onCinematicEnd = null;
let cinematicTickId = null;
let skipCinematicHandler = null;

export function isCinematicActive() {
  return cinematicActive;
}

function stopCinematic(scene) {
  cinematicActive = false;
  if (cinematicTickId) cancelAnimationFrame(cinematicTickId);
  cinematicTickId = null;
  cinematicParticles.forEach((p) => scene.remove(p));
  cinematicParticles = [];
  cinematicHostages.forEach((h) => scene.remove(h.mesh));
  cinematicHostages = [];
  const skipBtn = document.getElementById("skipCinematicBtn");
  if (skipBtn && skipCinematicHandler) {
    skipBtn.removeEventListener("click", skipCinematicHandler);
    skipCinematicHandler = null;
  }
  if (onCinematicEnd) {
    const cb = onCinematicEnd;
    onCinematicEnd = null;
    cb();
  }
}

function bindSkip(scene) {
  const skipBtn = document.getElementById("skipCinematicBtn");
  if (!skipBtn) return;
  skipBtn.classList.remove("hidden");
  skipCinematicHandler = () => stopCinematic(scene);
  skipBtn.addEventListener("click", skipCinematicHandler);
}

function unbindSkip() {
  const skipBtn = document.getElementById("skipCinematicBtn");
  if (skipBtn && skipCinematicHandler) {
    skipBtn.removeEventListener("click", skipCinematicHandler);
    skipCinematicHandler = null;
  }
  skipBtn?.classList.add("hidden");
}

function showCinematicLine(cinematicEl, subtitleEl, title, sub, badge = "") {
  if (cinematicEl) {
    cinematicEl.classList.remove("hidden");
    const t = cinematicEl.querySelector(".cinematic-title");
    const s = cinematicEl.querySelector(".cinematic-sub");
    const b = cinematicEl.querySelector(".cinematic-badge");
    if (t) t.textContent = title;
    if (s) s.textContent = sub;
    if (b) b.textContent = badge;
  }
  if (subtitleEl) subtitleEl.textContent = sub || title;
}

function flashScene(scene, color) {
  const orig = scene.background?.clone?.() || scene.background;
  scene.background = new THREE.Color(color);
  setTimeout(() => {
    if (orig instanceof THREE.Color) scene.background = orig;
    else scene.background = orig;
  }, 200);
}

/** Derrota: bandidos comemoram com colisão nas paredes */
export function playDefeatCinematic({
  scene,
  camera,
  enemies,
  playerName,
  mapCenter,
  subtitleEl,
  cinematicEl,
  moveWithCollision,
  getCelebrateTarget,
  callback,
}) {
  cinematicActive = true;
  onCinematicEnd = callback;
  cinematicParticles = [];
  cinematicHostages = [];

  const celebrateTargets = enemies.filter((e) => e.group && !e.isBoss);
  const pool = celebrateTargets.length ? celebrateTargets : enemies.filter((e) => e.group);

  const cx = mapCenter?.x ?? 0;
  const cz = mapCenter?.z ?? 0;

  pool.forEach((e, i) => {
    e.group.visible = true;
    e.group.position.y = 0;
    if (getCelebrateTarget) {
      e.celebrateTarget = getCelebrateTarget(i);
    } else {
      const ang = (i / Math.max(1, pool.length)) * Math.PI * 2;
      e.celebrateTarget = {
        x: cx + Math.cos(ang) * (4 + (i % 3) * 2),
        z: cz + Math.sin(ang) * (4 + (i % 3) * 2),
      };
    }
    e.celebratePhase = i * 0.3;
  });

  bindSkip(scene);
  showCinematicLine(cinematicEl, subtitleEl, "DERROTA", `${playerName} foi eliminado`, "FIM DE PARTIDA");

  setTimeout(() => {
    cinematicParticles.push(
      ...createPhysicsParticles(scene, new THREE.Vector3(cx, 1, cz), 60, 0xff4400, 12)
    );
    flashScene(scene, 0xff4400);
  }, 800);

  setTimeout(() => {
    showCinematicLine(
      cinematicEl,
      subtitleEl,
      "Os bandidos venceram",
      "Eles comemoram no mapa — mas não atravessam paredes."
    );
  }, 2000);

  let t = 0;
  const duration = 5.5;
  let last = performance.now();

  function tick(now) {
    if (!cinematicActive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    updatePhysicsParticles(cinematicParticles, dt, scene);

    pool.forEach((e) => {
      if (!e.group || !e.celebrateTarget) return;
      e.celebratePhase = (e.celebratePhase || 0) + dt * 7;
      e.group.position.y = Math.abs(Math.sin(e.celebratePhase)) * 0.25;

      const distT = Math.hypot(
        e.celebrateTarget.x - e.group.position.x,
        e.celebrateTarget.z - e.group.position.z
      );
      if (distT > 0.35 && moveWithCollision) {
        moveWithCollision(
          e.group,
          e.celebrateTarget.x,
          e.celebrateTarget.z,
          Math.min(2.4, distT) * dt * 2.2,
          "npc"
        );
      }
      e.group.rotation.y += dt * 2.2;
    });

    const angle = t * 0.4;
    camera.position.x = cx + Math.sin(angle) * 16;
    camera.position.z = cz + Math.cos(angle) * 16;
    camera.position.y = 4.5 + Math.sin(t * 0.7) * 0.4;
    camera.lookAt(cx, 1.3, cz);

    if (t >= duration) {
      unbindSkip();
      stopCinematic(scene);
    } else {
      cinematicTickId = requestAnimationFrame(tick);
    }
  }
  cinematicTickId = requestAnimationFrame(tick);
}

/** Vitória: reféns correm para saída com colisão */
export function playVictoryCinematic({
  scene,
  camera,
  playerName,
  exitPoint,
  subtitleEl,
  cinematicEl,
  moveWithCollision,
  getWalkableNear,
  callback,
}) {
  cinematicActive = true;
  onCinematicEnd = callback;
  cinematicHostages = [];
  cinematicParticles = [];

  const ex = exitPoint?.x ?? 0;
  const ez = exitPoint?.z ?? -18;

  for (let i = 0; i < 5; i++) {
    const h = createHostage(i);
    const spawn = getWalkableNear?.(ex + (i - 2) * 2, ez + 6) ?? { x: ex + (i - 2) * 2, z: ez + 6 };
    const target = getWalkableNear?.(ex + (i - 2) * 1.2, ez) ?? { x: ex + (i - 2) * 1.2, z: ez };
    h.position.set(spawn.x, 0, spawn.z);
    scene.add(h);
    cinematicHostages.push({
      mesh: h,
      target: new THREE.Vector3(target.x, 0, target.z),
      speed: 2.2 + Math.random() * 0.8,
      thanked: false,
    });
  }

  bindSkip(scene);
  showCinematicLine(cinematicEl, subtitleEl, "VITÓRIA!", "Os reféns correm para a saída em segurança", "MISSÃO CUMPRIDA");

  const messages = [
    "Socorro! Estamos livres!",
    "Obrigado pela sua ajuda!",
    `Você salvou a todos, ${playerName}!`,
    "Finalmente podemos ir para casa!",
  ];
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    if (!cinematicActive) {
      clearInterval(msgInterval);
      return;
    }
    if (msgIndex < messages.length) {
      showCinematicLine(cinematicEl, subtitleEl, messages[msgIndex], "Todos celebram a liberdade", "VITÓRIA");
      msgIndex++;
    }
  }, 1600);

  let t = 0;
  const duration = 6.5;
  let last = performance.now();

  function tick(now) {
    if (!cinematicActive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    updatePhysicsParticles(cinematicParticles, dt, scene);

    cinematicHostages.forEach((h, i) => {
      const dist = Math.hypot(h.target.x - h.mesh.position.x, h.target.z - h.mesh.position.z);
      if (dist > 0.2) {
        if (moveWithCollision) {
          moveWithCollision(h.mesh, h.target.x, h.target.z, h.speed * dt, "npc");
        } else {
          const dir = new THREE.Vector3().subVectors(h.target, h.mesh.position).normalize();
          h.mesh.position.addScaledVector(dir, h.speed * dt);
        }
        h.mesh.lookAt(h.target.x, h.mesh.position.y, h.target.z);
        h.mesh.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.06;
      } else if (!h.thanked) {
        h.thanked = true;
        h.mesh.rotation.z = Math.sin(t * 12) * 0.08;
      }
    });

    const cx = (ex + (cinematicHostages[2]?.mesh.position.x ?? ex)) / 2;
    const cz = (ez + (cinematicHostages[2]?.mesh.position.z ?? ez)) / 2;
    camera.position.lerp(new THREE.Vector3(cx - 7, 4, cz + 12), dt * 1.5);
    camera.lookAt(cx, 1.2, cz);

    if (t >= duration) {
      clearInterval(msgInterval);
      unbindSkip();
      stopCinematic(scene);
    } else {
      cinematicTickId = requestAnimationFrame(tick);
    }
  }
  cinematicTickId = requestAnimationFrame(tick);
}

/** Morte do jogador — não usado se tela de escolha ativa */
export function playPlayerDeathCinematic({ cinematicEl, callback }) {
  cinematicActive = true;
  onCinematicEnd = callback;
  showCinematicLine(cinematicEl, null, "Eliminado", "");
  setTimeout(() => {
    cinematicActive = false;
    if (onCinematicEnd) onCinematicEnd();
  }, 100);
}

export function hideCinematicUI(cinematicEl) {
  cinematicEl?.classList.add("hidden");
  unbindSkip();
}

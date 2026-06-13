import * as THREE from "three";

/** Barras de vida sobre inimigos e números de dano flutuantes */

const damageNumbers = [];
let labelsContainer = null;

export function initFloatingUI() {
  labelsContainer = document.getElementById("worldLabels");
  if (!labelsContainer) {
    labelsContainer = document.createElement("div");
    labelsContainer.id = "worldLabels";
    document.body.appendChild(labelsContainer);
  }
}

export function createEnemyHealthBar(enemy) {
  const wrap = document.createElement("div");
  wrap.className = "enemy-hp-wrap";
  wrap.style.display = "none"; // só aparece quando o inimigo é atingido
  const bar = document.createElement("div");
  bar.className = "enemy-hp-bar";
  const fill = document.createElement("div");
  fill.className = "enemy-hp-fill";
  const text = document.createElement("span");
  text.className = "enemy-hp-text";
  bar.appendChild(fill);
  wrap.appendChild(bar);
  wrap.appendChild(text);
  labelsContainer.appendChild(wrap);
  enemy.hpBarEl = wrap;
  enemy.hpFillEl = fill;
  enemy.hpTextEl = text;
  updateEnemyHealthBar(enemy);
}

/** Mantém a barra visível por `ms` após levar dano */
export function revealHealthBar(enemy, ms = 2000) {
  enemy.hpVisibleUntil = performance.now() + ms;
}

export function updateEnemyHealthBar(enemy) {
  if (!enemy.hpFillEl || !enemy.alive) {
    if (enemy.hpBarEl) enemy.hpBarEl.style.display = "none";
    return;
  }
  const pct = Math.max(0, (enemy.health / enemy.maxHealth) * 100);
  enemy.hpFillEl.style.width = `${pct}%`;
  enemy.hpTextEl.textContent = `${Math.ceil(enemy.health)} HP`;
  if (pct < 30) enemy.hpFillEl.style.background = "#cc2222";
  else if (pct < 60) enemy.hpFillEl.style.background = "#ccaa22";
  else enemy.hpFillEl.style.background = "#44cc44";
}

export function projectToScreen(pos, camera) {
  const v = pos.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    visible: v.z > -1 && v.z < 1,
  };
}

export function updateEnemyLabels(enemies, camera) {
  const now = performance.now();
  for (const e of enemies) {
    if (!e.hpBarEl) continue;
    if (!e.alive) {
      e.hpBarEl.style.display = "none";
      continue;
    }
    // inimigos: barra só visível por um tempo após levar tiro; aliados sempre visíveis
    const show = e.alwaysShowHp || (e.hpVisibleUntil && now < e.hpVisibleUntil);
    if (!show) {
      e.hpBarEl.style.display = "none";
      continue;
    }
    const headPos = e.group.position.clone();
    headPos.y += 1.75;
    const s = projectToScreen(headPos, camera);
    if (!s.visible) {
      e.hpBarEl.style.display = "none";
      continue;
    }
    e.hpBarEl.style.display = "flex";
    e.hpBarEl.style.left = `${s.x}px`;
    e.hpBarEl.style.top = `${s.y}px`;
    updateEnemyHealthBar(e);
  }
}

export function showDamageNumber(amount, worldPos, camera, headshot = false) {
  const s = projectToScreen(worldPos.clone().add(new THREE.Vector3(0, 0.3, 0)), camera);
  if (!s.visible) return;

  const el = document.createElement("div");
  el.className = "damage-number" + (headshot ? " damage-hs" : "");
  el.textContent = `-${Math.round(amount)}`;
  el.style.left = `${s.x + (Math.random() - 0.5) * 30}px`;
  el.style.top = `${s.y}px`;
  labelsContainer.appendChild(el);

  setTimeout(() => el.remove(), 900);
}

export function removeEnemyLabel(enemy) {
  if (enemy.hpBarEl) {
    enemy.hpBarEl.remove();
    enemy.hpBarEl = null;
  }
}

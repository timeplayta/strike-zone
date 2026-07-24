/** Quadro de desenho do John Cravóixq — a arte vira o projétil do ataque especial (tecla T) */

import { getLoggedInName } from "./player-account.js";

const SIZE = 256;
let modal = null;
let ctx = null;
let drawing = false;
let lastX = 0;
let lastY = 0;
let brushColor = "#e63946";
let brushSize = 6;
let textureCache = null;
let textureCacheKey = null;

function storageKey() {
  const name = getLoggedInName() || "guest";
  return `sz_john_art_${name}`;
}

export function getSavedArtDataUrl() {
  try {
    return localStorage.getItem(storageKey());
  } catch {
    return null;
  }
}

function saveArtDataUrl(dataUrl) {
  try {
    localStorage.setItem(storageKey(), dataUrl);
  } catch {
    /* localStorage indisponível */
  }
}

export function hasSavedArt() {
  return !!getSavedArtDataUrl();
}

/** THREE.Texture (via callback pra não depender de import estático de three aqui) */
export function getArtTextureDataUrl() {
  const url = getSavedArtDataUrl();
  if (url && url === textureCacheKey) return textureCache;
  textureCacheKey = url;
  textureCache = url;
  return url;
}

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "johnArtModal";
  modal.className = "john-art-modal hidden";
  modal.innerHTML = `
    <div class="john-art-card">
      <h3 class="john-art-title">🎨 Desenhe sua arte — John Cravóixq</h3>
      <p class="john-art-desc">Esse desenho vira o projétil do seu ataque especial (tecla T em partida). Dá 150 de dano e gruda na parede se não acertar ninguém.</p>
      <canvas id="johnArtCanvas" class="john-art-canvas" width="${SIZE}" height="${SIZE}"></canvas>
      <div class="john-art-tools">
        <div class="john-art-colors" data-colors></div>
        <div class="john-art-sizes" data-sizes></div>
        <button type="button" class="tg-btn tg-btn-ghost" data-clear>Limpar</button>
      </div>
      <div class="john-art-actions">
        <button type="button" class="tg-btn tg-btn-ghost" data-close>Fechar</button>
        <button type="button" class="tg-btn tg-btn-primary" data-save>Salvar arte</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = modal.querySelector("#johnArtCanvas");
  ctx = canvas.getContext("2d");
  clearCanvas();

  const colors = ["#e63946", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1a1a1a", "#ffffff", "#ff8c42"];
  const colorsEl = modal.querySelector("[data-colors]");
  colorsEl.innerHTML = colors
    .map((c, i) => `<button type="button" class="john-art-swatch${i === 0 ? " selected" : ""}" data-color="${c}" style="background:${c}"></button>`)
    .join("");
  colorsEl.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      brushColor = btn.dataset.color;
      colorsEl.querySelectorAll(".john-art-swatch").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });

  const sizes = [3, 6, 12, 20];
  const sizesEl = modal.querySelector("[data-sizes]");
  sizesEl.innerHTML = sizes
    .map((s, i) => `<button type="button" class="john-art-size${i === 1 ? " selected" : ""}" data-size="${s}">●</button>`)
    .join("");
  sizesEl.querySelectorAll("[data-size]").forEach((btn, i) => {
    btn.style.fontSize = `${8 + i * 5}px`;
    btn.addEventListener("click", () => {
      brushSize = Number(btn.dataset.size);
      sizesEl.querySelectorAll(".john-art-size").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });

  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: (cx / rect.width) * SIZE, y: (cy / rect.height) * SIZE };
  };
  const start = (e) => {
    e.preventDefault();
    drawing = true;
    const p = pos(e);
    lastX = p.x;
    lastY = p.y;
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
  };
  const end = () => {
    drawing = false;
  };
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  modal.querySelector("[data-clear]").addEventListener("click", clearCanvas);
  modal.querySelector("[data-close]").addEventListener("click", closeArtDrawingModal);
  modal.querySelector("[data-save]").addEventListener("click", () => {
    saveArtDataUrl(canvas.toDataURL("image/png"));
    const desc = modal.querySelector(".john-art-desc");
    if (desc) {
      const old = desc.textContent;
      desc.textContent = "Arte salva! Já pode usar no jogo com a tecla T.";
      setTimeout(() => {
        desc.textContent = old;
      }, 2200);
    }
  });

  return modal;
}

function clearCanvas() {
  if (!ctx) return;
  ctx.fillStyle = "#0e0e14";
  ctx.fillRect(0, 0, SIZE, SIZE);
}

export function openArtDrawingModal() {
  const el = ensureModal();
  el.classList.remove("hidden");
  const saved = getSavedArtDataUrl();
  if (saved) {
    const img = new Image();
    img.onload = () => {
      clearCanvas();
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    };
    img.src = saved;
  }
}

export function closeArtDrawingModal() {
  modal?.classList.add("hidden");
}

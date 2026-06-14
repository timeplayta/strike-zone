/** Posters estilo loading screen para cards de mapa */

const W = 640;
const H = 360;
const cache = new Map();

function sky(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.62);
}

function ground(ctx, color, y = H * 0.58) {
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, color);
  g.addColorStop(1, "#0a0c10");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H - y);
}

function block(ctx, x, y, w, h, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

function sun(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
}

function runner(ctx, x, y, scale = 1, color = "#111820", glow = "rgba(255,255,255,0.18)") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-30, 35);
  ctx.lineTo(2, 8);
  ctx.lineTo(36, 34);
  ctx.moveTo(0, 10);
  ctx.lineTo(-20, 68);
  ctx.moveTo(2, 10);
  ctx.lineTo(38, 70);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-30, 35);
  ctx.lineTo(2, 8);
  ctx.lineTo(36, 34);
  ctx.moveTo(0, 10);
  ctx.lineTo(-20, 68);
  ctx.moveTo(2, 10);
  ctx.lineTo(38, 70);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -12, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function monster(ctx, x, y, scale = 1, color = "rgba(0,0,0,0.78)", eye = "#ff5533") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 18, 54, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-52, 16);
  ctx.lineTo(-108, -22);
  ctx.lineTo(-76, 36);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52, 16);
  ctx.lineTo(108, -18);
  ctx.lineTo(76, 40);
  ctx.fill();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(-16, -8, 5, 0, Math.PI * 2);
  ctx.arc(16, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fog(ctx, color, y) {
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, "transparent");
  g.addColorStop(0.4, color);
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H - y);
}

function drawDust(ctx) {
  sky(ctx, "#6eb8ff", "#f4c078");
  sun(ctx, W * 0.78, H * 0.18, 48, "#ffe8a0");
  ground(ctx, "#c99852", H * 0.55);
  block(ctx, 40, 120, 90, 140, "#8a6a42", 0.95);
  block(ctx, 150, 95, 110, 165, "#6d5238");
  block(ctx, 290, 110, 80, 150, "#7a5c3a");
  block(ctx, 390, 85, 130, 175, "#5c4530");
  block(ctx, 520, 130, 95, 130, "#8a6844", 0.85);
  block(ctx, 0, 200, W, 18, "#a07848", 0.5);
  ctx.fillStyle = "rgba(255,220,160,0.15)";
  ctx.fillRect(0, H * 0.54, W, 40);
  runner(ctx, 250, 212, 0.74, "#142132", "rgba(255,210,120,0.22)");
}

function drawWarehouse(ctx) {
  sky(ctx, "#1a2838", "#3a5068");
  ground(ctx, "#2a3440", H * 0.52);
  block(ctx, 0, 70, W, 40, "#4a5868", 0.35);
  for (let i = 0; i < 8; i++) {
    block(ctx, 30 + i * 74, 110, 58, 170, i % 2 ? "#3d4a58" : "#485666");
    ctx.fillStyle = "#6a8098";
    ctx.fillRect(42 + i * 74, 130, 34, 8);
    ctx.fillRect(42 + i * 74, 160, 34, 8);
  }
  block(ctx, 0, 250, W, 110, "#1e2630");
  ctx.fillStyle = "rgba(120,180,255,0.12)";
  ctx.fillRect(0, 0, W, H);
  runner(ctx, 320, 210, 0.78, "#0c1118", "rgba(120,180,255,0.22)");
  fog(ctx, "rgba(20,30,45,0.55)", H * 0.48);
}

function drawHorror(ctx) {
  sky(ctx, "#120818", "#2a1020");
  ground(ctx, "#1a1018", H * 0.5);
  sun(ctx, W * 0.2, H * 0.22, 36, "#aa2244");
  block(ctx, 60, 100, 120, 180, "#181018");
  block(ctx, 220, 80, 160, 200, "#120c14");
  block(ctx, 420, 110, 140, 170, "#1a1218");
  monster(ctx, 505, 168, 0.78, "rgba(0,0,0,0.82)", "#ff3355");
  runner(ctx, 290, 218, 0.72, "#0b0b10", "rgba(255,80,100,0.2)");
  ctx.fillStyle = "rgba(180,40,60,0.25)";
  ctx.fillRect(0, H * 0.35, W, H * 0.65);
  fog(ctx, "rgba(40,10,30,0.72)", H * 0.42);
  ctx.fillStyle = "rgba(255,60,80,0.08)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(80 + i * 95, H * 0.72, 18 + (i % 3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLabyrinth(ctx) {
  sky(ctx, "#050508", "#120818");
  ground(ctx, "#0c0a10", H * 0.48);
  const cell = 34;
  ctx.strokeStyle = "rgba(80,200,120,0.35)";
  ctx.lineWidth = 3;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 12; col++) {
      if ((row + col) % 3 === 0) continue;
      ctx.strokeRect(28 + col * cell, 90 + row * cell, cell - 4, cell - 4);
    }
  }
  monster(ctx, 470, 170, 0.95, "rgba(0,0,0,0.86)", "#44ff88");
  runner(ctx, 250, 224, 0.78, "#06070a", "rgba(68,255,136,0.24)");
  sun(ctx, W * 0.5, H * 0.35, 55, "rgba(68,255,136,0.4)");
  fog(ctx, "rgba(10,5,15,0.8)", H * 0.38);
  ctx.fillStyle = "rgba(255,120,40,0.18)";
  ctx.fillRect(W * 0.35, H * 0.55, W * 0.3, 40);
}

function drawFrontier(ctx) {
  sky(ctx, "#7ed7ff", "#d7f2ff");
  sun(ctx, W * 0.76, H * 0.16, 54, "rgba(255,235,160,0.95)");
  ground(ctx, "#5fa84b", H * 0.5);
  ctx.fillStyle = "#2b72b8";
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.66, W * 0.46, H * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6fb25a";
  ctx.beginPath();
  ctx.ellipse(W * 0.48, H * 0.63, W * 0.37, H * 0.2, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.78)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(170, 230);
  ctx.bezierCurveTo(240, 190, 295, 245, 365, 200);
  ctx.bezierCurveTo(420, 165, 480, 188, 530, 145);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.strokeRect(145 + (i % 3) * 34, 196 + Math.floor(i / 3) * 22, 18, 12);
    ctx.strokeRect(410 + (i % 3) * 30, 225 + Math.floor(i / 3) * 20, 16, 11);
  }
  ctx.fillStyle = "rgba(70,70,65,0.72)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(22 + i * 70, 186);
    ctx.lineTo(58 + i * 70, 80 + (i % 3) * 24);
    ctx.lineTo(96 + i * 70, 186);
    ctx.closePath();
    ctx.fill();
  }
  runner(ctx, 315, 234, 0.72, "#111820", "rgba(255,255,255,0.22)");
}

const DRAWERS = {
  dust: drawDust,
  warehouse: drawWarehouse,
  horror: drawHorror,
  labyrinth: drawLabyrinth,
  frontier: drawFrontier,
};

export function getMapCardArtUrl(mapId) {
  if (cache.has(mapId)) return cache.get(mapId);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  (DRAWERS[mapId] || drawDust)(ctx);
  const url = canvas.toDataURL("image/jpeg", 0.88);
  cache.set(mapId, url);
  return url;
}

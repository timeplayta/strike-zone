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
  sky(ctx, "#6ec8ff", "#cceeff");
  sun(ctx, W * 0.78, H * 0.14, 58, "rgba(255,230,150,0.95)");
  ground(ctx, "#5f9a48", H * 0.48);
  ctx.fillStyle = "#c9ad72";
  ctx.beginPath();
  ctx.ellipse(W * 0.32, H * 0.58, W * 0.22, H * 0.14, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a7a38";
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.62, W * 0.2, H * 0.16, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e6a9e";
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.7, W * 0.48, H * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6fb25a";
  ctx.beginPath();
  ctx.ellipse(W * 0.48, H * 0.64, W * 0.34, H * 0.18, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,70,40,0.65)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(120, 250);
  ctx.lineTo(280, 210);
  ctx.lineTo(420, 240);
  ctx.lineTo(540, 180);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(248 + (i % 3) * 28, 198 + Math.floor(i / 3) * 18, 14, 10);
  }
  ctx.fillStyle = "rgba(70,65,55,0.75)";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(18 + i * 88, 188);
    ctx.lineTo(48 + i * 88, 78 + (i % 3) * 22);
    ctx.lineTo(78 + i * 88, 188);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(180,130,60,0.85)";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(160 + i * 18, 228, 3, 14);
    ctx.beginPath();
    ctx.arc(161.5 + i * 18, 226, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  runner(ctx, 310, 232, 0.7, "#1a2018", "rgba(255,255,255,0.2)");
}

function drawChess(ctx) {
  sky(ctx, "#2a1810", "#5a3828");
  ground(ctx, "#3a2818", H * 0.42);
  // table
  block(ctx, 120, 150, 400, 28, "#5a3a22");
  block(ctx, 160, 178, 40, 90, "#4a3018");
  block(ctx, 440, 178, 40, 90, "#4a3018");
  // board
  const ox = 200;
  const oy = 70;
  const s = 28;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#2a1810" : "#d8c4a0";
      ctx.fillRect(ox + c * s, oy + r * s, s, s);
    }
  }
  ctx.fillStyle = "#f0e8d8";
  ctx.font = "22px serif";
  ctx.fillText("♔", ox + 3.5 * s, oy + 7 * s - 4);
  ctx.fillStyle = "#1a1010";
  ctx.fillText("♚", ox + 3.5 * s, oy + 1 * s - 4);
  ctx.fillStyle = "rgba(240,200,120,0.2)";
  ctx.fillRect(0, 0, W, H);
}

function drawDama(ctx) {
  sky(ctx, "#1a2218", "#3a4830");
  ground(ctx, "#2a3220", H * 0.45);
  block(ctx, 110, 155, 420, 26, "#4a3820");
  const ox = 190;
  const oy = 55;
  const s = 30;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#1a2010" : "#c8b898";
      ctx.fillRect(ox + c * s, oy + r * s, s, s);
      if ((r + c) % 2 && r < 3) {
        ctx.beginPath();
        ctx.arc(ox + c * s + s / 2, oy + r * s + s / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#222";
        ctx.fill();
      }
      if ((r + c) % 2 && r > 4) {
        ctx.beginPath();
        ctx.arc(ox + c * s + s / 2, oy + r * s + s / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#e8dcc8";
        ctx.fill();
      }
    }
  }
}

function drawSinuca(ctx) {
  sky(ctx, "#0e1a14", "#1a3024");
  ground(ctx, "#142018", H * 0.5);
  // table
  ctx.fillStyle = "#5a3218";
  ctx.fillRect(70, 80, 500, 200);
  ctx.fillStyle = "#147a45";
  ctx.fillRect(90, 98, 460, 164);
  // pockets
  for (const [x, y] of [
    [90, 98], [320, 96], [550, 98], [90, 262], [320, 264], [550, 262],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#050505";
    ctx.fill();
  }
  // balls
  const cols = ["#f4f0e6", "#f0c020", "#1e5aa8", "#c02828", "#111"];
  cols.forEach((col, i) => {
    ctx.beginPath();
    ctx.arc(280 + i * 22, 175, 11, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  });
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(160, 200);
  ctx.lineTo(250, 178);
  ctx.stroke();
}

function drawCardTable(ctx, title, accent) {
  sky(ctx, "#1a1020", accent);
  ground(ctx, "#142018", H * 0.55);
  ctx.fillStyle = accent;
  roundRect(ctx, 90, 70, 460, 220, 28);
  ctx.fill();
  ctx.fillStyle = "#fff8f0";
  roundRect(ctx, 130, 100, 380, 160, 18);
  ctx.fill();
  ctx.fillStyle = "#c02828";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("A♥", 200, 200);
  ctx.fillStyle = "#1a1a22";
  ctx.fillText("K♠", 320, 200);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(title, 160, 60);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTruco(ctx) {
  drawCardTable(ctx, "TRUCO", "#c45a3a");
}
function drawDomino(ctx) {
  sky(ctx, "#102018", "#1a5a48");
  ground(ctx, "#143028", H * 0.5);
  ctx.fillStyle = "#f0e8d8";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(160 + i * 70, 140, 50, 90);
    ctx.fillStyle = "#222";
    ctx.fillRect(170 + i * 70, 180, 30, 4);
    ctx.fillStyle = "#f0e8d8";
  }
}
function drawLig4(ctx) {
  sky(ctx, "#101828", "#1a4060");
  ctx.fillStyle = "#1e5a9a";
  ctx.fillRect(140, 80, 360, 220);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) {
      ctx.beginPath();
      ctx.arc(175 + c * 52, 110 + r * 38, 14, 0, Math.PI * 2);
      ctx.fillStyle = (r + c) % 3 === 0 ? "#e04040" : "#f0c020";
      ctx.fill();
    }
}
function drawVelha(ctx) {
  sky(ctx, "#181410", "#3a3020");
  ctx.strokeStyle = "#e8d4a8";
  ctx.lineWidth = 8;
  ctx.strokeRect(180, 70, 280, 220);
  ctx.beginPath();
  ctx.moveTo(273, 70);
  ctx.lineTo(273, 290);
  ctx.moveTo(366, 70);
  ctx.lineTo(366, 290);
  ctx.moveTo(180, 143);
  ctx.lineTo(460, 143);
  ctx.moveTo(180, 216);
  ctx.lineTo(460, 216);
  ctx.stroke();
  ctx.fillStyle = "#e8785a";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("X", 210, 130);
  ctx.fillText("O", 400, 270);
}
function drawBlackjack(ctx) {
  drawCardTable(ctx, "21", "#2a6a4a");
}
function drawPoker(ctx) {
  drawCardTable(ctx, "POKER", "#6a2a4a");
}
function drawMemoria(ctx) {
  sky(ctx, "#201018", "#5a2840");
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#e8785a" : "#f0e0c0";
    ctx.fillRect(140 + (i % 4) * 90, 90 + Math.floor(i / 4) * 100, 70, 80);
  }
}
function drawUno(ctx) {
  sky(ctx, "#101018", "#301848");
  const cols = ["#e04040", "#2aaa55", "#3380e0", "#e0c020"];
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect?.(180 + i * 70, 120, 55, 90, 8);
    if (!ctx.roundRect) ctx.fillRect(180 + i * 70, 120, 55, 90);
    else ctx.fill();
  });
}

const DRAWERS = {
  dust: drawDust,
  warehouse: drawWarehouse,
  horror: drawHorror,
  labyrinth: drawLabyrinth,
  frontier: drawFrontier,
  chess: drawChess,
  dama: drawDama,
  sinuca: drawSinuca,
  truco: drawTruco,
  domino: drawDomino,
  lig4: drawLig4,
  velha: drawVelha,
  blackjack: drawBlackjack,
  poker: drawPoker,
  memoria: drawMemoria,
  uno: drawUno,
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

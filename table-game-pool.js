/**
 * Sinuca (8-ball simplificada) — física 2D no canvas + bot com mira por dificuldade
 */

import {
  playCueStrike,
  playBallHit,
  playCushion,
  playPocket,
  playWin,
  playLose,
  playBotThink,
} from "./table-games-audio.js";
import { getBotTier } from "./table-games-bots.js";

const BALL_R = 10;
const FRICTION = 0.988;
const STOP = 0.045;
const MAX_POWER = 16;

const BALL_COLORS = {
  0: "#f4f0e6",
  1: "#f0c020",
  2: "#1e5aa8",
  3: "#c02828",
  4: "#4a1a7a",
  5: "#d06018",
  6: "#1a7a3a",
  7: "#6a1a1a",
  8: "#111111",
  9: "#f0c020",
  10: "#1e5aa8",
  11: "#c02828",
  12: "#4a1a7a",
  13: "#d06018",
  14: "#1a7a3a",
  15: "#6a1a1a",
};

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function mountPoolGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  const wrap = document.createElement("div");
  wrap.className = "tg-board-wrap tg-pool-wrap";
  wrap.innerHTML = `
    <div class="tg-board-hud">
      <div class="tg-board-title">Sinuca</div>
      <div class="tg-board-status" data-status></div>
      <div class="tg-board-meta">Bot: <strong>${tier.label}</strong> · clique e arraste a mira · solte pra tacada</div>
    </div>
    <div class="tg-pool-stage">
      <canvas class="tg-pool-canvas" data-canvas width="900" height="480"></canvas>
      <div class="tg-pool-power"><div class="tg-pool-power-fill" data-power></div></div>
    </div>
    <div class="tg-board-actions">
      <button type="button" class="tg-btn tg-btn-ghost" data-exit>Sair</button>
      <button type="button" class="tg-btn" data-restart>Reiniciar</button>
    </div>
  `;
  root.appendChild(wrap);

  const canvas = wrap.querySelector("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const statusEl = wrap.querySelector("[data-status]");
  const powerEl = wrap.querySelector("[data-power]");

  const TABLE = { x: 40, y: 36, w: 820, h: 408 };
  const pockets = [
    { x: TABLE.x, y: TABLE.y },
    { x: TABLE.x + TABLE.w / 2, y: TABLE.y - 2 },
    { x: TABLE.x + TABLE.w, y: TABLE.y },
    { x: TABLE.x, y: TABLE.y + TABLE.h },
    { x: TABLE.x + TABLE.w / 2, y: TABLE.y + TABLE.h + 2 },
    { x: TABLE.x + TABLE.w, y: TABLE.y + TABLE.h },
  ];
  const POCKET_R = 22;

  let balls = [];
  let turn = "player"; // player | bot
  let playerGroup = null; // 'solid' | 'stripe' | null
  let aiming = false;
  let aimFrom = null;
  let aimTo = null;
  let power = 0;
  let moving = false;
  let over = false;
  let foul = false;
  let scratched = false;
  let pocketedThisShot = [];
  let raf = 0;
  let firstContact = null;
  let shotCount = 0;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function startClockForPlayer() {
    if (over || turn !== "player") return;
    match?.startPlayerClock?.(shotCount === 0);
  }

  function finishGame(winner, reason = "") {
    if (over) return;
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    if (reason) setStatus(reason);
    onEnd?.(winner, reason);
  }

  function makeBall(id, x, y) {
    return { id, x, y, vx: 0, vy: 0, pocketed: false, stripe: id > 8 };
  }

  function rack() {
    balls = [];
    balls.push(makeBall(0, TABLE.x + TABLE.w * 0.28, TABLE.y + TABLE.h / 2));
    const apexX = TABLE.x + TABLE.w * 0.68;
    const apexY = TABLE.y + TABLE.h / 2;
    const gap = BALL_R * 2.05;
    const order = [1, 9, 2, 10, 8, 11, 3, 12, 4, 13, 5, 14, 6, 15, 7];
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = apexX + row * gap * 0.88;
        const y = apexY + (col - row / 2) * gap;
        balls.push(makeBall(order[idx++], x, y));
      }
    }
  }

  function alive(id) {
    return balls.find((b) => b.id === id && !b.pocketed);
  }

  function solidsLeft() {
    return balls.filter((b) => b.id >= 1 && b.id <= 7 && !b.pocketed).length;
  }
  function stripesLeft() {
    return balls.filter((b) => b.id >= 9 && !b.pocketed).length;
  }

  function groupOf(id) {
    if (id >= 1 && id <= 7) return "solid";
    if (id >= 9) return "stripe";
    return null;
  }

  function anyMoving() {
    return balls.some((b) => !b.pocketed && Math.hypot(b.vx, b.vy) > STOP);
  }

  function resolveCollisions() {
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.pocketed) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d >= BALL_R * 2) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = BALL_R * 2 - d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const impact = dvx * nx + dvy * ny;
        if (impact > 0) continue;
        a.vx -= impact * nx;
        a.vy -= impact * ny;
        b.vx += impact * nx;
        b.vy += impact * ny;
        const speed = Math.hypot(impact, 0);
        if (speed > 0.4) playBallHit(Math.min(1, speed / 10));
        if (firstContact == null && (a.id === 0 || b.id === 0)) {
          firstContact = a.id === 0 ? b.id : a.id;
        }
      }
    }
  }

  function wallsAndPockets(b) {
    // cushions
    const minX = TABLE.x + BALL_R;
    const maxX = TABLE.x + TABLE.w - BALL_R;
    const minY = TABLE.y + BALL_R;
    const maxY = TABLE.y + TABLE.h - BALL_R;
    let hit = false;
    if (b.x < minX) {
      b.x = minX;
      b.vx = Math.abs(b.vx);
      hit = true;
    }
    if (b.x > maxX) {
      b.x = maxX;
      b.vx = -Math.abs(b.vx);
      hit = true;
    }
    if (b.y < minY) {
      b.y = minY;
      b.vy = Math.abs(b.vy);
      hit = true;
    }
    if (b.y > maxY) {
      b.y = maxY;
      b.vy = -Math.abs(b.vy);
      hit = true;
    }
    if (hit && Math.hypot(b.vx, b.vy) > 0.5) playCushion();

    for (const p of pockets) {
      if (dist(b, p) < POCKET_R * 0.85) {
        b.pocketed = true;
        b.vx = 0;
        b.vy = 0;
        playPocket();
        pocketedThisShot.push(b.id);
        return;
      }
    }
  }

  function stepPhysics() {
    for (const b of balls) {
      if (b.pocketed) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      if (Math.hypot(b.vx, b.vy) < STOP) {
        b.vx = 0;
        b.vy = 0;
      }
      wallsAndPockets(b);
    }
    resolveCollisions();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // felt
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#1a5c38");
    g.addColorStop(1, "#0f3d26");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // wood rail
    ctx.fillStyle = "#5a3218";
    ctx.fillRect(TABLE.x - 18, TABLE.y - 18, TABLE.w + 36, TABLE.h + 36);
    ctx.fillStyle = "#147a45";
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h);

    // pockets
    for (const p of pockets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.fill();
    }

    // aim line
    const cue = alive(0);
    if (!moving && turn === "player" && cue && aimFrom && aimTo) {
      const dx = aimFrom.x - aimTo.x;
      const dy = aimFrom.y - aimTo.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      ctx.strokeStyle = "rgba(255,240,200,0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cue.x, cue.y);
      ctx.lineTo(cue.x + ux * 180, cue.y + uy * 180);
      ctx.stroke();
      ctx.setLineDash([]);
      // taco visual
      ctx.strokeStyle = "#c4a574";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cue.x - ux * 20, cue.y - uy * 20);
      ctx.lineTo(cue.x - ux * (40 + power * 8), cue.y - uy * (40 + power * 8));
      ctx.stroke();
    }

    for (const b of balls) {
      if (b.pocketed) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = BALL_COLORS[b.id] || "#ccc";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (b.id > 0) {
        ctx.fillStyle = b.stripe ? "#f4f0e6" : "#f4f0e6";
        if (b.stripe) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_R * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y - 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = b.id === 8 ? "#eee" : "#111";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(b.id), b.x, b.y + (b.stripe ? 0 : -1));
      }
    }

    powerEl.style.width = `${Math.min(100, power * 12)}%`;
  }

  function shoot(angle, strength) {
    const cue = alive(0);
    if (!cue || moving || over) return;
    if (turn === "player") {
      match?.endPlayerClock?.();
      shotCount += 1;
    }
    cue.vx = Math.cos(angle) * strength;
    cue.vy = Math.sin(angle) * strength;
    playCueStrike(strength / MAX_POWER);
    moving = true;
    foul = false;
    scratched = false;
    pocketedThisShot = [];
    firstContact = null;
    aiming = false;
    aimFrom = null;
    aimTo = null;
    power = 0;
    setStatus(turn === "player" ? "Bolas rolando..." : "Bot tacou...");
  }

  function legalTargetIds() {
    if (!playerGroup) return balls.filter((b) => b.id > 0 && b.id !== 8 && !b.pocketed).map((b) => b.id);
    const mine = turn === "player" ? playerGroup : playerGroup === "solid" ? "stripe" : "solid";
    const left = mine === "solid" ? solidsLeft() : stripesLeft();
    if (left === 0) return alive(8) ? [8] : [];
    return balls
      .filter((b) => !b.pocketed && groupOf(b.id) === mine)
      .map((b) => b.id);
  }

  function resolveShotEnd() {
    moving = false;
    const cue = alive(0);
    if (!cue) scratched = true;

    // scratch
    if (scratched || pocketedThisShot.includes(0)) {
      foul = true;
      const c = balls.find((b) => b.id === 0);
      if (c) {
        c.pocketed = false;
        c.x = TABLE.x + TABLE.w * 0.28;
        c.y = TABLE.y + TABLE.h / 2;
        c.vx = 0;
        c.vy = 0;
      }
      pocketedThisShot = pocketedThisShot.filter((id) => id !== 0);
    }

    // 8-ball rules simplified
    if (pocketedThisShot.includes(8)) {
      const shooter = turn;
      const myGroup =
        shooter === "player"
          ? playerGroup
          : playerGroup === "solid"
          ? "stripe"
          : playerGroup === "stripe"
          ? "solid"
          : null;
      const left = myGroup === "solid" ? solidsLeft() : myGroup === "stripe" ? stripesLeft() : 99;
      const legalWin = !!myGroup && left === 0 && !foul && !scratched;
      over = true;
      match?.endPlayerClock?.();
      match?.setActionsEnabled?.(false);
      if (shooter === "player") {
        if (legalWin) {
          setStatus("8 na caçapa — você venceu!");
          playWin();
          onEnd?.("player");
        } else {
          setStatus("8 ilegal — você perdeu.");
          playLose();
          onEnd?.("bot");
        }
      } else if (legalWin) {
        setStatus("Bot fechou a 8 — derrota.");
        playLose();
        onEnd?.("bot");
      } else {
        setStatus("Bot errou a 8 — você venceu!");
        playWin();
        onEnd?.("player");
      }
      return;
    }

    // assign groups
    if (!playerGroup) {
      const first = pocketedThisShot.find((id) => id > 0 && id !== 8);
      if (first) {
        const g = groupOf(first);
        if (turn === "player") playerGroup = g;
        else playerGroup = g === "solid" ? "stripe" : "solid";
      }
    }

    // foul on wrong first contact
    const targets = legalTargetIds();
    if (firstContact != null && targets.length && !targets.includes(firstContact) && firstContact !== 8) {
      foul = true;
    }
    if (firstContact == null && pocketedThisShot.length === 0) foul = true;

    const scored = pocketedThisShot.filter((id) => id > 0 && id !== 8);
    const keepTurn =
      !foul &&
      scored.some((id) => {
        if (!playerGroup) return true;
        const g = groupOf(id);
        const mine = turn === "player" ? playerGroup : playerGroup === "solid" ? "stripe" : "solid";
        return g === mine;
      });

    if (foul || !keepTurn) {
      turn = turn === "player" ? "bot" : "player";
    }

    const label =
      playerGroup === "solid"
        ? "Você: lisas (1–7)"
        : playerGroup === "stripe"
        ? "Você: listradas (9–15)"
        : "Aberta — encaçape pra escolher grupo";

    if (turn === "player") {
      setStatus(foul ? `Falta! Sua vez. ${label}` : `Sua vez. ${label}`);
      match?.setActionsEnabled?.(true);
      match?.resetDrawOffer?.();
      startClockForPlayer();
    } else {
      setStatus(`Vez do bot. ${label}`);
      match?.setActionsEnabled?.(false);
      setTimeout(botShot, 600 + Math.random() * 500);
    }
  }

  function botShot() {
    if (over || turn !== "bot" || moving) return;
    const cue = alive(0);
    if (!cue) return;
    playBotThink();
    setStatus("Bot mirando...");
    setTimeout(() => {
      const targets = legalTargetIds()
        .map((id) => alive(id))
        .filter(Boolean);
      let best = null;
      let bestScore = -Infinity;
      for (const t of targets) {
        for (const p of pockets) {
          const toPocket = Math.atan2(p.y - t.y, p.x - t.x);
          // posição ideal da bola branca atrás do alvo
          const hx = t.x - Math.cos(toPocket) * BALL_R * 2.2;
          const hy = t.y - Math.sin(toPocket) * BALL_R * 2.2;
          const ang = Math.atan2(hy - cue.y, hx - cue.x);
          const align = Math.cos(ang - Math.atan2(t.y - cue.y, t.x - cue.x));
          const d = dist(cue, t);
          const score = align * 2 - d * 0.01 + (Math.random() - 0.5) * (1 - tier.pocketBias);
          if (score > bestScore) {
            bestScore = score;
            best = { ang, power: 7 + Math.random() * 6 };
          }
        }
      }
      if (!best) {
        const any = balls.find((b) => b.id > 0 && !b.pocketed);
        if (!any) return;
        best = {
          ang: Math.atan2(any.y - cue.y, any.x - cue.x),
          power: 8,
        };
      }
      const jitter = (Math.random() - 0.5) * tier.aimJitter * Math.PI;
      const pJit = 1 + (Math.random() - 0.5) * tier.powerJitter * 2;
      shoot(best.ang + jitter, Math.min(MAX_POWER, best.power * pJit));
    }, 400 + (1 - tier.pocketBias) * 700);
  }

  function loop() {
    if (moving) {
      for (let i = 0; i < 3; i++) stepPhysics();
      if (!anyMoving()) resolveShotEnd();
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }

  function onDown(e) {
    if (turn !== "player" || moving || over) return;
    const cue = alive(0);
    if (!cue) return;
    e.preventDefault();
    aiming = true;
    aimFrom = { x: cue.x, y: cue.y };
    aimTo = canvasPos(e);
    power = Math.min(10, dist(aimFrom, aimTo) / 25);
  }
  function onMove(e) {
    if (!aiming) return;
    e.preventDefault();
    aimTo = canvasPos(e);
    power = Math.min(10, dist(aimFrom, aimTo) / 25);
  }
  function onUp(e) {
    if (!aiming) return;
    e.preventDefault();
    const cue = alive(0);
    if (!cue || !aimTo) {
      aiming = false;
      return;
    }
    const dx = cue.x - aimTo.x;
    const dy = cue.y - aimTo.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) {
      aiming = false;
      power = 0;
      return;
    }
    const strength = Math.min(MAX_POWER, (len / 25) * 1.4);
    shoot(Math.atan2(dy, dx), strength);
  }

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);

  wrap.querySelector("[data-exit]").addEventListener("click", () => {
    match?.stopClock?.();
    cancelAnimationFrame(raf);
    onExit?.();
  });
  wrap.querySelector("[data-restart]").addEventListener("click", () => {
    rack();
    turn = "player";
    playerGroup = null;
    over = false;
    moving = false;
    shotCount = 0;
    match?.resetDrawOffer?.();
    match?.setActionsEnabled?.(true);
    setStatus("Sua vez — arraste pra mirar e solte pra tacada");
    startClockForPlayer();
  });

  onBind?.({
    resign() {
      if (over) return;
      setStatus("Você desistiu.");
      playLose();
      finishGame("bot", "Você desistiu.");
      match?.pushChat?.("Mesa", "Vitória do bot por desistência.", "system");
    },
    offerDraw() {
      if (over || turn !== "player" || moving) {
        match?.resetDrawOffer?.();
        return;
      }
      const accept = Math.random() < 0.28;
      setTimeout(() => {
        if (over) return;
        if (accept) {
          match?.pushChat?.("Bot", "Aceito o empate.", "bot");
          match?.markDrawResolved?.(true);
          setStatus("Empate por acordo.");
          finishGame("draw", "Empate — por acordo.");
        } else {
          match?.pushChat?.("Bot", "Recuso o empate.", "bot");
          match?.markDrawResolved?.(false);
          setStatus("Bot recusou o empate.");
        }
      }, 500 + Math.random() * 700);
    },
    timeout(kind) {
      if (over) return;
      playLose();
      finishGame(
        "bot",
        kind === "first"
          ? "Você perdeu — demorou mais de 1 min no 1º lance."
          : "Você perdeu — offline (mais de 3 min sem jogar)."
      );
    },
  });

  rack();
  setStatus("Sua vez — arraste pra mirar e solte pra tacada");
  match?.setActionsEnabled?.(true);
  startClockForPlayer();
  raf = requestAnimationFrame(loop);

  return () => {
    match?.stopClock?.();
    cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onUp);
    wrap.remove();
  };
}

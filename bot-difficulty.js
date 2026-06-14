/** Dificuldade por quantidade de bots — âncoras: 1 / 2 / 10 / 20 */

export const ENEMY_BASE_HP = 100;
export const ENEMY_BASE_FIRE_MS = 540;

const TIERS = [
  {
    n: 1,
    hp: 500,
    fireMs: Math.round(ENEMY_BASE_FIRE_MS / 3),
    speedMin: 3.5,
    speedMax: 4.5,
    dmgMin: 14,
    dmgMax: 24,
    coverAcc: 0.44,
    chaseAcc: 0.48,
    isSolo: true,
    tierLabel: "Extremo — 1 super bandido (500 HP, teleporta, IA agressiva)",
    tierClass: "diff-extreme",
  },
  {
    n: 2,
    hp: 300,
    fireMs: Math.round(ENEMY_BASE_FIRE_MS * 0.72),
    speedMin: 3.0,
    speedMax: 4.0,
    dmgMin: 12,
    dmgMax: 20,
    coverAcc: 0.4,
    chaseAcc: 0.4,
    isSolo: false,
    tierLabel: "Muito difícil — 2 inimigos muito fortes (300 HP)",
    tierClass: "diff-hard",
  },
  {
    n: 10,
    hp: 100,
    fireMs: ENEMY_BASE_FIRE_MS,
    speedMin: 2.6,
    speedMax: 3.5,
    dmgMin: 8,
    dmgMax: 16,
    coverAcc: 0.36,
    chaseAcc: 0.32,
    isSolo: false,
    tierLabel: "Normal — 10 inimigos (100 HP, cadência padrão)",
    tierClass: "diff-normal",
  },
  {
    n: 20,
    hp: 100,
    fireMs: Math.round(ENEMY_BASE_FIRE_MS * 1.22),
    speedMin: 1.55,
    speedMax: 2.15,
    dmgMin: 5,
    dmgMax: 11,
    coverAcc: 0.26,
    chaseAcc: 0.24,
    isSolo: false,
    tierLabel: "Fácil — 20 inimigos fracos (lentos, atiram 22% mais devagar, 100 HP)",
    tierClass: "diff-easy",
  },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpTier(lo, hi, t) {
  return {
    hp: Math.round(lerp(lo.hp, hi.hp, t)),
    fireMs: Math.round(lerp(lo.fireMs, hi.fireMs, t)),
    speedMin: lerp(lo.speedMin, hi.speedMin, t),
    speedMax: lerp(lo.speedMax, hi.speedMax, t),
    dmgMin: Math.round(lerp(lo.dmgMin, hi.dmgMin, t)),
    dmgMax: Math.round(lerp(lo.dmgMax, hi.dmgMax, t)),
    coverAcc: lerp(lo.coverAcc, hi.coverAcc, t),
    chaseAcc: lerp(lo.chaseAcc, hi.chaseAcc, t),
    isSolo: lo.isSolo && hi.isSolo,
  };
}

function tierLabelFor(n) {
  if (n === 1) return TIERS[0].tierLabel;
  if (n === 2) return TIERS[1].tierLabel;
  if (n === 10) return TIERS[2].tierLabel;
  if (n >= 20) return TIERS[3].tierLabel;
  if (n < 10) return `Difícil — ${n} inimigos (entre 2 fortes e 10 normais)`;
  return `Mais fácil — ${n} inimigos (entre 10 normais e 20 fracos)`;
}

function tierClassFor(n) {
  if (n === 1) return "diff-extreme";
  if (n <= 6) return "diff-hard";
  if (n >= 15) return "diff-easy";
  return "diff-normal";
}

export function getBotDifficulty(count) {
  const n = Math.min(20, Math.max(1, count));

  if (n <= TIERS[0].n) {
    return { n, ...TIERS[0], tierLabel: TIERS[0].tierLabel, tierClass: TIERS[0].tierClass };
  }
  if (n >= TIERS[TIERS.length - 1].n) {
    const t = TIERS[TIERS.length - 1];
    return { n, ...t, tierLabel: t.tierLabel, tierClass: t.tierClass };
  }

  let lo = TIERS[0];
  let hi = TIERS[1];
  for (let i = 0; i < TIERS.length - 1; i++) {
    if (n >= TIERS[i].n && n <= TIERS[i + 1].n) {
      lo = TIERS[i];
      hi = TIERS[i + 1];
      break;
    }
  }

  const t = (n - lo.n) / (hi.n - lo.n);
  const stats = lerpTier(lo, hi, t);
  return {
    n,
    ...stats,
    tierLabel: tierLabelFor(n),
    tierClass: tierClassFor(n),
    isSolo: n === 1,
  };
}

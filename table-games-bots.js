/** Perfis de bot — sabedoria e taxa de acerto por dificuldade */

export const BOT_TIERS = {
  easy: {
    id: "easy",
    label: "Fácil",
    blurb: "Erra bastante, joga no impulso",
    // xadrez/dama
    depth: 1,
    blunderRate: 0.48,
    // sinuca
    aimJitter: 0.22,
    powerJitter: 0.28,
    pocketBias: 0.35,
  },
  medium: {
    id: "medium",
    label: "Médio",
    blurb: "Joga sólido, erra de vez em quando",
    depth: 2,
    blunderRate: 0.26,
    aimJitter: 0.12,
    powerJitter: 0.16,
    pocketBias: 0.62,
  },
  hard: {
    id: "hard",
    label: "Difícil",
    blurb: "Calcula bem, raramente vacila",
    depth: 3,
    blunderRate: 0.1,
    aimJitter: 0.05,
    powerJitter: 0.08,
    pocketBias: 0.84,
  },
  hardcore: {
    id: "hardcore",
    label: "Hard",
    blurb: "Quase perfeito — pressão máxima",
    depth: 4,
    blunderRate: 0.02,
    aimJitter: 0.018,
    powerJitter: 0.03,
    pocketBias: 0.96,
  },
};

export function getBotTier(id) {
  return BOT_TIERS[id] || BOT_TIERS.medium;
}

/** Escolhe jogada: com chance de blunder pega uma aleatória; senão a melhor */
export function pickMoveWithWisdom(scoredMoves, tier) {
  if (!scoredMoves?.length) return null;
  const sorted = [...scoredMoves].sort((a, b) => b.score - a.score);
  const cfg = getBotTier(tier);
  if (Math.random() < cfg.blunderRate && sorted.length > 1) {
    const pool = sorted.slice(Math.floor(sorted.length * 0.35));
    return pool[Math.floor(Math.random() * pool.length)] || sorted[sorted.length - 1];
  }
  // pequena variação entre top moves mesmo no hard
  const topN = Math.max(1, Math.min(3, Math.ceil((1 - cfg.pocketBias) * 3)));
  const top = sorted.slice(0, topN);
  return top[Math.floor(Math.random() * top.length)];
}

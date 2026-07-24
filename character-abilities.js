/** Habilidades exclusivas dos personagens especiais compráveis (John e Miriã) */

export const CHARACTER_ABILITIES = {
  john_cravoixq: {
    id: "john_cravoixq",
    weaponOverride: "pens",
    fireRateMult: 0.5, // atira 50% mais rápido (metade do intervalo entre tiros)
    accuracyMult: 1,
    reloadAnimMult: 1,
    bleed: { dmgPerTick: 1, tickMs: 500, durationMs: 5000 },
    paintTrailOnKill: true,
    special: {
      key: "KeyT",
      id: "art_attack",
      cooldownMs: 150000,
      label: "Ataque de Arte",
      damage: 150,
      range: 150,
    },
  },
  miria_voixquisa: {
    id: "miria_voixquisa",
    weaponOverride: null,
    fireRateMult: 1 / 1.3, // 30% mais rápido
    accuracyMult: 0.9, // 10% mais preciso (espalhamento menor)
    reloadAnimMult: 1 / 1.4, // 40% mais rápido (animação de recarga)
    dizzyOnHit: { durationMs: 4000 },
    special: {
      key: "KeyT",
      id: "fatal_slap",
      cooldownMs: 20000,
      label: "Tapa Fatal",
      range: 2.4,
    },
  },
};

export function getCharacterAbility(skinId) {
  return CHARACTER_ABILITIES[skinId] || null;
}

export function getActiveCharacterAbility() {
  return getCharacterAbility(typeof window !== "undefined" ? window.__characterSkin : null);
}

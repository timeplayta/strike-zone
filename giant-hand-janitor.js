/** Mão gigante full-size — mesmo tamanho das mãos de parede (2.35 m) */

import { buildRealisticGiantHand } from "./horror-hand-builder.js";

export function buildGiantJanitorHand(side = 1, cutIndex = -1) {
  return buildRealisticGiantHand(side, cutIndex, {
    scale: 1.62,
    fatness: 1.14,
    wristOnly: true,
    cutIndex,
  });
}

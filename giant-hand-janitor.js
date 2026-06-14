/** Mão gigante full-size — mesmo tamanho das mãos de parede (2.35 m) */

import { buildRealisticGiantHand } from "./horror-hand-builder.js";

export function buildGiantJanitorHand(side = 1, cutIndex = -1) {
  return buildRealisticGiantHand(side, cutIndex, {
    scale: 1.38,
    fatness: 1,
    wristOnly: true,
    cutIndex,
  });
}

/**
 * Utilitário opcional de estilo PS1/PSX.
 *
 * NÃO usar na partida padrão: o vertex snap causa tremor e deixa o jogo
 * ilegível. Personagens usam low-poly limpo (flat shading) em
 * stylized-character.js; mãos FPS ficam realistas em weapon-view.js.
 *
 * Este arquivo fica disponível só se algum modo/filtro retrô pedir
 * explicitamente o wobble no futuro.
 */
import * as THREE from "three";

/** Grade do vertex snap — menor = mais tremido, maior = mais estável */
export const PSX_GRID = 320;

export function applyPsxWobble(material, grid = PSX_GRID) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      gl_Position.xyz = gl_Position.xyz / gl_Position.w;
      gl_Position.xy = floor(gl_Position.xy * ${grid.toFixed(1)}) / ${grid.toFixed(1)};
      gl_Position.xyz *= gl_Position.w;`
    );
  };
  material.customProgramCacheKey = () => `psxWobble_${grid}`;
  return material;
}

/** Material PS1 completo (só use em filtros/modos opt-in) */
export function psxMaterial(options = {}) {
  const m = new THREE.MeshStandardMaterial({ flatShading: true, ...options });
  applyPsxWobble(m);
  return m;
}

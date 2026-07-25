/**
 * Utilitário de estilo retrô PS1/PSX para os personagens (corpo + mãos em
 * primeira pessoa). Dois efeitos clássicos daquela geração:
 *
 * 1. Flat shading — cada face do low-poly aparece "quebrada" (facetada) em
 *    vez de suavizada, o visual mais reconhecível do PS1.
 * 2. Vertex snapping — trava a posição do vértice numa grade de baixa
 *    precisão no clip space, causando aquele tremor/"wobble" característico
 *    quando a câmera ou o personagem se move (o hardware original não tinha
 *    precisão de ponto flutuante suficiente pra manter os vértices estáveis).
 */
import * as THREE from "three";

/** Grade do vertex snap — menor = mais tremido/retrô, maior = mais estável */
export const PSX_GRID = 180;

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

/** Material PS1: flat shading + vertex snap já aplicados */
export function psxMaterial(options = {}) {
  const m = new THREE.MeshStandardMaterial({ flatShading: true, ...options });
  applyPsxWobble(m);
  return m;
}

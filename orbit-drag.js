/** Arrastar com o mouse/dedo sobre um canvas para girar um pivot 3D (visualização de armas/personagem) */

/**
 * @param {HTMLElement} canvas
 * @param {() => { rotation: { y: number } } | null} getPivot
 * @param {() => void} [onDragStart]
 * @param {{ invertYaw?: boolean, sensitivity?: number }} [opts]
 *   invertYaw: true = arrastar pra esquerda gira a câmera pra esquerda (modo jogo)
 */
export function attachOrbitDrag(canvas, getPivot, onDragStart, opts = {}) {
  if (!canvas || canvas.__orbitDragBound) return;
  canvas.__orbitDragBound = true;

  const yawSign = opts.invertYaw ? -1 : 1;
  const sensitivity = opts.sensitivity ?? 0.012;

  let dragging = false;
  let lastX = 0;

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture?.(e.pointerId);
    onDragStart?.();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const pivot = getPivot();
    if (pivot) {
      const dx = e.clientX - lastX;
      pivot.rotation.y += dx * sensitivity * yawSign;
    }
    lastX = e.clientX;
  });

  const stop = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("pointercancel", stop);
}

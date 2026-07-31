/** Arrastar com mouse/dedo para girar câmera (yaw + pitch) em jogos 3D */

/**
 * @param {HTMLElement} canvas
 * @param {() => { rotation: { x: number, y: number } } | null} getPivot
 * @param {() => void} [onDragStart]
 * @param {{ invertYaw?: boolean, invertPitch?: boolean, sensitivity?: number, pitchSensitivity?: number, minPitch?: number, maxPitch?: number, allowPitch?: boolean }} [opts]
 */
export function attachOrbitDrag(canvas, getPivot, onDragStart, opts = {}) {
  if (!canvas || canvas.__orbitDragBound) return;
  canvas.__orbitDragBound = true;

  const yawSign = opts.invertYaw ? -1 : 1;
  const pitchSign = opts.invertPitch ? -1 : 1;
  const sensitivity = opts.sensitivity ?? 0.012;
  const pitchSens = opts.pitchSensitivity ?? sensitivity * 0.85;
  const minPitch = opts.minPitch ?? -0.42;
  const maxPitch = opts.maxPitch ?? 0.52;
  const allowPitch = opts.allowPitch !== false;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (opts.canDrag && !opts.canDrag()) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture?.(e.pointerId);
    onDragStart?.();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const pivot = getPivot();
    if (!pivot) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    pivot.rotation.y += dx * sensitivity * yawSign;
    if (allowPitch) {
      pivot.rotation.x += dy * pitchSens * pitchSign;
      pivot.rotation.x = Math.max(minPitch, Math.min(maxPitch, pivot.rotation.x));
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const stop = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("pointercancel", stop);
}

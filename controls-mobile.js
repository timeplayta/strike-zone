/**
 * Controles estilo Free Fire:
 * - Joystick redondo FIXO (canto inferior esquerdo) para mover
 * - Arrastar com outro dedo em qualquer lugar da tela para mirar (simultâneo)
 */
export class MobileControls {
  constructor(rootEl, callbacks) {
    this.cb = callbacks;
    this.move = { x: 0, y: 0 };
    this.firing = false;
    this.active = false;

    this.root = rootEl;
    this.joystickZone = rootEl.querySelector("#moveJoystick");
    this.joystickKnob = rootEl.querySelector("#joystickKnob");
    this.aimLayer = rootEl.querySelector("#aimLayer");

    this.joystickCenter = { x: 0, y: 0 };
    this.joystickTouchId = null;
    this.aimTouchId = null;
    this.lastAim = { x: 0, y: 0 };

    this.maxJoyRadius = 52;
    this.uiSelector = "button, .mob-btn, .btn-fire, .mobile-buttons, #moveJoystick";

    this.cacheJoystickCenter();
    this.bindEvents();
    window.addEventListener("resize", () => this.cacheJoystickCenter());
  }

  cacheJoystickCenter() {
    if (!this.joystickZone) return;
    const rect = this.joystickZone.getBoundingClientRect();
    this.joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    this.maxJoyRadius = rect.width * 0.38;
  }

  bindEvents() {
    if (!this.joystickZone || !this.aimLayer) return;
    const opts = { passive: false };

    this.joystickZone.addEventListener("touchstart", (e) => this.onJoyStart(e), opts);
    this.joystickZone.addEventListener("touchmove", (e) => this.onJoyMove(e), opts);
    this.joystickZone.addEventListener("touchend", (e) => this.onJoyEnd(e), opts);
    this.joystickZone.addEventListener("touchcancel", (e) => this.onJoyEnd(e), opts);

    this.aimLayer.addEventListener("touchstart", (e) => this.onAimStart(e), opts);
    this.aimLayer.addEventListener("touchmove", (e) => this.onAimMove(e), opts);
    this.aimLayer.addEventListener("touchend", (e) => this.onAimEnd(e), opts);
    this.aimLayer.addEventListener("touchcancel", (e) => this.onAimEnd(e), opts);

    const fireBtn = this.root.querySelector("#btnFire");
    fireBtn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.firing = true;
    }, opts);
    fireBtn.addEventListener("touchend", (e) => {
      e.stopPropagation();
      this.firing = false;
    });

    ["btnReload", "btnBomb", "btnJump", "btnFlashlight", "btnW1", "btnW2", "btnW3"].forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (id === "btnReload") this.cb.onReload?.();
        if (id === "btnBomb") this.cb.onBomb?.();
        if (id === "btnJump") this.cb.onJump?.();
        if (id === "btnFlashlight") this.cb.onFlashlight?.();
        if (id === "btnW1") this.cb.onWeapon?.(1);
        if (id === "btnW2") this.cb.onWeapon?.(2);
        if (id === "btnW3") this.cb.onWeapon?.(3);
      }, opts);
    });
  }

  show() {
    this.root.classList.remove("hidden");
    this.active = true;
    requestAnimationFrame(() => this.cacheJoystickCenter());
  }

  hide() {
    this.root.classList.add("hidden");
    this.active = false;
    this.reset();
  }

  reset() {
    this.move = { x: 0, y: 0 };
    this.firing = false;
    this.joystickTouchId = null;
    this.aimTouchId = null;
    this.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  onJoyStart(e) {
    if (!this.active) return;
    e.preventDefault();
    e.stopPropagation();
    if (this.joystickTouchId !== null) return;
    const t = e.changedTouches[0];
    this.joystickTouchId = t.identifier;
    this.cacheJoystickCenter();
    this.updateJoystick(t.clientX, t.clientY);
  }

  onJoyMove(e) {
    if (!this.active) return;
    e.preventDefault();
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickTouchId) {
        this.updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  }

  onJoyEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.move = { x: 0, y: 0 };
        this.joystickKnob.style.transform = "translate(-50%, -50%)";
      }
    }
  }

  onAimStart(e) {
    if (!this.active) return;
    if (this.aimTouchId !== null) return;
    const t = e.changedTouches[0];
    if (this.isOverUI(t.clientX, t.clientY)) return;
    e.preventDefault();
    this.aimTouchId = t.identifier;
    this.lastAim = { x: t.clientX, y: t.clientY };
  }

  onAimMove(e) {
    if (!this.active || this.aimTouchId === null) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.aimTouchId) {
        const dx = t.clientX - this.lastAim.x;
        const dy = t.clientY - this.lastAim.y;
        this.lastAim = { x: t.clientX, y: t.clientY };
        if (dx !== 0 || dy !== 0) this.cb.onAim?.(dx, dy);
        break;
      }
    }
  }

  onAimEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.aimTouchId) this.aimTouchId = null;
    }
  }

  isOverUI(x, y) {
    const el = document.elementFromPoint(x, y);
    return el?.closest?.(".mob-btn, .btn-fire, .mobile-buttons, #moveJoystick") != null;
  }

  updateJoystick(cx, cy) {
    let dx = cx - this.joystickCenter.x;
    let dy = cy - this.joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.maxJoyRadius) {
      dx = (dx / dist) * this.maxJoyRadius;
      dy = (dy / dist) * this.maxJoyRadius;
    }
    this.joystickKnob.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.move.x = dx / this.maxJoyRadius;
    this.move.y = dy / this.maxJoyRadius;
  }

  isFiring() {
    return this.firing;
  }

  getMove() {
    return this.move;
  }
}

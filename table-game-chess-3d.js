/**
 * Tabuleiro de xadrez 3D — Three.js, peças procedurais, clique por raycast
 */

import * as THREE from "three";

const SQ = 1;
const BOARD = 8;
const CENTER = (BOARD - 1) / 2;

const COL_LIGHT = 0xc8b896;
const COL_DARK = 0x6b8f5e;
const COL_FRAME = 0x3d3428;
const COL_WHITE = 0xf2ebe0;
const COL_BLACK = 0x1a1a1a;

function sqPos(r, c) {
  return { x: c * SQ, y: 0, z: (BOARD - 1 - r) * SQ };
}

function pieceKey(r, c) {
  return `${r},${c}`;
}

function createMat(color, metal = 0.1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: metal,
  });
}

function addMesh(group, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  group.add(m);
  return m;
}

function buildPiece(type, color) {
  const g = new THREE.Group();
  const main = createMat(color === "w" ? COL_WHITE : COL_BLACK, color === "w" ? 0.06 : 0.14);
  const accent = createMat(color === "w" ? 0xd8ccb8 : 0x333333, 0.2);

  const base = new THREE.CylinderGeometry(0.32, 0.36, 0.12, 24);
  addMesh(g, base, accent, 0, 0.06, 0);

  if (type === "p") {
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.22, 0.38, 20), main, 0, 0.31, 0);
    addMesh(g, new THREE.SphereGeometry(0.18, 18, 14), main, 0, 0.58, 0);
  } else if (type === "r") {
    addMesh(g, new THREE.BoxGeometry(0.44, 0.42, 0.44), main, 0, 0.33, 0);
    for (const dx of [-0.14, 0, 0.14]) {
      for (const dz of [-0.14, 0, 0.14]) {
        if (!dx && !dz) continue;
        addMesh(g, new THREE.BoxGeometry(0.1, 0.12, 0.1), main, dx, 0.6, dz);
      }
    }
  } else if (type === "n") {
    addMesh(g, new THREE.CylinderGeometry(0.2, 0.28, 0.22, 16), main, 0, 0.23, 0);
    addMesh(g, new THREE.BoxGeometry(0.22, 0.36, 0.48), main, 0, 0.48, 0.08, 1, 1, 1);
    addMesh(g, new THREE.ConeGeometry(0.12, 0.22, 12), main, 0, 0.78, 0.22, 1, 1, 1);
  } else if (type === "b") {
    addMesh(g, new THREE.CylinderGeometry(0.12, 0.26, 0.28, 18), main, 0, 0.26, 0);
    addMesh(g, new THREE.SphereGeometry(0.22, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), main, 0, 0.52, 0);
    addMesh(g, new THREE.ConeGeometry(0.08, 0.18, 10), accent, 0, 0.72, 0);
  } else if (type === "q") {
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.28, 0.34, 20), main, 0, 0.29, 0);
    addMesh(g, new THREE.SphereGeometry(0.24, 20, 16), main, 0, 0.58, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addMesh(g, new THREE.ConeGeometry(0.045, 0.14, 8), accent, Math.cos(a) * 0.2, 0.82, Math.sin(a) * 0.2);
    }
  } else if (type === "k") {
    addMesh(g, new THREE.CylinderGeometry(0.16, 0.3, 0.36, 22), main, 0, 0.3, 0);
    addMesh(g, new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20), accent, 0, 0.52, 0);
    addMesh(g, new THREE.BoxGeometry(0.08, 0.28, 0.08), accent, 0, 0.72, 0);
    addMesh(g, new THREE.BoxGeometry(0.22, 0.08, 0.08), accent, 0, 0.78, 0);
  }

  g.traverse((o) => {
    if (o.isMesh) o.userData.pickParent = g;
  });
  return g;
}

export class ChessBoard3D {
  constructor(container, { onSquareClick } = {}) {
    this.container = container;
    this.onSquareClick = onSquareClick;
    this.pieceMeshes = new Map();
    this.prevBoard = null;
    this.animating = false;

    this.orbitPhi = 0.42;
    this.orbitTheta = 0.72;
    this.orbitRadius = 11.5;
    this.dragging = false;
    this.lastPointer = { x: 0, y: 0 };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1917);
    this.scene.fog = new THREE.Fog(0x1a1917, 14, 28);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this.updateCamera();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = "tg-chess-3d-canvas";
    container.appendChild(this.renderer.domElement);

    this.boardRoot = new THREE.Group();
    this.scene.add(this.boardRoot);

    const amb = new THREE.AmbientLight(0xfff5e8, 0.55);
    this.scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff8ee, 1.05);
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x88aacc, 0.35);
    fill.position.set(-5, 6, -4);
    this.scene.add(fill);

    this.buildBoard();
    this.highlightGroup = new THREE.Group();
    this.boardRoot.add(this.highlightGroup);
    this.piecesGroup = new THREE.Group();
    this.boardRoot.add(this.piecesGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.squareMeshes = [];

    this.onResize = () => this.resize();
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);

    window.addEventListener("resize", this.onResize);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

    this.resize();
    this.raf = 0;
    this.tick = () => {
      this.raf = requestAnimationFrame(this.tick);
      this.renderer.render(this.scene, this.camera);
    };
    this.tick();
  }

  buildBoard() {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD * SQ + 0.7, 0.35, BOARD * SQ + 0.7),
      createMat(COL_FRAME, 0.05)
    );
    frame.position.set(CENTER, -0.2, CENTER);
    frame.receiveShadow = true;
    this.boardRoot.add(frame);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD * SQ + 0.08, 0.08, BOARD * SQ + 0.08),
      createMat(0x2a241c, 0.08)
    );
    plate.position.set(CENTER, 0.02, CENTER);
    plate.receiveShadow = true;
    this.boardRoot.add(plate);

    for (let r = 0; r < BOARD; r++) {
      for (let c = 0; c < BOARD; c++) {
        const light = (r + c) % 2 === 0;
        const sq = new THREE.Mesh(
          new THREE.BoxGeometry(SQ * 0.98, 0.06, SQ * 0.98),
          createMat(light ? COL_LIGHT : COL_DARK, 0.02)
        );
        const p = sqPos(r, c);
        sq.position.set(p.x, 0.06, p.z);
        sq.receiveShadow = true;
        sq.userData = { r, c, pick: true };
        this.boardRoot.add(sq);
        this.squareMeshes.push(sq);
      }
    }
  }

  updateCamera() {
    const cx = CENTER;
    const cz = CENTER;
    const x = cx + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
    const y = 3 + this.orbitRadius * Math.cos(this.orbitPhi);
    const z = cz + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(cx, 0.2, cz);
  }

  resize() {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  handlePointerDown(e) {
    if (e.button !== 0) return;
    this.dragging = false;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
  }

  handlePointerMove(e) {
    if (e.buttons !== 1) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    this.dragging = true;
    this.orbitTheta -= dx * 0.006;
    this.orbitPhi = Math.max(0.35, Math.min(1.15, this.orbitPhi + dy * 0.004));
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.updateCamera();
  }

  handlePointerUp(e) {
    const wasDrag = this.dragging;
    this.dragging = false;
    if (wasDrag || this.animating) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.squareMeshes, false);
    if (hits.length) {
      const { r, c } = hits[0].object.userData;
      this.onSquareClick?.(r, c);
      return;
    }
    const pieceHits = this.raycaster.intersectObjects(this.piecesGroup.children, true);
    if (pieceHits.length) {
      let o = pieceHits[0].object;
      while (o && !o.userData?.sq) o = o.parent;
      if (o?.userData?.sq) {
        const { r, c } = o.userData.sq;
        this.onSquareClick?.(r, c);
      }
    }
  }

  clearHighlights() {
    while (this.highlightGroup.children.length) {
      const ch = this.highlightGroup.children[0];
      ch.geometry?.dispose();
      ch.material?.dispose();
      this.highlightGroup.remove(ch);
    }
  }

  addHighlight(r, c, kind) {
    const p = sqPos(r, c);
    let color = 0x44dd88;
    let opacity = 0.55;
    let scale = 0.28;
    if (kind === "selected") {
      color = 0xffd54f;
      opacity = 0.7;
      scale = 0.92;
    } else if (kind === "capture") {
      color = 0xff5252;
      opacity = 0.65;
      scale = 0.38;
    } else if (kind === "last") {
      color = 0x42a5f5;
      opacity = 0.45;
      scale = 0.92;
    }
    const geo =
      kind === "move" || kind === "capture"
        ? new THREE.RingGeometry(scale * 0.55, scale, 24)
        : new THREE.PlaneGeometry(SQ * scale, SQ * scale);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p.x, 0.11, p.z);
    if (kind === "move" || kind === "capture") mesh.position.y = 0.12;
    this.highlightGroup.add(mesh);
  }

  sync({ board, selected, highlights, lastFrom, lastTo }) {
    this.clearHighlights();
    if (selected) this.addHighlight(selected.r, selected.c, "selected");
    for (const h of highlights || []) {
      this.addHighlight(h.r, h.c, h.cap ? "capture" : "move");
    }
    if (lastFrom) this.addHighlight(lastFrom.r, lastFrom.c, "last");
    if (lastTo) this.addHighlight(lastTo.r, lastTo.c, "last");

    const moved = this.detectMove(this.prevBoard, board);
    this.prevBoard = board.map((row) => row.map((p) => (p ? { ...p } : null)));

    if (moved) {
      this.animateMove(moved, board);
    } else {
      this.rebuildPieces(board);
    }
  }

  detectMove(prev, next) {
    if (!prev) return null;
    let from = null;
    let to = null;
    let piece = null;
    for (let r = 0; r < BOARD; r++) {
      for (let c = 0; c < BOARD; c++) {
        const a = prev[r][c];
        const b = next[r][c];
        const ka = a ? `${a.c}${a.t}` : "";
        const kb = b ? `${b.c}${b.t}` : "";
        if (ka !== kb) {
          if (a && !from) from = { r, c };
          if (b) {
            to = { r, c };
            piece = b;
          }
        }
      }
    }
    if (from && to && piece) return { from, to, piece };
    return null;
  }

  rebuildPieces(board) {
    for (const mesh of this.pieceMeshes.values()) {
      this.piecesGroup.remove(mesh);
      mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    this.pieceMeshes.clear();

    for (let r = 0; r < BOARD; r++) {
      for (let c = 0; c < BOARD; c++) {
        const p = board[r][c];
        if (!p) continue;
        this.placePiece(r, c, p);
      }
    }
  }

  placePiece(r, c, piece) {
    const mesh = buildPiece(piece.t, piece.c);
    const pos = sqPos(r, c);
    mesh.position.set(pos.x, 0.06, pos.z);
    mesh.userData.sq = { r, c };
    mesh.userData.piece = { ...piece };
    this.piecesGroup.add(mesh);
    this.pieceMeshes.set(pieceKey(r, c), mesh);
    return mesh;
  }

  animateMove({ from, to, piece }, board) {
    const fromKey = pieceKey(from.r, from.c);
    let mesh = this.pieceMeshes.get(fromKey);

    if (!mesh) {
      this.rebuildPieces(board);
      return;
    }

    this.pieceMeshes.delete(fromKey);
    this.pieceMeshes.set(pieceKey(to.r, to.c), mesh);
    mesh.userData.sq = { r: to.r, c: to.c };
    mesh.userData.piece = { ...piece };

    for (const [key, m] of [...this.pieceMeshes.entries()]) {
      if (m === mesh) continue;
      const [rr, cc] = key.split(",").map(Number);
      if (rr === to.r && cc === to.c && m !== mesh) {
        this.piecesGroup.remove(m);
        m.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
        this.pieceMeshes.delete(key);
      }
    }

    const start = sqPos(from.r, from.c);
    const end = sqPos(to.r, to.c);
    const startY = mesh.position.y;
    const duration = 280;
    const t0 = performance.now();
    this.animating = true;

    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      mesh.position.x = start.x + (end.x - start.x) * ease;
      mesh.position.z = start.z + (end.z - start.z) * ease;
      mesh.position.y = startY + Math.sin(Math.PI * ease) * 0.35;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        mesh.position.set(end.x, startY, end.z);
        this.animating = false;
        for (let r = 0; r < BOARD; r++) {
          for (let c = 0; c < BOARD; c++) {
            const expected = board[r][c];
            const key = pieceKey(r, c);
            const existing = this.pieceMeshes.get(key);
            if (expected && !existing) this.placePiece(r, c, expected);
            else if (!expected && existing) {
              this.piecesGroup.remove(existing);
              this.pieceMeshes.delete(key);
            } else if (expected && existing) {
              const ep = existing.userData.piece;
              if (ep.t !== expected.t || ep.c !== expected.c) {
                this.piecesGroup.remove(existing);
                this.pieceMeshes.delete(key);
                this.placePiece(r, c, expected);
              }
            }
          }
        }
      }
    };
    requestAnimationFrame(step);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.rebuildPieces(Array.from({ length: 8 }, () => Array(8).fill(null)));
    this.clearHighlights();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

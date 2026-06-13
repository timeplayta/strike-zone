import * as THREE from "three";
import { MAPS, isHorrorMap, isLabyrinthMap, isNoCombatMap, isDarkMap, getMapMeta } from "./maps.js";
import {
  createBandit,
  createBoss,
  createHelper,
  spawnBloodPool,
  spawnBloodSpray,
  spawnBloodImpact,
  applyBloodHitFlash,
  spawnTeleportFx,
  applyRagdoll,
  initRagdoll,
  clearEnemyFlash,
  updateBloodSpray,
} from "./characters.js";
import {
  initJumpState,
  tryJump,
  updateJumpPhysics,
  PLAYER_EYE_HEIGHT,
} from "./entity-jump.js";
import {
  pickSafePosition,
  getEnemyMoveTarget,
  sanitizeMoveTarget,
  shouldNpcJump,
  getHelperMoveTarget,
  initEnemyBrain,
  shouldEnemyShoot,
  registerEnemyShot,
  getEnemyAccuracy,
  assignEnemyRole,
} from "./npc-brain.js";
import { pickNpcWeaponType } from "./npc-weapon.js";
import { applyNpcSteering, resolveNavTarget } from "./npc-steering.js";
import {
  isCinematicActive,
  playDefeatCinematic,
  playVictoryCinematic,
  hideCinematicUI,
} from "./cinematics.js";
import { MobileControls } from "./controls-mobile.js";
import { createWall, getPropCollider, buildMapProps } from "./map-props.js";
import { createMapMaterials, addWallBaseboard } from "./environment-textures.js";
import { buildWorldDecor, buildDoorAndInnerRoom } from "./world-decor.js";
import { getDoorHitMeshes, buildConnectedCeiling } from "./furniture.js";
import { createWeaponView, setWeaponView, setWeaponADS, triggerMuzzleFlash, triggerMeleeSwing, updateWeaponView, hideAllWeapons } from "./weapon-view.js";
import { spawnMeleePickups, updateMeleePickups, tryPickupMelee, collectMeleePickup } from "./melee-pickups.js";
import { createExitZone, updateExitZone, checkExitReached } from "./exit-zone.js";
import { playGunshot, playEmptyClip } from "./audio.js";
import { WEAPONS, calcWeaponDamage, getPrimaryWeapon, refillWeaponToMax } from "./weapons-data.js";
import { configureCharacterRenderer } from "./human-model.js";
import { initCharacterAnim, updateHumanAnimation, smoothTurn, getAnimOpts } from "./character-animation.js";
import {
  spawnAmmoChests,
  ENEMY_MAG_SIZE,
  ENEMY_RELOAD_MS,
} from "./ammo-stations.js";
import { addKillReward, getWeaponSkinColor, getAccountCoins } from "./player-account.js";
import {
  initFloatingUI,
  createEnemyHealthBar,
  updateEnemyHealthBar,
  updateEnemyLabels,
  showDamageNumber,
  removeEnemyLabel,
} from "./effects-ui.js";

let scene, camera, renderer, clock;
let walls = [], mapData, gameMode, playerName;
let player = { health: 100, team: "ct", dead: false };
let weapons, currentWeapon;
let enemies = [];
let helpers = [];
let keys = {};
let mouseDown = false;
let rightMouseDown = false;
let adsActive = false;
let bossSpawned = false;
let coverPoints = [];
let pointerLocked = false;
let yaw = 0, pitch = 0;
let scoreCT = 0, scoreT = 0, round = 1;
let matchOver = false, roundActive = true;
let inCinematic = false;
let roundTime = 180, bomb = null, bombPlanted = false;
let kills = 0, deaths = 0;
let bloodParticles = [];
let bloodPools = [];

const MOVE_SPEED = 7.5;
const MOVE_SPEED_MOBILE = 6.5;
const MOVE_ACCEL = 24;
const MOVE_FRICTION = 18;
const MOUSE_SENS = 0.0018;
const TOUCH_SENS = 0.0045;
const ENEMY_HP = 100;
const BOSS_HP = 200;
const INNER_BOMB_TIME = 90;
const ENEMY_FIRE_MS = 540;
const BOSS_FIRE_MS = 353;
const BASE_FOV = 75;
const ADS_WEAPONS = ["ak47", "scar", "awm"];
const ENEMY_SPAWN_DELAY_MS = 3000;
const MIN_SPAWN_DIST_FROM_PLAYER = 18;

let botCount = 4;
let useBotDifficulty = true;
let botDifficulty = null;
let primaryWeaponId = "ak47";
let doorMesh = null;
let doorOpen = false;
let doorAngle = 0;
let innerBombMesh = null;
let innerBombTimer = INNER_BOMB_TIME;
let innerBombActive = false;
let innerBombDefused = false;
let wantHelpers = false;
let doorHitMeshes = [];
let alertPoint = null;
let alertTimer = 0;
let lastPlayerPos = { x: 0, z: 0 };
let moveVel = { x: 0, z: 0 };
let wallMeshCache = [];
let frameCount = 0;
let hudTimerAcc = 0;
let sunLight = null;
let hemiLight = null;
let ambientLight = null;
let fillLight = null;
let enemyMoveAllowedAt = 0;
let ammoStation = null;
let sessionCoins = 0;
let nearChestHint = "";

const _vCollide = new THREE.Vector3();
const _vClosest = new THREE.Vector3();
const _vForward = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);

let playMode = "desktop";
let mobileControls = null;
let lookDelta = { x: 0, y: 0 };
let weaponView = null;
let currentMapKey = "dust";
let meleePickups = null;
let exitZone = null;
let currentMeleeId = null;
let collectedMelee = { facao: false, porrete: false, katana: false };

let adminSpectator = false;
let adminNoclip = false;
let adminNightVision = false;
let adminPreviewMode = null;
let adminFlySpeed = 14;
let adminPreviewPivot = null;
let adminPreviewEntity = null;
let adminCharOrbit = { yaw: 0.6, pitch: 0.25, dist: 4.2 };

let flashlightEquipped = false;
let flashlightLight = null;
let flashlightTarget = null;

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const endScreen = document.getElementById("endScreen");
const deathScreen = document.getElementById("deathScreen");
const canvas = document.getElementById("gameCanvas");
const overlay = document.getElementById("overlay");
const overlayMsg = document.getElementById("overlayMsg");
const cinematicEl = document.getElementById("cinematic");

/** Escala dificuldade: 1 bot = super forte; 20 bots = horda fraca */
function getBotDifficulty(count) {
  const n = Math.min(20, Math.max(1, count));
  const strength = (20 - n) / 19;
  const hp = Math.round(100 + 400 * strength);
  const fireMs = Math.round((1 - strength) * ENEMY_FIRE_MS * 1.2 + strength * (ENEMY_FIRE_MS / 3));
  const speedMin = 1.65 + 2.55 * strength;
  const speedMax = 2.25 + 3.05 * strength;
  const dmgMin = Math.round(5 + 10 * strength);
  const dmgMax = Math.round(11 + 13 * strength);
  const coverAcc = 0.2 + 0.24 * strength;
  const chaseAcc = 0.22 + 0.26 * strength;

  let tierLabel;
  let tierClass;
  if (n === 1) {
    tierLabel = "Extremo — 1 super bandido (500 HP, teleporta a cada 100 de dano, IA agressiva)";
    tierClass = "diff-extreme";
  } else if (n >= 20) {
    tierLabel = "Fácil — 20 inimigos fracos (lentos, atiram 20% mais devagar, 100 HP)";
    tierClass = "diff-easy";
  } else if (n <= 6) {
    tierLabel = `Difícil — ${n} inimigos mais fortes`;
    tierClass = "diff-hard";
  } else if (n >= 14) {
    tierLabel = `Mais fácil — ${n} inimigos mais fracos`;
    tierClass = "diff-easy";
  } else {
    tierLabel = `Equilibrado — ${n} inimigos`;
    tierClass = "diff-normal";
  }

  return {
    n,
    hp,
    fireMs,
    speedMin,
    speedMax,
    dmgMin,
    dmgMax,
    coverAcc,
    chaseAcc,
    tierLabel,
    tierClass,
    isSolo: n === 1,
  };
}

function getDefaultDifficulty() {
  return {
    n: botCount,
    hp: ENEMY_HP,
    fireMs: ENEMY_FIRE_MS,
    speedMin: 3.0,
    speedMax: 4.4,
    dmgMin: 8,
    dmgMax: 16,
    coverAcc: 0.38,
    chaseAcc: 0.34,
    tierLabel: `${botCount} inimigos (dificuldade padrão)`,
    tierClass: "diff-normal",
    isSolo: false,
  };
}

function applyDifficultyToEnemy(enemy, diff, index) {
  enemy.health = diff.hp;
  enemy.maxHealth = diff.hp;
  enemy.fireMs = diff.fireMs;
  enemy.speed = diff.speedMin + Math.random() * (diff.speedMax - diff.speedMin);
  enemy.dmgMin = diff.dmgMin;
  enemy.dmgMax = diff.dmgMax;
  enemy.coverAcc = diff.coverAcc;
  enemy.chaseAcc = diff.chaseAcc;
  enemy.group.scale.set(1, 1, 1);
  enemy.intelligence = diff.isSolo ? 0.98 : 0.35 + (1 - diff.n / 20) * 0.52;
  if (diff.isSolo) {
    enemy.name = "Super Bandido";
    enemy.isSuperSolo = true;
    enemy.nextTeleportHp = diff.hp - 100;
    enemy.group.scale.set(1.1, 1.1, 1.1);
  } else {
    enemy.name = enemy.name || `Bandido ${index + 1}`;
    enemy.isSuperSolo = false;
  }
}

function tickEntityJump(entity, dt) {
  if (entity.horrorMode) return;
  updateJumpPhysics(entity, dt);
  if (entity !== player && entity.group) {
    entity.group.position.y = (entity.baseY ?? 0) + (entity.jumpOffset || 0);
  }
}

function teleportSuperEnemy(e) {
  const px = camera.position.x;
  const pz = camera.position.z;
  const fx = e.group.position.x;
  const fz = e.group.position.z;
  spawnTeleportFx(scene, fx, fz);
  const pos = pickSafePosition(mapData, collides, fx, fz, px, pz, "npc", 8);
  e.group.position.set(pos.x, e.baseY ?? 0, pos.z);
  e.coverTarget = null;
  e.state = "chase";
  e.velY = 0;
  e.grounded = true;
  e.jumpOffset = 0;
  spawnTeleportFx(scene, pos.x, pos.z);
  showOverlay("Super Bandido se teleportou!");
}

function enemyShootPlayer(e) {
  if (e.reloading && performance.now() < e.reloadFinishAt) return;
  if (e.reloading && performance.now() >= e.reloadFinishAt) {
    finishEnemyReload(e);
  }
  const dmgMin = e.dmgMin ?? 12;
  const dmgMax = e.dmgMax ?? 20;
  const dmg = dmgMin + Math.floor(Math.random() * (dmgMax - dmgMin + 1));
  damagePlayer(dmg, e.name);
  registerEnemyShot(e);
  e.shotsSinceReload = (e.shotsSinceReload || 0) + 1;
  if (e.shotsSinceReload >= ENEMY_MAG_SIZE) {
    startEnemyReload(e);
  }
}

function initEnemyAmmo(e) {
  e.shotsSinceReload = 0;
  e.reloading = false;
  e.reloadFinishAt = 0;
}

function startEnemyReload(e) {
  e.reloading = true;
  e.reloadFinishAt = performance.now() + ENEMY_RELOAD_MS;
  e.shotsSinceReload = 0;
  e.state = "reload";
}

function finishEnemyReload(e) {
  e.reloading = false;
  e.shotsSinceReload = 0;
  if (e.state === "reload") e.state = "chase";
}

function refillAllPlayerAmmo() {
  if (!weapons) return;
  refillWeaponToMax(weapons[1], getPrimaryWeapon(primaryWeaponId));
  refillWeaponToMax(weapons[2], WEAPONS.glock);
  updateAmmoHUD();
}

function tryInteractAmmoChest() {
  if (!ammoStation || player.dead || inCinematic) return false;

  const distCt = Math.hypot(
    camera.position.x - ammoStation.ctPos.x,
    camera.position.z - ammoStation.ctPos.z
  );
  if (distCt < 2.8) {
    refillAllPlayerAmmo();
    showOverlay("Baú CT — munição no máximo!");
    return true;
  }

  const origin = camera.position.clone();
  const dir = getShootDirection();
  const ray = new THREE.Raycaster(origin, dir, 0, 5);
  const hits = ray.intersectObjects(ammoStation.hitMeshes, false);
  if (!hits.length) return false;

  const team = hits[0].object.userData.chestTeam;
  if (team === "ct") {
    refillAllPlayerAmmo();
    showOverlay("Baú CT — munição no máximo!");
    return true;
  }
  showOverlay("Baú inimigo — só terroristas recarregam aqui");
  return true;
}

function tryInteractMeleePickup() {
  if (!isLabyrinthMap(mapData) || !meleePickups) return false;
  const near = tryPickupMelee(camera, meleePickups, 2.5);
  if (near) {
    const id = collectMeleePickup(scene, near);
    collectedMelee[id] = true;
    equipMelee(id);
    meleePickups.hitMeshes = meleePickups.items.filter((i) => !i.collected).map((i) => i.hitMesh);
    return true;
  }
  const origin = camera.position.clone();
  const dir = getShootDirection();
  const ray = new THREE.Raycaster(origin, dir, 0, 4);
  const hits = ray.intersectObjects(meleePickups.hitMeshes, false);
  if (!hits.length) return false;
  const id = hits[0].object.userData.meleePickup;
  const item = meleePickups.items.find((i) => i.id === id && !i.collected);
  if (!item) return false;
  collectMeleePickup(scene, item);
  collectedMelee[id] = true;
  equipMelee(id);
  meleePickups.hitMeshes = meleePickups.items.filter((i) => !i.collected).map((i) => i.hitMesh);
  return true;
}

function equipMelee(id) {
  const def = WEAPONS[id];
  if (!def) return;
  weapons[3] = { ...def, mag: 1, reserve: 0, lastShot: 0 };
  currentMeleeId = id;
  switchWeapon(3);
  showOverlay(`Arma encontrada: ${def.name}`);
}

function tryInteractWorld() {
  if (tryInteractMeleePickup()) return true;
  if (isLabyrinthMap(mapData)) return false;
  if (tryInteractAmmoChest()) return true;
  return tryInteractDoor();
}

function updateBotDifficultyPreview() {
  const preview = document.getElementById("difficultyPreview");
  const checkbox = document.getElementById("useBotDifficulty");
  const slider = document.getElementById("botCount");
  if (!preview || !slider) return;

  const n = parseInt(slider.value, 10) || 4;
  const diff = getBotDifficulty(n);

  preview.textContent = `Dificuldade: ${diff.tierLabel}`;
  preview.className = `difficulty-preview ${diff.tierClass}`;
}

function setupMenuUI() {
  document.getElementById("respawnBtn")?.addEventListener("click", () => respawnPlayer());
  document.getElementById("endMatchFromDeathBtn")?.addEventListener("click", () => finishMatchFromDeath());

  document.getElementById("menuBtn")?.addEventListener("click", () => {
    matchOver = true;
    inCinematic = false;
    hideCinematicUI(cinematicEl);
    mobileControls?.hide();
    document.exitPointerLock?.();
    document.body.classList.remove("show-cursor");
    window.resetStrikeZoneMenu?.();
  });

  try {
    initMobileControls();
  } catch (e) {
    console.warn("Controles mobile indisponíveis:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMenuUI);
} else {
  setupMenuUI();
}

function isMobileMode() {
  return playMode === "mobile";
}

function getLookSensitivity() {
  return isMobileMode() ? TOUCH_SENS : MOUSE_SENS;
}

function initMobileControls() {
  if (mobileControls) return;
  const el = document.getElementById("mobileControls");
  if (!el) return;
  mobileControls = new MobileControls(el, {
    onAim: (dx, dy) => {
      if (inCinematic || player.dead) return;
      lookDelta.x += dx;
      lookDelta.y += dy;
    },
    onReload: () => reload(),
    onBomb: () => tryPlantOrDefuse(),
    onWeapon: (slot) => switchWeapon(slot),
    onJump: () => tryJump(player),
    onFlashlight: () => toggleFlashlight(),
  });
}

function applyPlayModeUI() {
  document.body.classList.toggle("mode-mobile", isMobileMode());
  document.body.classList.toggle("mode-desktop", !isMobileMode());
  document.body.classList.toggle("game-active", !menu.classList.contains("active"));

  if (isMobileMode()) {
    initMobileControls();
    mobileControls.show();
    document.exitPointerLock?.();
  } else {
    mobileControls?.hide();
  }
}

function bakeWallColliders() {
  wallMeshCache = walls.map((w) => w.mesh).filter(Boolean);
  for (const w of walls) {
    if (w.mesh) w.box.setFromObject(w.mesh);
  }
}

function startGame(config = {}) {
  if (typeof config !== "object" || config === null) config = {};
  if (!config.fromAdmin && window.__adminStartConfig) {
    config = { ...window.__adminStartConfig, ...config };
    window.__adminStartConfig = null;
  }

  if (config.preview === "character") {
    startCharacterPreviewSession(config);
    return;
  }

  adminPreviewMode = config.preview === "map" ? "map" : null;
  adminSpectator = !!config.spectator || config.preview === "map";
  adminNoclip = adminSpectator;
  if (config.nightVision) applyAdminNightVision(true);
  else if (!config.fromAdmin) applyAdminNightVision(false);

  try {
    const deviceBtn = document.querySelector(".device-btn.selected");
    if (!deviceBtn) {
      alert("Escolha se vai jogar no computador ou no celular.");
      return;
    }
    playMode = deviceBtn.dataset.device;

    playerName = document.getElementById("playerName").value.trim();
    if (!playerName) {
      alert("Digite seu nome para começar.");
      document.getElementById("playerName").focus();
      return;
    }

    const mapBtn = document.querySelector(".map-btn.selected");
    const mapKey = config.mapKey || mapBtn?.dataset.map || "dust";
    primaryWeaponId = document.querySelector(".weapon-btn.selected")?.dataset.weapon || "ak47";
    currentMapKey = mapKey;
    mapData = MAPS[mapKey];
    if (!mapData) {
      alert("Mapa inválido. Escolha um mapa na lista.");
      return;
    }
    if (isLabyrinthMap(mapData)) {
      wantHelpers = false;
      botCount = 0;
      gameMode = "escape";
    } else {
      wantHelpers = document.getElementById("wantHelpers")?.checked === true;
      botCount = Math.min(20, Math.max(1, parseInt(document.getElementById("botCount")?.value || "4", 10)));
      gameMode = document.getElementById("gameMode").value;
    }
    useBotDifficulty = true;
    botDifficulty = getBotDifficulty(Math.max(1, botCount));

    initFloatingUI();
    document.getElementById("worldLabels")?.replaceChildren?.();
    scoreCT = 0;
    scoreT = 0;
    round = 1;
    kills = 0;
    deaths = 0;
    sessionCoins = getAccountCoins(playerName);
    matchOver = false;
    inCinematic = false;
    bombPlanted = false;
    bomb = null;
    doorOpen = false;
    doorAngle = 0;
    bossSpawned = false;
    innerBombActive = false;
    innerBombDefused = false;
    innerBombTimer = INNER_BOMB_TIME;
    doorMesh = null;
    innerBombMesh = null;
    rightMouseDown = false;
    mouseDown = false;
    adsActive = false;
    bloodParticles = [];
    bloodPools = [];
    player.dead = false;
    moveVel.x = 0;
    moveVel.z = 0;
    lookDelta.x = 0;
    lookDelta.y = 0;
    hudTimerAcc = 0;
    disposeFlashlight();

    menu.classList.remove("active");
    menu.classList.add("hidden");
    endScreen.classList.add("hidden");
    deathScreen?.classList.add("hidden");
    deathScreen?.classList.remove("active");
    hideCinematicUI(cinematicEl);
    hud.classList.remove("hidden");
    applyPlayModeUI();
    document.body.classList.add("game-active");

    initThree();
    buildMap();
    bakeWallColliders();
    initPlayer();
    enemyMoveAllowedAt = performance.now() + (isLabyrinthMap(mapData) ? 0 : botCount === 1 ? 900 : ENEMY_SPAWN_DELAY_MS);
    const mapPreviewOnly = adminPreviewMode === "map";
    if (!mapPreviewOnly && !isNoCombatMap(mapData)) spawnEnemies();
    if (!mapPreviewOnly) spawnHelpers();
    initWeapons();
    roundTime = mapPreviewOnly ? 99999 : isLabyrinthMap(mapData) ? 9999 : gameMode === "defuse" ? 120 : 180;
    roundActive = true;
    collectedMelee = { facao: false, porrete: false, katana: false };
    currentMeleeId = null;
    if (mapPreviewOnly) {
      showOverlay("Espectador — WASD voar • ESC menu");
      document.getElementById("objective").textContent = "Inspeção de mapa (admin)";
      document.getElementById("timer").textContent = "∞";
      hud.classList.add("hidden");
    } else if (isLabyrinthMap(mapData)) {
      showOverlay("Labirinto — encontre facão, porrete e katana. Alcance a saída verde.");
      document.getElementById("objective").textContent = "Explore o escuro. Armas no caminho. Saída no fim do labirinto.";
      document.getElementById("timer").textContent = "∞";
    } else if (isHorrorMap(mapData)) {
      showOverlay("Modo terror — pressione J para equipar a lanterna");
      document.getElementById("objective").textContent =
        "Sobreviva ao escuro — J = lanterna • elimine as ameaças";
    } else {
      showOverlay("ROUND 1 — Inimigos entram em 3s");
      document.getElementById("objective").textContent = isMobileMode()
        ? gameMode === "defuse"
          ? "Joystick mover • Direita mirar • ATIRAR • B = bomba"
          : "Elimine os bandidos — joystick, mira e ATIRAR"
        : gameMode === "defuse"
          ? `Passe pelo CENTRO do mapa → sala do guardião (200 HP) • ${botCount} bandido(s) • Botão direito = mirar`
          : `Elimine ${botCount} bandido(s) — centro do mapa = sala do guardião musculoso • Botão direito = mirar`;
    }
    updateHUD();
    updateAdminHud();
    updateFlashlightHud();

    clock = new THREE.Clock();
    if (!window.__gameAnimating) {
      window.__gameAnimating = true;
      animate();
    }
    if (!isMobileMode() && adminPreviewMode !== "character") requestPointerLock();
    if (adminSpectator && weaponView) hideAllWeapons(weaponView);
  } catch (err) {
    console.error(err);
    alert("Erro ao iniciar partida: " + err.message);
    menu.classList.remove("hidden");
    menu.classList.add("active");
    hud.classList.add("hidden");
    document.body.classList.remove("game-active");
  }
}

function addSceneLights() {
  if (!hemiLight) hemiLight = new THREE.HemisphereLight(0xbfd0d8, 0x33291f, 0.38);
  if (!ambientLight) ambientLight = new THREE.AmbientLight(0xcfc4b0, 0.32);
  if (!sunLight) {
    sunLight = new THREE.DirectionalLight(0xe8d9b8, 0.62);
    sunLight.position.set(25, 45, 15);
    sunLight.castShadow = false;
  }
  if (!fillLight) {
    fillLight = new THREE.DirectionalLight(0x9ab4d8, 0.42);
    fillLight.position.set(-14, 18, -16);
  }
  scene.add(hemiLight, ambientLight, sunLight, fillLight);
}

function applyMapAtmosphere() {
  const horror = isHorrorMap(mapData);
  const labyrinth = isLabyrinthMap(mapData);
  const dark = isDarkMap(mapData);
  if (renderer) configureCharacterRenderer(renderer, labyrinth ? 0.74 : horror ? 0.86 : 1.05);

  if (labyrinth) {
    hemiLight.color.setHex(0x1a1418);
    hemiLight.groundColor.setHex(0x030202);
    hemiLight.intensity = 0.13;
    ambientLight.color.setHex(0x0a0808);
    ambientLight.intensity = 0.11;
    sunLight.color.setHex(0x443322);
    sunLight.intensity = 0.2;
    fillLight.color.setHex(0x1a2233);
    fillLight.intensity = 0.11;
    scene.background = new THREE.Color(0x060404);
    scene.fog = new THREE.Fog(0x050303, 4, 24);
  } else if (horror) {
    hemiLight.color.setHex(0x554466);
    hemiLight.groundColor.setHex(0x0c0a0a);
    hemiLight.intensity = 0.26;
    ambientLight.color.setHex(0x2a2020);
    ambientLight.intensity = 0.22;
    sunLight.color.setHex(0x997766);
    sunLight.intensity = 0.44;
    fillLight.color.setHex(0x445566);
    fillLight.intensity = 0.24;
    scene.background = new THREE.Color(mapData.sky).multiplyScalar(0.32);
    scene.fog = new THREE.Fog(
      new THREE.Color(mapData.fog).multiplyScalar(0.42).getHex(),
      8,
      38
    );
  } else {
    hemiLight.color.setHex(0xbfd0d8);
    hemiLight.groundColor.setHex(0x33291f);
    hemiLight.intensity = 0.38;
    ambientLight.color.setHex(0xcfc4b0);
    ambientLight.intensity = 0.32;
    sunLight.color.setHex(0xe8d9b8);
    sunLight.intensity = 0.62;
    fillLight.color.setHex(0x9ab4d8);
    fillLight.intensity = 0.42;
    scene.background = new THREE.Color(mapData.sky).multiplyScalar(0.55);
    scene.fog = new THREE.Fog(
      new THREE.Color(mapData.fog).multiplyScalar(0.65).getHex(),
      12,
      48
    );
  }
}

function initThree() {
  if (renderer) {
    while (scene.children.length) scene.remove(scene.children[0]);
    enemies = [];
    helpers = [];
    walls = [];
    wallMeshCache = [];
    bloodPools = [];
    if (camera) scene.add(camera);
    addSceneLights();
    configureCharacterRenderer(renderer);
    window.__strikeRenderer = renderer;
    if (sunLight) sunLight.castShadow = false;
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  scene.add(camera);
  if (!weaponView) {
    weaponView = createWeaponView(camera);
    setWeaponView(weaponView, 1, primaryWeaponId);
  }
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  configureCharacterRenderer(renderer);
  window.__strikeRenderer = renderer;

  addSceneLights();

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", (e) => {
    if (isMobileMode()) return;
    if (e.button === 2) {
      e.preventDefault();
      rightMouseDown = true;
      return;
    }
    if (e.button !== 0) return;
    if (!pointerLocked && !matchOver) requestPointerLock();
    if (pointerLocked && roundActive && !player.dead && !inCinematic) {
      if (tryInteractWorld()) return;
      mouseDown = true;
      shoot();
    }
  });
  document.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) rightMouseDown = false;
  });
  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

if (
  !new URLSearchParams(location.search).get("device") &&
  "ontouchstart" in window &&
  window.matchMedia("(max-width: 900px)").matches
) {
  const mob = document.querySelector('.device-btn[data-device="mobile"]');
  const desk = document.querySelector('.device-btn[data-device="desktop"]');
  if (mob && desk?.classList.contains("selected")) {
    desk.classList.remove("selected");
    mob.classList.add("selected");
    window.applyMenuDeviceLayout?.();
  }
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function requestPointerLock() {
  if (isMobileMode()) return;
  canvas.requestPointerLock?.();
}

function buildMap() {
  walls = [];
  meleePickups = null;
  exitZone = null;
  applyMapAtmosphere();

  const { floorMat, wallMat, accentMat } = createMapMaterials(mapData, currentMapKey);
  const floorW = mapData.floorW || 52 * mapData.scale;
  const floorH = mapData.floorH || 48 * mapData.scale;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorW, floorH),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMeshesForCeil = [];

  for (const [x, z, w, d, h] of mapData.walls) {
    const mesh = createWall(w, h, d, wallMat);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    walls.push({ mesh, box: new THREE.Box3() });
    wallMeshesForCeil.push(mesh);
    addWallBaseboard(scene, x, z, w, d, h, currentMapKey);
  }

  for (const c of mapData.covers) {
    const mesh = createWall(c.w, c.h, c.d, accentMat);
    mesh.position.set(c.x, c.h / 2, c.z);
    scene.add(mesh);
    walls.push({ mesh, box: new THREE.Box3() });
    addWallBaseboard(scene, c.x, c.z, c.w, c.d, c.h, currentMapKey);
  }

  for (const site of mapData.bombSites || []) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.5, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(site.x, 0.05, site.z);
    scene.add(ring);
  }

  if (isLabyrinthMap(mapData)) {
    buildMapProps(scene, mapData.props || [], mapData.propTint);
  } else {
    buildWorldDecor(scene, mapData, wallMeshesForCeil);
  }

  if (isLabyrinthMap(mapData) && mapData.pillars) {
    for (const p of mapData.pillars) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, mapData.ceilingH || 4.2, 8),
        accentMat
      );
      col.position.set(p.x, (mapData.ceilingH || 4.2) / 2, p.z);
      scene.add(col);
    }
  }

  if (!mapData.skipBossRoom) {
  const ceilMat = new THREE.MeshStandardMaterial({
    color: mapData.ceilColor,
    roughness: 0.9,
    metalness: 0.02,
  });
  const doorData = buildDoorAndInnerRoom(scene, mapData, walls, {
    wall: accentMat,
    floor: floorMat,
    ceil: ceilMat,
  });
  doorMesh = doorData.door;
  doorOpen = false;
  doorAngle = 0;
  doorHitMeshes = getDoorHitMeshes(doorMesh);
  } else {
    doorMesh = null;
    doorOpen = true;
    doorHitMeshes = [];
    const ceilMat = new THREE.MeshStandardMaterial({
      color: mapData.ceilColor,
      roughness: 0.94,
      metalness: 0.02,
    });
    if (wallMeshesForCeil.length) {
      buildConnectedCeiling(scene, floorW, floorH, mapData.ceilingH || 4.2, mapData.ceilColor, wallMeshesForCeil);
    }
  }

  coverPoints = (mapData.covers || []).map((c) => ({
    x: c.x, z: c.z, r: Math.max(c.w, c.d) * 0.55,
  }));
  if (ammoStation?.chests) {
    for (const c of ammoStation.chests) scene.remove(c.group);
  }
  if (!mapData.skipAmmoChests) {
    ammoStation = spawnAmmoChests(scene, mapData);
  } else {
    ammoStation = null;
  }
  for (const p of mapData.props || []) {
    const col = getPropCollider(p);
    walls.push({
      mesh: null,
      box: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(col.x, col.h / 2, col.z),
        new THREE.Vector3(col.w * 2, col.h, col.w * 2)
      ),
    });
    coverPoints.push({ x: col.x, z: col.z, r: col.w });
  }

  if (!mapData.skipBossRoom) {
  innerBombMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.35, 0.85),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  innerBombMesh.position.set(mapData.innerBomb.x, 0.22, mapData.innerBomb.z);
  scene.add(innerBombMesh);
  spawnBoss();
  }

  if (isLabyrinthMap(mapData)) {
    meleePickups = spawnMeleePickups(scene, mapData.meleePickups || []);
    exitZone = createExitZone(mapData.exitZone);
    scene.add(exitZone.group);
  }
}

function broadcastAlert(x, z) {
  alertPoint = { x, z };
  alertTimer = 14;
  for (const e of enemies) {
    if (!e.alive || e.isBoss) continue;
    e.state = "investigate";
    e.investigateUntil = performance.now() + 9000;
  }
}

function pickNextPatrol(e) {
  const points = mapData.patrolPoints;
  e.patrolIndex = (e.patrolIndex + 1 + Math.floor(Math.random() * 3)) % points.length;
  const p = points[e.patrolIndex];
  e.target = {
    x: p.x + (Math.random() - 0.5) * 2.5,
    z: p.z + (Math.random() - 0.5) * 2.5,
  };
}

function isInsideSecretRoom(x, z) {
  const r = mapData.innerRoom;
  return x > r.minX - 0.2 && x < r.maxX + 0.2 && z > r.minZ - 0.2 && z < r.maxZ + 0.2;
}

function spawnBoss() {
  if (bossSpawned) return;
  bossSpawned = true;
  const char = createBoss();
  char.group.position.set(mapData.bossSpawn.x, 0, mapData.bossSpawn.z);
  scene.add(char.group);

  const boss = {
    group: char.group,
    hitMeshes: char.hitMeshes,
    head: char.head,
    health: BOSS_HP,
    maxHealth: BOSS_HP,
    team: "t",
    lastShot: 0,
    state: "guard",
    target: { x: mapData.bossSpawn.x, z: mapData.bossSpawn.z },
    speed: 2.4,
    name: char.name,
    alive: true,
    ragdoll: false,
    isBoss: true,
    minigunRotor: char.minigunRotor,
    crouching: false,
    baseY: 0,
  };
  initJumpState(boss);
  initEnemyAmmo(boss);
  createEnemyHealthBar(boss);
  bindCharacterAnim(boss, char);
  enemies.push(boss);
}

function tryInteractDoor() {
  if (!doorMesh || player.dead || inCinematic || doorOpen) return false;
  const origin = camera.position.clone();
  const dir = getShootDirection();
  const ray = new THREE.Raycaster(origin, dir, 0, 8);
  const hits = ray.intersectObjects(doorHitMeshes, false);
  if (!hits.length) return false;

  doorOpen = true;
  if (!bossSpawned) spawnBoss();
  if (!innerBombActive && !innerBombDefused) {
    innerBombActive = true;
    innerBombTimer = INNER_BOMB_TIME;
    showOverlay("BOMBA NA SALA — 1:30!");
    document.getElementById("objective").textContent =
      "Elimine o guardião e desarme a bomba (B) antes do tempo acabar";
  } else {
    showOverlay("PORTA ABERTA — só você pode entrar");
  }
  return true;
}

function updateDoor(dt) {
  if (!doorMesh) return;
  const target = doorOpen ? -Math.PI * 0.55 : 0;
  doorAngle += (target - doorAngle) * Math.min(1, dt * 8);
  doorMesh.rotation.y = (doorMesh.userData.baseRot || 0) + doorAngle;
}

function updateInnerBomb(dt) {
  if (!innerBombActive || innerBombDefused || matchOver) return;
  innerBombTimer -= dt;
  if (innerBombTimer <= 0) {
    innerBombActive = false;
    triggerInnerBombExplosion();
    return;
  }
  if (frameCount % 15 === 0) {
    document.getElementById("objective").textContent =
      `Bomba na sala: ${formatTime(Math.max(0, innerBombTimer))} — mate o guardião e pressione B`;
  }
}

function triggerInnerBombExplosion() {
  if (matchOver) return;
  scoreT += 3;
  updateHUD();
  matchOver = true;
  roundActive = false;
  inCinematic = true;
  document.exitPointerLock?.();
  mobileControls?.hide();
  hud.classList.add("hidden");
  playDefeatCinematic({
    scene,
    camera,
    enemies,
    playerName,
    mapCenter: { x: mapData.innerBomb.x, z: mapData.innerBomb.z },
    subtitleEl: null,
    cinematicEl,
    callback: () => showEndScreen(false),
  });
}

function isBossAlive() {
  return enemies.some((e) => e.isBoss && e.alive);
}

function initPlayer() {
  player.health = 100;
  player.dead = false;
  player.alive = true;
  player.baseY = 0;
  initJumpState(player);
  const spawn = mapData.spawnPlayer || mapData.spawnCT;
  yaw = isLabyrinthMap(mapData) ? 0 : Math.atan2(
    mapData.spawnT.x - mapData.spawnCT.x,
    mapData.spawnT.z - mapData.spawnCT.z
  );
  pitch = 0;
  camera.position.set(spawn.x, 1.65, spawn.z);
  applyCameraRotation();
  updateHealthHUD();
}

function initWeapons() {
  if (isLabyrinthMap(mapData)) {
    weapons = {};
    currentWeapon = null;
    currentMeleeId = null;
    if (weaponView) hideAllWeapons(weaponView);
    updateAmmoHUD();
    return;
  }
  const primary = getPrimaryWeapon(primaryWeaponId);
  weapons = {
    1: { ...primary, mag: primary.mag, reserve: primary.reserve, lastShot: 0 },
    2: { ...WEAPONS.glock, mag: WEAPONS.glock.mag, reserve: WEAPONS.glock.reserve, lastShot: 0 },
    3: { ...WEAPONS.faca, mag: 1, reserve: 0, lastShot: 0 },
  };
  currentWeapon = weapons[1];
  if (weaponView) {
    setWeaponView(weaponView, 1, primaryWeaponId);
    applyPlayerWeaponSkins();
  }
  updateAmmoHUD();
}

function applyPlayerWeaponSkins() {
  if (!weaponView || !playerName) return;
  for (const [id, group] of Object.entries(weaponView.primaryModels)) {
    const color = getWeaponSkinColor(playerName, id);
    if (!color || !group) continue;
    group.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;
      if (m.metalness != null && m.metalness > 0.45) return;
      if (m.color) m.color.setHex(color);
    });
  }
}

/** Posições longe do jogador — outro lado do mapa / espalhadas */
function pickWalkablePatrolPoint(used = []) {
  const pts = [...mapData.patrolPoints].sort(() => Math.random() - 0.5);
  for (const p of pts) {
    const tooClose = used.some((u) => Math.hypot(u.x - p.x, u.z - p.z) < 4);
    if (tooClose) continue;
    const x = p.x + (Math.random() - 0.5) * 2;
    const z = p.z + (Math.random() - 0.5) * 2;
    if (!collides(x, z, 0.45, "npc")) {
      const pt = { x, z };
      used.push(pt);
      return pt;
    }
  }
  const lim = 20 * mapData.scale;
  return {
    x: (Math.random() - 0.5) * lim * 1.6,
    z: (Math.random() - 0.5) * lim * 1.4,
  };
}

function pickEnemySpawnPositions(n, playerX, playerZ) {
  const spawnX = mapData.spawnCT.x;
  const spawnZ = mapData.spawnCT.z;
  const toTX = mapData.spawnT.x - spawnX;
  const toTZ = mapData.spawnT.z - spawnZ;

  const ranked = mapData.patrolPoints
    .map((p) => {
      const distPlayer = Math.hypot(p.x - playerX, p.z - playerZ);
      const onEnemySide = (p.x - spawnX) * toTX + (p.z - spawnZ) * toTZ;
      return { x: p.x, z: p.z, distPlayer, onEnemySide };
    })
    .sort((a, b) => {
      if (Math.abs(a.distPlayer - b.distPlayer) > 2) return b.distPlayer - a.distPlayer;
      return b.onEnemySide - a.onEnemySide;
    });

  const far = ranked.filter((p) => p.distPlayer >= MIN_SPAWN_DIST_FROM_PLAYER);
  const pool = far.length >= n ? far : ranked;

  const positions = [];
  const step = Math.max(1, Math.floor(pool.length / n));
  for (let i = 0; i < n; i++) {
    const base = pool[Math.min(i * step, pool.length - 1)];
    positions.push({
      x: base.x + (Math.random() - 0.5) * 4,
      z: base.z + (Math.random() - 0.5) * 4,
    });
  }
  return positions;
}

function enemiesCanAct() {
  return performance.now() >= enemyMoveAllowedAt;
}

function updateEnemySpawnCountdown() {
  if (!roundActive || player.dead || matchOver) return;
  if (enemiesCanAct()) return;
  const left = Math.ceil((enemyMoveAllowedAt - performance.now()) / 1000);
  if (left > 0) {
    document.getElementById("objective").textContent =
      `Inimigos aguardam — movimento em ${left}s...`;
  }
}

function spawnEnemies() {
  if (isNoCombatMap(mapData)) return;
  enemies.forEach((e) => {
    if (e.isBoss) return;
    if (e.group) scene.remove(e.group);
    removeEnemyLabel(e);
  });
  enemies = enemies.filter((e) => e.isBoss);

  useBotDifficulty = true;
  botCount = Math.min(20, Math.max(1, parseInt(document.getElementById("botCount")?.value || String(botCount), 10)));
  botDifficulty = getBotDifficulty(botCount);

  const diff = botDifficulty;
  const n = botCount;
  const px = mapData.spawnCT.x;
  const pz = mapData.spawnCT.z;

  if (n === 1 && diff.isSolo) {
    const spawnPositions = pickEnemySpawnPositions(1, px, pz);
    const ex = spawnPositions[0].x;
    const ez = spawnPositions[0].z;
    const char = createBandit(0, currentMapKey, { solo: true, weaponType: "ak47" });
    char.group.position.set(ex, 0, ez);
    scene.add(char.group);

    const enemy = {
      group: char.group,
      hitMeshes: char.hitMeshes,
      head: char.head,
      health: diff.hp,
      maxHealth: diff.hp,
      team: "t",
      lastShot: 0,
      fireMs: diff.fireMs,
      dmgMin: diff.dmgMin,
      dmgMax: diff.dmgMax,
      coverAcc: diff.coverAcc,
      chaseAcc: diff.chaseAcc,
      state: "chase",
      patrolIndex: 0,
      investigateUntil: 0,
      target: { x: ex, z: ez },
      speed: diff.speedMax,
      name: char.name,
      accessory: char.accessory,
      faceProfile: char.faceProfile,
      alive: true,
      ragdoll: false,
      crouching: false,
      coverTarget: null,
      peekTimer: 0,
      baseY: 0,
    };
    applyDifficultyToEnemy(enemy, diff, 0);
    initJumpState(enemy);
    initEnemyAmmo(enemy);
    enemy.indexInSquad = 0;
    initEnemyBrain(enemy, 0, 1);
    createEnemyHealthBar(enemy);
    bindCharacterAnim(enemy, char);
    enemies.push(enemy);
    return;
  }

  const spawnPositions = pickEnemySpawnPositions(n, px, pz);

  for (let i = 0; i < n; i++) {
    const ex = spawnPositions[i].x;
    const ez = spawnPositions[i].z;
    const role = assignEnemyRole(i, n);
    const weaponType = pickNpcWeaponType(i, n, role);
    const char = createBandit(i, currentMapKey, { squadSize: n, weaponType });
    char.group.position.set(ex, 0, ez);
    scene.add(char.group);

    const enemy = {
      group: char.group,
      hitMeshes: char.hitMeshes,
      head: char.head,
      health: diff.hp,
      maxHealth: diff.hp,
      team: "t",
      lastShot: 0,
      fireMs: diff.fireMs,
      dmgMin: diff.dmgMin,
      dmgMax: diff.dmgMax,
      coverAcc: diff.coverAcc,
      chaseAcc: diff.chaseAcc,
      state: "patrol",
      patrolIndex: i % mapData.patrolPoints.length,
      investigateUntil: 0,
      target: { x: ex, z: ez },
      speed: diff.speedMin + Math.random() * (diff.speedMax - diff.speedMin),
      name: char.name,
      accessory: char.accessory,
      alive: true,
      ragdoll: false,
      crouching: false,
      coverTarget: null,
      peekTimer: 0,
      baseY: 0,
      intelligence: 0.32 + (1 - diff.n / 20) * 0.48,
    };
    applyDifficultyToEnemy(enemy, diff, i);
    enemy.indexInSquad = i;
    enemy.npcWeapon = weaponType;
    enemy.role = role;
    initJumpState(enemy);
    initEnemyAmmo(enemy);
    initEnemyBrain(enemy, i, n);
    createEnemyHealthBar(enemy);
    bindCharacterAnim(enemy, char);
    enemies.push(enemy);
  }
}

function findCoverForEnemy(ex, ez, px, pz) {
  let best = null;
  let bestScore = -1;
  for (const c of coverPoints) {
    const dEnemy = Math.hypot(c.x - ex, c.z - ez);
    const dPlayer = Math.hypot(c.x - px, c.z - pz);
    if (dEnemy > 18 || dPlayer < 2.5) continue;
    const score = dPlayer - dEnemy * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function bindCharacterAnim(entity, char) {
  entity.rig = char.rig;
  entity.mixer = char.mixer || null;
  entity.animActions = char.animActions || null;
  entity.gun = char.gun || null;
  entity.weaponPivot = char.weaponPivot || null;
  entity.npcWeapon = char.weaponType || "ak47";
  entity.bones = char.bones || null;
  entity.horrorMode = isHorrorMap(mapData);
  entity.alwaysHoldWeapon = !!char.gun && !entity.horrorMode;
  initCharacterAnim(entity);
}

function applyCrouchVisual(e, crouch) {
  e.crouching = crouch;
}

function canShootFromCover(e, px, pz) {
  if (!e.crouching) return true;
  e.peekTimer = (e.peekTimer || 0) + 1;
  return e.peekTimer % 45 < 22;
}

/** Stats dos ajudantes escalam com o nº de inimigos: 1 bot = básicos; 20 bots = elite */
function getHelperStats() {
  const t = Math.min(1, Math.max(0, (botCount - 1) / 19));
  return {
    hp: Math.round(85 + t * 95),          // 85 → 180
    fireMs: Math.round(900 - t * 520),    // 900ms → 380ms (tiros mais rápidos)
    acc: 0.5 + t * 0.4,                   // 50% → 90% de acerto
    dmgMin: 9 + Math.round(t * 8),        // 9 → 17
    dmgMax: 15 + Math.round(t * 12),      // 15 → 27
    speed: 2.6 + t * 1.8,                 // 2.6 → 4.4 (movimentos mais rápidos)
    smart: t,                             // inteligência (alvos distintos, flanqueio)
  };
}

function spawnHelpers() {
  if (isNoCombatMap(mapData)) return;
  helpers.forEach((h) => {
    if (h.group) scene.remove(h.group);
    removeEnemyLabel(h);
  });
  helpers = [];
  if (!wantHelpers) return;

  const stats = getHelperStats();
  for (let i = 0; i < 2; i++) {
    const char = createHelper(i, currentMapKey);
    char.group.position.set(mapData.spawnCT.x + 1.5 + i * 1.8, 0, mapData.spawnCT.z + 2.5);
    scene.add(char.group);
    const helper = {
      group: char.group,
      hitMeshes: char.hitMeshes,
      head: char.head,
      health: stats.hp,
      maxHealth: stats.hp,
      team: "ct",
      lastShot: 0,
      name: char.name,
      alive: true,
      isHelper: true,
      alwaysShowHp: true,
      fireMs: stats.fireMs,
      acc: stats.acc,
      dmgMin: stats.dmgMin,
      dmgMax: stats.dmgMax,
      speed: stats.speed,
      smart: stats.smart,
      intelligence: stats.smart,
      baseY: 0,
    };
    initJumpState(helper);
    createEnemyHealthBar(helper);
    bindCharacterAnim(helper, char);
    helpers.push(helper);
  }
}

function getShootDirection() {
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return dir.normalize();
}

function applyCameraRotation() {
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  updateFlashlightBeam();
}

function ensureFlashlightRig() {
  if (!camera || flashlightLight) return;
  flashlightLight = new THREE.SpotLight(0xfff0cc, 0, 44, Math.PI / 6.5, 0.45, 1.1);
  flashlightLight.castShadow = false;
  flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -10);
  flashlightLight.position.set(0.2, -0.14, 0.02);
  flashlightLight.target = flashlightTarget;
  camera.add(flashlightLight);
  camera.add(flashlightTarget);
}

function disposeFlashlight() {
  if (flashlightLight && camera) {
    camera.remove(flashlightLight);
    if (flashlightTarget) camera.remove(flashlightTarget);
    flashlightLight.dispose?.();
  }
  flashlightLight = null;
  flashlightTarget = null;
  flashlightEquipped = false;
  updateFlashlightHud();
}

function updateFlashlightHud() {
  const el = document.getElementById("flashlightHud");
  if (el) {
    const show = isHorrorMap(mapData) && flashlightEquipped && roundActive && !player.dead;
    el.classList.toggle("hidden", !show);
    el.classList.toggle("active", show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
  }
  const mobBtn = document.getElementById("btnFlashlight");
  if (mobBtn) {
    const showBtn = isHorrorMap(mapData) && roundActive && !player.dead;
    mobBtn.classList.toggle("hidden", !showBtn);
    mobBtn.classList.toggle("active", !!flashlightEquipped);
  }
}

function updateFlashlightBeam() {
  if (!flashlightLight || !flashlightEquipped) return;
  flashlightLight.intensity = 21;
}

function toggleFlashlight() {
  if (!isHorrorMap(mapData) || !roundActive || player.dead || inCinematic) return;
  ensureFlashlightRig();
  flashlightEquipped = !flashlightEquipped;
  if (flashlightLight) {
    flashlightLight.intensity = flashlightEquipped ? 21 : 0;
  }
  if (isHorrorMap(mapData) && fillLight) {
    fillLight.intensity = flashlightEquipped ? 0.36 : 0.24;
  }
  updateFlashlightHud();
  if (flashlightEquipped) {
    showOverlay("Lanterna ligada — J para desligar");
  } else {
    showOverlay("Lanterna desligada");
  }
  const obj = document.getElementById("objective");
  if (obj && isHorrorMap(mapData)) {
    obj.textContent = `Sobreviva ao escuro${getHorrorObjectiveExtra()} • elimine as ameaças`;
  }
}

function getHorrorObjectiveExtra() {
  return flashlightEquipped ? " • 🔦 Lanterna ON (J)" : " • J = lanterna";
}

function findEnemyFromHit(obj) {
  for (const e of enemies) {
    if (!e.alive) continue;
    let o = obj;
    while (o) {
      if (o === e.group) return e;
      o = o.parent;
    }
  }
  return null;
}

function onKeyDown(e) {
  keys[e.code] = true;
  if (e.code === "Escape" && (adminSpectator || adminPreviewMode)) {
    adminExitToMenu();
    return;
  }
  if (e.code === "KeyN" && (adminSpectator || adminPreviewMode) && isDarkMap(mapData)) {
    applyAdminNightVision(!adminNightVision);
    updateAdminHud();
    return;
  }
  if (adminSpectator || adminPreviewMode) return;
  if (e.code === "KeyR") reload();
  if (e.code === "KeyE") tryInteractWorld();
  if (e.code === "Digit1") switchWeapon(1);
  if (e.code === "Digit2") switchWeapon(2);
  if (e.code === "Digit3") switchWeapon(3);
  if (e.code === "KeyB" && gameMode === "defuse") tryPlantOrDefuse();
  if (e.code === "KeyJ" && isHorrorMap(mapData)) toggleFlashlight();
  if (e.code === "Space") {
    e.preventDefault();
    tryJump(player);
  }
}

function onKeyUp(e) {
  keys[e.code] = false;
}

function onMouseMove(e) {
  if (isMobileMode() || inCinematic) return;
  if (adminPreviewMode === "character") {
    lookDelta.x += e.movementX;
    lookDelta.y += e.movementY;
    return;
  }
  if (!pointerLocked) return;
  lookDelta.x += e.movementX;
  lookDelta.y += e.movementY;
}

function canPlayerADS() {
  if (currentWeapon?.melee) return false;
  return ADS_WEAPONS.includes(primaryWeaponId);
}

function updateADS(dt) {
  const want = rightMouseDown && canPlayerADS() && !player.dead && !inCinematic && roundActive;
  adsActive = want;

  const def = getPrimaryWeapon(primaryWeaponId);
  const targetFov = want ? (def.adsFov ?? 45) : BASE_FOV;
  if (camera) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
    camera.updateProjectionMatrix();
  }

  const cross = document.getElementById("crosshair");
  const scope = document.getElementById("scopeHud");
  if (cross) cross.classList.toggle("scope-hidden", want);
  if (scope) {
    scope.classList.toggle("hidden", !want);
    scope.classList.toggle("active", want);
    if (want) scope.dataset.active = primaryWeaponId;
    else delete scope.dataset.active;
  }
  if (weaponView) setWeaponADS(weaponView, want, primaryWeaponId);
}

function processLook() {
  if (inCinematic) return;
  if (adminPreviewMode === "character") return;
  if (player.dead && !adminSpectator) return;
  if (!isMobileMode() && !pointerLocked && !adminSpectator) return;
  if (lookDelta.x === 0 && lookDelta.y === 0) return;
  let sens = getLookSensitivity();
  if (adsActive) sens *= 0.42;
  yaw -= lookDelta.x * sens;
  pitch -= lookDelta.y * sens;
  pitch = Math.max(-1.45, Math.min(1.45, pitch));
  lookDelta.x = 0;
  lookDelta.y = 0;
  applyCameraRotation();
}

function lookAtHorizontal(group, targetX, targetZ, dt = 0.016, entity = null) {
  smoothTurn(group, targetX, targetZ, dt, 16, entity);
}

function switchWeapon(slot) {
  if (!weapons[slot]) return;
  currentWeapon = weapons[slot];
  if (weaponView) {
    if (slot === 3 && currentMeleeId) setWeaponView(weaponView, slot, currentMeleeId);
    else setWeaponView(weaponView, slot, primaryWeaponId);
  }
  updateAmmoHUD();
}

function reload() {
  const w = currentWeapon;
  if (!w || w.melee || w.reserve <= 0) return;
  const slot = Object.keys(weapons).find((k) => weapons[k] === w) || "1";
  let baseMag;
  if (slot === "1") baseMag = getPrimaryWeapon(primaryWeaponId).mag;
  else if (slot === "2") baseMag = WEAPONS.glock.mag;
  else baseMag = 1;
  if (w.mag >= baseMag) return;
  const toLoad = Math.min(baseMag - w.mag, w.reserve);
  if (toLoad <= 0) return;
  w.mag += toLoad;
  w.reserve -= toLoad;
  updateAmmoHUD();
}

function shoot() {
  if (player.dead || inCinematic || !roundActive) return;
  if (!currentWeapon) {
    if (isLabyrinthMap(mapData)) showOverlay("Desarmado — procure uma arma no labirinto (E ou clique)");
    return;
  }

  const w = currentWeapon;
  const now = performance.now();
  if (now - w.lastShot < w.fireRate) return;
  if (!w.melee && w.mag <= 0) {
    playEmptyClip();
    return;
  }

  w.lastShot = now;
  if (!w.melee) {
    w.mag--;
    playGunshot(w.name);
    if (weaponView) triggerMuzzleFlash(weaponView);
  }
  updateAmmoHUD();

  const origin = camera.position.clone();
  const baseDir = getShootDirection();

  if (w.melee) {
    if (weaponView) triggerMeleeSwing(weaponView);
    if (!isNoCombatMap(mapData)) {
      const range = w.meleeRange || 2.8;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dist = e.group.position.distanceTo(camera.position);
        if (dist < range) {
          damageEnemy(e, w.damage, false);
          break;
        }
      }
    }
    return;
  }

  const pellets = w.pellets || 1;
  let hitEnemy = false;

  for (const e of enemies) {
    if (e.alive) e.group.updateMatrixWorld(false);
  }
  const hitTargets = [];
  for (const e of enemies) {
    if (e.alive) hitTargets.push(...e.hitMeshes);
  }

  const spreadBase = adsActive && w.adsSpread != null ? w.adsSpread : w.spread;

  for (let pi = 0; pi < pellets; pi++) {
    const dir = baseDir.clone();
    const spread = spreadBase;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const ray = new THREE.Raycaster(origin, dir, 0, 100);
    const hits = ray.intersectObjects(hitTargets, false);

    if (hits.length > 0) {
      // paredes e porta fechada bloqueiam a bala
      let blockDist = Infinity;
      const wallHit = ray.intersectObjects(wallMeshCache, false);
      if (wallHit.length) blockDist = wallHit[0].distance;
      if (!doorOpen && doorHitMeshes.length) {
        const doorHit = ray.intersectObjects(doorHitMeshes, false);
        if (doorHit.length && doorHit[0].distance < blockDist) blockDist = doorHit[0].distance;
      }
      if (hits[0].distance > blockDist) {
        if (wallHit.length) spawnImpact(wallHit[0].point, false);
        continue;
      }

      const enemy = findEnemyFromHit(hits[0].object);
      if (enemy) {
        const headshot = hits[0].object.userData?.hitPart === "head";
        const dist = origin.distanceTo(hits[0].point);
        const dmg = calcWeaponDamage(w, dist, headshot);
        damageEnemy(enemy, dmg, headshot, hits[0].point);
        spawnImpact(hits[0].point, true);
        hitEnemy = true;
        break;
      }
    }
  }

  if (!hitEnemy) {
    const dir = baseDir.clone();
    dir.x += (Math.random() - 0.5) * spreadBase;
    dir.y += (Math.random() - 0.5) * spreadBase;
    dir.z += (Math.random() - 0.5) * spreadBase;
    dir.normalize();
    const ray = new THREE.Raycaster(origin, dir, 0, 100);
    const wh = ray.intersectObjects(wallMeshCache, false);
    if (wh.length) spawnImpact(wh[0].point, false);
  }
}

function spawnImpact(pos, blood) {
  if (blood) {
    bloodParticles.push(...spawnBloodImpact(scene, pos, 1 + Math.random() * 0.5));
    return;
  }
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffaa44 })
  );
  p.position.copy(pos);
  scene.add(p);
  setTimeout(() => scene.remove(p), 150);
}

function flashEnemy(e) {
  applyBloodHitFlash(e, 0.14);
  e.hitMeshes.forEach((m) => {
    if (m.material?.emissive) {
      m.material.emissive.setHex(0x440808);
      if (m.material.emissiveIntensity != null) m.material.emissiveIntensity = 0.12;
      setTimeout(() => {
        if (e.alive && m.material?.emissive) {
          m.material.emissive.setHex(0x000000);
          if (m.material.emissiveIntensity != null) m.material.emissiveIntensity = 0;
        }
      }, 90);
    }
  });
}

function damageEnemy(e, dmg, headshot, hitPoint, fromPlayer = true) {
  if (!e.alive) return;
  const actual = Math.min(dmg, e.health);
  e.health -= actual;
  flashEnemy(e);
  // barra de vida só aparece quando O JOGADOR acerta e some 2s após o último tiro
  if (fromPlayer) {
    e.hpVisibleUntil = performance.now() + 2000;
    const fxPos = hitPoint || e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    showDamageNumber(actual, fxPos, camera, headshot);
  }
  updateEnemyHealthBar(e);
  const bleedOrigin = hitPoint
    ? hitPoint.clone()
    : e.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const sprayCount = headshot ? 9 : fromPlayer && dmg >= 80 ? 7 : 5;
  bloodParticles.push(...spawnBloodSpray(scene, bleedOrigin, sprayCount, { headshot }));
  if (hitPoint) bloodParticles.push(...spawnBloodImpact(scene, hitPoint, headshot ? 1.3 : 0.9));

  if (e.isSuperSolo && e.health > 0) {
    while (e.health <= e.nextTeleportHp && e.nextTeleportHp > 0) {
      teleportSuperEnemy(e);
      e.nextTeleportHp -= 100;
    }
  }

  if (e.health <= 0) killEnemy(e, headshot);
}

async function killEnemy(e, headshot) {
  e.alive = false;
  removeEnemyLabel(e);
  clearEnemyFlash(e);

  const dx = e.group.position.x - camera.position.x;
  const dz = e.group.position.z - camera.position.z;
  initRagdoll(e, {
    headshot,
    fallSide: dx > 0 ? 1 : -1,
  });

  kills++;
  scoreCT++;
  const gained = await addKillReward(playerName, e.isSuperSolo);
  sessionCoins += gained;
  addKillfeed(playerName, e.name + (headshot ? " (HS)" : "") + (gained ? ` +${gained}🪙` : ""));
  updateHUD();

  broadcastAlert(e.group.position.x, e.group.position.z);

  const bloodPos = e.group.position.clone();
  bloodPools.push(spawnBloodPool(scene, bloodPos, 1.35));
  bloodParticles.push(...spawnBloodSpray(scene, bloodPos.clone().add(new THREE.Vector3(0, 0.6, 0)), 14, { death: true }));

  checkWin();
}

function damageHelper(h, dmg, attacker) {
  if (!h.alive) return;
  h.health -= dmg;
  h.hpVisibleUntil = performance.now() + 2000;
  updateEnemyHealthBar(h);
  if (h.health <= 0) killHelper(h, attacker);
}

function killHelper(h, attacker) {
  if (!h.alive) return;
  h.alive = false;
  removeEnemyLabel(h);
  scoreT++;
  updateHUD();
  broadcastAlert(h.group.position.x, h.group.position.z);
  addKillfeed(attacker || "Bandido", h.name);
  bloodPools.push(spawnBloodPool(scene, h.group.position.clone(), 1));
  checkWin();
}

function showDeathChoice(attacker) {
  if (player.dead) return;
  player.dead = true;
  player.health = 0;
  deaths++;
  updateHealthHUD();

  const bloodPos = camera.position.clone();
  bloodPos.y = 0.1;
  bloodPools.push(spawnBloodPool(scene, bloodPos, 1.4));
  bloodParticles.push(...spawnBloodSpray(scene, camera.position.clone(), 20));
  addKillfeed(attacker || "Bandido", playerName);

  document.body.classList.add("damage-flash");
  setTimeout(() => document.body.classList.remove("damage-flash"), 150);

  roundActive = false;
  inCinematic = false;
  if (flashlightLight) flashlightLight.intensity = 0;
  flashlightEquipped = false;
  updateFlashlightHud();
  document.exitPointerLock?.();
  mobileControls?.hide();
  hud.classList.add("hidden");
  document.body.classList.add("show-cursor");

  const msg = document.getElementById("deathMsg");
  if (msg) {
    msg.textContent = `Abatido por ${attacker || "inimigo"}. Renascer para continuar ou finalize para ir à tela de resultados.`;
  }
  deathScreen?.classList.remove("hidden");
  deathScreen?.classList.add("active");
}

function killPlayer(attacker) {
  showDeathChoice(attacker);
}

function hideDeathChoice() {
  deathScreen?.classList.add("hidden");
  deathScreen?.classList.remove("active");
  hud.classList.remove("hidden");
  document.body.classList.remove("show-cursor");
  if (isMobileMode()) mobileControls?.show();
}

function finishMatchFromDeath() {
  hideDeathChoice();
  matchOver = true;
  roundActive = false;
  endMatch("t", { skipCinematic: true });
}

function damagePlayer(dmg, attacker) {
  if (adminSpectator || player.dead || inCinematic) return;
  player.health -= dmg;
  updateHealthHUD();
  document.body.classList.add("damage-flash");
  setTimeout(() => document.body.classList.remove("damage-flash"), 150);
  if (player.health <= 0) killPlayer(attacker);
}

function respawnPlayer() {
  hideDeathChoice();
  player.health = 100;
  player.dead = false;
  inCinematic = false;
  camera.position.set(mapData.spawnCT.x, 1.65, mapData.spawnCT.z);
  moveVel.x = 0;
  moveVel.z = 0;
  applyCameraRotation();
  updateHealthHUD();
  enemyMoveAllowedAt = performance.now() + ENEMY_SPAWN_DELAY_MS;
  roundActive = true;
  showOverlay("RENASCIDO!");
  if (!isMobileMode()) requestPointerLock();
}

function tryPlantOrDefuse() {
  if (innerBombMesh && innerBombActive && !innerBombDefused) {
    const d = camera.position.distanceTo(innerBombMesh.position);
    if (d < 2.5) {
      if (isBossAlive()) {
        showOverlay("Elimine o guardião primeiro!");
        return;
      }
      innerBombDefused = true;
      innerBombActive = false;
      scene.remove(innerBombMesh);
      innerBombMesh = null;
      showOverlay("BOMBA DESARMADA!");
      document.getElementById("objective").textContent = "Bomba da sala desarmada — continue a missão";
      scoreCT += 2;
      updateHUD();
      return;
    }
  }
  if (bombPlanted && bomb) {
    const d = camera.position.distanceTo(bomb.position);
    if (d < 2.5) {
      bombPlanted = false;
      scene.remove(bomb);
      bomb = null;
      endRound("ct");
      showOverlay("BOMBA DESARMADA!");
    }
  }
}

function botPlantBomb(pos) {
  if (bombPlanted || gameMode !== "defuse") return;
  bombPlanted = true;
  bomb = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
  );
  bomb.position.set(pos.x, 0.2, pos.z);
  scene.add(bomb);
  document.getElementById("objective").textContent =
    "BOMBA PLANTADA! Aproxime-se e pressione B para desarmar";
}

function updateEnemies(dt) {
  if (inCinematic) return;
  const px = camera.position.x;
  const pz = camera.position.z;
  lastPlayerPos = { x: px, z: pz };
  if (alertTimer > 0) alertTimer -= dt;

  if (!enemiesCanAct()) return;

  for (const e of enemies) {
    if (!e.alive) {
      applyRagdoll(e, dt);
      continue;
    }

    const posBefore = { x: e.group.position.x, z: e.group.position.z };
    const dist = Math.hypot(e.group.position.x - px, e.group.position.z - pz);
    const seesPlayer = dist < 26 && hasLineOfSight(e.group.position, camera.position);
    let aiming = seesPlayer;

    if (e.isBoss) {
      if (e.minigunRotor) e.minigunRotor.rotation.z += dt * 22;
      lookAtHorizontal(e.group, px, pz, dt, e);
      const canSeeBoss = seesPlayer || (doorOpen && dist < 30 && hasLineOfSight(e.group.position, camera.position));
      aiming = canSeeBoss;
      if (canSeeBoss && !e.reloading) {
        if (performance.now() - e.lastShot > BOSS_FIRE_MS) {
          e.lastShot = performance.now();
          if (Math.random() < 0.52) {
            enemyShootPlayer(e);
          }
        }
        if (dist > 2.5) moveEntity(e.group, px, pz, e.speed * dt * 0.5, "boss");
      } else {
        const bx = mapData.innerBomb.x;
        const bz = mapData.innerBomb.z;
        const td = Math.hypot(bx - e.group.position.x, bz - e.group.position.z);
        lookAtHorizontal(e.group, bx, bz, dt, e);
        if (td > 2) moveEntity(e.group, bx, bz, e.speed * dt, "boss");
      }
      const movedBoss = Math.hypot(e.group.position.x - posBefore.x, e.group.position.z - posBefore.z) > 0.002;
      tickEntityJump(e, dt);
      updateHumanAnimation(e, dt, getAnimOpts(e, {
        moving: movedBoss,
        speed: e.speed,
        aiming,
        shooting: performance.now() - e.lastShot < 220,
        crouching: false,
        jumping: !!e.jumping,
      }));
      continue;
    }

    if (e.reloading) {
      const tPos = ammoStation?.tPos;
      if (tPos) {
        const td = Math.hypot(tPos.x - e.group.position.x, tPos.z - e.group.position.z);
        if (td > 1.6) {
          lookAtHorizontal(e.group, tPos.x, tPos.z, dt, e);
          moveNpc(e, tPos.x, tPos.z, (e.speed || 2.5) * 1.15, dt);
          tickEntityJump(e, dt);
          updateHumanAnimation(e, dt, getAnimOpts(e, {
            moving: true, speed: e.speed, aiming: false, shooting: false, crouching: false, jumping: !!e.jumping, sprint: true,
          }));
          continue;
        }
      }
      if (performance.now() >= e.reloadFinishAt) finishEnemyReload(e);
      else {
        lookAtHorizontal(e.group, px, pz, dt, e);
        tickEntityJump(e, dt);
        updateHumanAnimation(e, dt, getAnimOpts(e, {
          moving: false, speed: e.speed, aiming: true, shooting: false, crouching: true, jumping: !!e.jumping,
        }));
        continue;
      }
    }

    const lowHp = e.health < e.maxHealth * 0.45;
    const wantCover = seesPlayer && dist > 7 && e.intelligence < 0.88 && (lowHp || Math.random() < 0.38);

    if (seesPlayer) {
      if (e.intelligence > 0.9) e.state = "chase";
      if (wantCover && !e.coverTarget) {
        const cov = findCoverForEnemy(e.group.position.x, e.group.position.z, px, pz);
        if (cov) {
          e.state = "cover";
          e.coverTarget = { x: cov.x, z: cov.z };
        }
      }

      if (e.state === "cover" && e.coverTarget) {
        const cx = e.coverTarget.x;
        const cz = e.coverTarget.z;
        const cd = Math.hypot(cx - e.group.position.x, cz - e.group.position.z);
        lookAtHorizontal(e.group, px, pz, dt, e);
        if (cd > 1.2) {
          applyCrouchVisual(e, false);
          moveEntitySmooth(e, cx, cz, e.speed * 1.15, dt, "npc");
        } else {
          applyCrouchVisual(e, true);
          aiming = true;
          const fireMs = e.fireMs ?? ENEMY_FIRE_MS;
          const now = performance.now();
          if (shouldEnemyShoot(e, now, fireMs) && canShootFromCover(e, px, pz)) {
            e.lastShot = now;
            if (Math.random() < getEnemyAccuracy(e, dist, true)) enemyShootPlayer(e);
          }
        }
        if (!hasLineOfSight(e.group.position, camera.position) && cd < 1.5) {
          /* atrás da cobertura */
        }
      } else {
        e.state = "chase";
        e.coverTarget = null;
        applyCrouchVisual(e, dist < 6 && lowHp);
        lookAtHorizontal(e.group, px, pz, dt, e);
        aiming = true;
        const fireMs = e.fireMs ?? ENEMY_FIRE_MS;
        const now = performance.now();
        if (shouldEnemyShoot(e, now, fireMs)) {
          e.lastShot = now;
          if (Math.random() < getEnemyAccuracy(e, dist, e.crouching)) enemyShootPlayer(e);
          for (const h of helpers) {
            if (!h.alive) continue;
            const hd = Math.hypot(h.group.position.x - e.group.position.x, h.group.position.z - e.group.position.z);
            if (hd < dist && hd < 22 && hasLineOfSight(e.group.position, h.group.position) && Math.random() < 0.28) {
              damageHelper(h, 10 + Math.floor(Math.random() * 6), e.name);
            }
          }
        }
        if (dist > 3) {
          const squad = enemies.filter((o) => o.alive && !o.isBoss);
          const mt = getEnemyMoveTarget(e, px, pz, dt, squad);
          const safe = sanitizeMoveTarget(
            e.group.position.x,
            e.group.position.z,
            mt.x,
            mt.z,
            collides
          );
          const recentlyFiring = performance.now() - e.lastShot < 340;
          const spdMult = recentlyFiring
            ? 0.72
            : mt.retreat
              ? 1.15
              : mt.sprint
                ? 1.08
                : mt.strafe
                  ? 0.96
                  : 0.88;
          moveEntitySmooth(e, safe.x, safe.z, e.speed * spdMult, dt, "npc");
        }
      }
    } else if (e.state === "investigate" && alertPoint && alertTimer > 0) {
      const ax = alertPoint.x;
      const az = alertPoint.z;
      const ad = Math.hypot(ax - e.group.position.x, az - e.group.position.z);
      lookAtHorizontal(e.group, ax, az, dt, e);
      if (ad > 1.5) {
        moveNpc(e, ax, az, e.speed * 0.85, dt);
      } else {
        e.state = "chase";
        moveNpc(e, lastPlayerPos.x, lastPlayerPos.z, e.speed * 0.7, dt);
      }
      if (performance.now() > e.investigateUntil) e.state = "patrol";
    } else if (e.state === "chase") {
      lookAtHorizontal(e.group, lastPlayerPos.x, lastPlayerPos.z, dt, e);
      const cd = Math.hypot(lastPlayerPos.x - e.group.position.x, lastPlayerPos.z - e.group.position.z);
      if (cd > 2) moveNpc(e, lastPlayerPos.x, lastPlayerPos.z, e.speed * 0.75, dt);
      else e.state = "patrol";
    } else {
      e.state = "patrol";
      e.coverTarget = null;
      applyCrouchVisual(e, false);
      const td = Math.hypot(e.target.x - e.group.position.x, e.target.z - e.group.position.z);
      if (td < 1.5) pickNextPatrol(e);
      const patrolSafe = sanitizeMoveTarget(
        e.group.position.x,
        e.group.position.z,
        e.target.x,
        e.target.z,
        collides
      );
      moveEntitySmooth(e, patrolSafe.x, patrolSafe.z, e.speed, dt, "npc");
    }

    if (gameMode === "defuse" && !bombPlanted && dist < 12 && Math.random() < 0.004) {
      const site = mapData.bombSites[Math.floor(Math.random() * mapData.bombSites.length)];
      botPlantBomb(site);
      scoreT++;
      updateHUD();
    }

  if (e.alive && !e.isBoss && !e.jumping && !isHorrorMap(mapData)) {
      const sees = dist < 26 && hasLineOfSight(e.group.position, camera.position);
      if (shouldNpcJump(e, dist, sees || e.state === "chase")) tryJump(e);
    }
    tickEntityJump(e, dt);

    const moved = Math.hypot(e.group.position.x - posBefore.x, e.group.position.z - posBefore.z) > 0.001;
    const sprint = (e.moveVx || 0) ** 2 + (e.moveVz || 0) ** 2 > 12;
    const shootingAnim = performance.now() - e.lastShot < 340;
    updateHumanAnimation(e, dt, getAnimOpts(e, {
      moving: moved,
      speed: e.speed || 2.5,
      sprint,
      aiming: aiming || e.state === "chase" || e.state === "cover",
      shooting: shootingAnim,
      crouching: e.crouching,
      jumping: !!e.jumping,
    }));
  }
}

function updateHelpers(dt) {
  if (inCinematic || !helpers.length) return;
  const px = camera.position.x;
  const pz = camera.position.z;

  // lista de alvos vivos ordenada por distância ao jogador
  const live = enemies.filter((e) => e.alive);

  for (let i = 0; i < helpers.length; i++) {
    const h = helpers[i];
    if (!h.alive) continue;

    const posBefore = { x: h.group.position.x, z: h.group.position.z };
    let aiming = false;
    let shooting = false;

    const ranked = live
      .map((e) => ({
        e,
        d: Math.hypot(e.group.position.x - h.group.position.x, e.group.position.z - h.group.position.z),
      }))
      .sort((a, b) => a.d - b.d);

    // inteligência: com muitos inimigos cada ajudante pega um alvo diferente
    let pick = ranked[0] || null;
    if (h.smart > 0.35 && ranked.length > 1 && i < ranked.length) {
      pick = ranked[i];
      if (pick.d > 26 && ranked[0].d < pick.d) pick = ranked[0];
    }

    let tx = px - 2 + i * 2.5;
    let tz = pz + 2;
    let aimX = px;
    let aimZ = pz;
    const intel = h.intelligence ?? h.smart ?? 0.5;

    if (pick && pick.d < 26) {
      const target = pick.e;
      const canSee = hasLineOfSight(h.group.position, target.group.position);
      const move = getHelperMoveTarget(h, i, px, pz, target, helpers, intel);
      tx = move.x;
      tz = move.z;
      aimX = move.aimX;
      aimZ = move.aimZ;
      lookAtHorizontal(h.group, aimX, aimZ, dt, h);
      aiming = true;

      if (pick.d < 19 && canSee) {
        if (performance.now() - h.lastShot > (h.fireMs ?? 900)) {
          h.lastShot = performance.now();
          if (Math.random() < (h.acc ?? 0.5)) {
            const dmg = (h.dmgMin ?? 9) + Math.floor(Math.random() * ((h.dmgMax ?? 15) - (h.dmgMin ?? 9) + 1));
            damageEnemy(target, dmg, false, undefined, false);
          }
        }
        shooting = performance.now() - h.lastShot < 220;
      } else if (intel > 0.4 && !canSee) {
        const side = i === 0 ? 1 : -1;
        tx += side * 4;
        tz += side * 3;
      }

      if (!isHorrorMap(mapData) && shouldNpcJump(h, pick.d, canSee || pick.d < 20)) tryJump(h);
    } else {
      lookAtHorizontal(h.group, px, pz, dt, h);
    }
    moveEntitySmooth(h, tx, tz, h.speed ?? 2.6, dt, "npc");
    tickEntityJump(h, dt);

    const moved = Math.hypot(h.group.position.x - posBefore.x, h.group.position.z - posBefore.z) > 0.002;
    const hSprint = moved && (h.speed ?? 2.6) > 2.8;
    updateHumanAnimation(h, dt, getAnimOpts(h, {
      moving: moved,
      speed: h.speed ?? 2.6,
      sprint: hSprint,
      aiming,
      shooting,
      crouching: false,
      jumping: !!h.jumping,
    }));
  }
}

function hasLineOfSight(from, to) {
  const origin = new THREE.Vector3(from.x, 1.4, from.z);
  const target = new THREE.Vector3(to.x, 1.4, to.z);
  const dir = new THREE.Vector3().subVectors(target, origin).normalize();
  const ray = new THREE.Raycaster(origin, dir, 0, origin.distanceTo(target));
  if (ray.intersectObjects(wallMeshCache, false).length > 0) return false;
  // porta fechada bloqueia a visão para dentro/fora da sala do chefão
  if (!doorOpen && doorHitMeshes.length && ray.intersectObjects(doorHitMeshes, false).length > 0) return false;
  return true;
}

function moveNpc(e, tx, tz, speed, dt) {
  const nav = resolveNavTarget(e, tx, tz, mapData, collides, lastPlayerPos.x, lastPlayerPos.z);
  applyNpcSteering(e, nav.x, nav.z, speed, dt, collides, "npc");
}

function moveEntity(mesh, tx, tz, speed, who = "npc") {
  const dx = tx - mesh.position.x;
  const dz = tz - mesh.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = mesh.position.x + (dx / len) * speed;
  const nz = mesh.position.z + (dz / len) * speed;
  if (!collides(nx, mesh.position.z, 0.45, who)) mesh.position.x = nx;
  if (!collides(mesh.position.x, nz, 0.45, who)) mesh.position.z = nz;
}

function moveEntitySmooth(entity, tx, tz, maxSpeed, dt, who = "npc") {
  if (who === "npc" && entity.group) {
    const nav = resolveNavTarget(entity, tx, tz, mapData, collides, lastPlayerPos.x, lastPlayerPos.z);
    applyNpcSteering(entity, nav.x, nav.z, maxSpeed, dt, collides, who);
    return;
  }
  const mesh = entity.group || entity;
  const dx = tx - mesh.position.x;
  const dz = tz - mesh.position.z;
  const len = Math.hypot(dx, dz);
  const accel = Math.min(1, dt * (who === "npc" ? 14 : 11));

  if (len < 0.12) {
    entity.moveVx = (entity.moveVx || 0) * (1 - accel * 0.85);
    entity.moveVz = (entity.moveVz || 0) * (1 - accel * 0.85);
  } else {
    const wantVx = (dx / len) * maxSpeed;
    const wantVz = (dz / len) * maxSpeed;
    entity.moveVx = (entity.moveVx || 0) + (wantVx - (entity.moveVx || 0)) * accel;
    entity.moveVz = (entity.moveVz || 0) + (wantVz - (entity.moveVz || 0)) * accel;
  }

  const r = 0.45;
  let nx = mesh.position.x + (entity.moveVx || 0) * dt;
  let nz = mesh.position.z + (entity.moveVz || 0) * dt;

  if (!collides(nx, mesh.position.z, r, who)) mesh.position.x = nx;
  else {
    entity.moveVx = 0;
    nx = mesh.position.x;
  }
  if (!collides(mesh.position.x, nz, r, who)) mesh.position.z = nz;
  else {
    entity.moveVz = 0;
    nz = mesh.position.z;
  }

  if (nx === mesh.position.x && nz === mesh.position.z && ((entity.moveVx || 0) ** 2 + (entity.moveVz || 0) ** 2 > 0.01)) {
    const slideX = -(entity.moveVz || 0) * dt * 0.85;
    const slideZ = (entity.moveVx || 0) * dt * 0.85;
    if (!collides(mesh.position.x + slideX, mesh.position.z, r, who)) mesh.position.x += slideX;
    if (!collides(mesh.position.x, mesh.position.z + slideZ, r, who)) mesh.position.z += slideZ;
  }
}

function collides(x, z, r, who = "player") {
  const room = mapData.innerRoom;
  const gap = room.doorGap || { width: 2.6, centerZ: 0 };
  const gc = gap.centerZ ?? 0;
  const inBossDoorway =
    who === "player" &&
    doorOpen &&
    x >= room.minX - 0.6 - r &&
    x <= room.minX + 1.8 + r &&
    Math.abs(z - gc) < gap.width / 2 + 0.35 + r;

  _vCollide.set(x, 1, z);
  for (const w of walls) {
    if (inBossDoorway && w.isInnerWest) continue;
    w.box.clampPoint(_vCollide, _vClosest);
    if (_vClosest.distanceTo(_vCollide) < r) return true;
  }

  if (who === "boss") {
    if (!isInsideSecretRoom(x, z)) return true;
  } else if (who !== "player" && isInsideSecretRoom(x, z)) {
    return true;
  }

  if (who === "player" && !doorOpen) {
    if (Math.abs(x - room.minX) < 0.35 + r && Math.abs(z - gc) < gap.width / 2 + r) return true;
  }

  const lim = mapData.bounds?.limX ?? 24 * mapData.scale;
  const limZ = mapData.bounds?.limZ ?? 21 * mapData.scale;
  return x < -lim || x > lim || z < -limZ || z > limZ;
}

function updatePlayer(dt) {
  if (adminPreviewMode === "character") {
    updateAdminCharOrbit(dt);
    updateAdminHud();
    return;
  }

  if (adminSpectator && adminNoclip) {
    updateAdminFly(dt);
    updateAdminHud();
    return;
  }

  updateADS(dt);
  processLook();

  if (!roundActive || player.dead || inCinematic) {
    applyCameraRotation();
    return;
  }

  _vForward.set(0, 0, -1).applyAxisAngle(_vUp, yaw);
  _vRight.set(1, 0, 0).applyAxisAngle(_vUp, yaw);

  let inputX = 0, inputZ = 0;

  if (isMobileMode() && mobileControls) {
    const joy = mobileControls.getMove();
    if (Math.abs(joy.x) > 0.06 || Math.abs(joy.y) > 0.06) {
      inputX = _vForward.x * (-joy.y) + _vRight.x * joy.x;
      inputZ = _vForward.z * (-joy.y) + _vRight.z * joy.x;
    }
  } else {
    if (keys["KeyW"]) { inputX += _vForward.x; inputZ += _vForward.z; }
    if (keys["KeyS"]) { inputX -= _vForward.x; inputZ -= _vForward.z; }
    if (keys["KeyA"]) { inputX -= _vRight.x; inputZ -= _vRight.z; }
    if (keys["KeyD"]) { inputX += _vRight.x; inputZ += _vRight.z; }
  }

  const inputLen = Math.hypot(inputX, inputZ);
  const maxSpeed = isMobileMode() ? MOVE_SPEED_MOBILE : MOVE_SPEED;
  let targetVx = 0, targetVz = 0;
  if (inputLen > 0) {
    targetVx = (inputX / inputLen) * maxSpeed;
    targetVz = (inputZ / inputLen) * maxSpeed;
  }

  const accelBlend = 1 - Math.exp(-MOVE_ACCEL * dt);
  moveVel.x += (targetVx - moveVel.x) * accelBlend;
  moveVel.z += (targetVz - moveVel.z) * accelBlend;

  if (inputLen === 0) {
    const friction = 1 - Math.exp(-MOVE_FRICTION * dt);
    moveVel.x *= 1 - friction;
    moveVel.z *= 1 - friction;
    if (Math.abs(moveVel.x) < 0.02) moveVel.x = 0;
    if (Math.abs(moveVel.z) < 0.02) moveVel.z = 0;
  }

  const nx = camera.position.x + moveVel.x * dt;
  const nz = camera.position.z + moveVel.z * dt;
  if (!collides(nx, camera.position.z, 0.38)) camera.position.x = nx;
  else moveVel.x = 0;
  if (!collides(camera.position.x, nz, 0.38)) camera.position.z = nz;
  else moveVel.z = 0;

  const moving = Math.hypot(moveVel.x, moveVel.z) > 0.3;
  tickEntityJump(player, dt);
  const bob = player.grounded && moving ? Math.sin(performance.now() * 0.014) * 0.035 : 0;
  camera.position.y = PLAYER_EYE_HEIGHT + (player.jumpOffset || 0) + bob;

  if (isLabyrinthMap(mapData) && exitZone && checkExitReached(camera.position.x, camera.position.z, exitZone)) {
    endMatch("ct", { labyrinthWin: true });
    return;
  }

  if (isLabyrinthMap(mapData)) {
    const obj = document.getElementById("objective");
    if (obj) {
      const got = ["facao", "porrete", "katana"].filter((k) => collectedMelee[k]).length;
      const nearExit = exitZone && Math.hypot(camera.position.x - exitZone.x, camera.position.z - exitZone.z) < 8;
      obj.textContent = nearExit
        ? "Saída perto! Entre no portal verde."
        : `Armas: ${got}/3 • Saída no fim do labirinto • E = pegar arma`;
    }
    const near = tryPickupMelee(camera, meleePickups, 3.2);
    if (near && !near.collected) {
      const hint = document.getElementById("objective");
      if (hint) hint.textContent = `Pressione E — ${WEAPONS[near.id]?.name || near.id}`;
    }
  } else if (ammoStation?.ctPos && roundActive && !player.dead) {
    const d = Math.hypot(camera.position.x - ammoStation.ctPos.x, camera.position.z - ammoStation.ctPos.z);
    const obj = document.getElementById("objective");
    if (obj && d < 3.5) {
      obj.textContent = "Baú CT — pressione E ou clique no baú para munição máxima";
    }
  }

  applyCameraRotation();
}

function checkWin() {
  if (isLabyrinthMap(mapData)) return;
  const alive = enemies.filter((e) => e.alive).length;
  if (gameMode === "tdm") {
    if (scoreCT >= 15) return endMatch("ct");
    if (scoreT >= 15) return endMatch("t");
  }
  if (gameMode === "defuse" && alive === 0 && !bombPlanted) return endRound("ct");
  const banditsAlive = enemies.filter((e) => e.alive && !e.isBoss).length;
  if (gameMode === "tdm" && banditsAlive === 0) setTimeout(() => respawnAllEnemies(), 2500);
}

function respawnAllEnemies() {
  const diff = botDifficulty || (useBotDifficulty ? getBotDifficulty(botCount) : getDefaultDifficulty());
  const soloSuper = botCount === 1 && useBotDifficulty && diff.isSolo;

  if (soloSuper) {
    spawnEnemies();
    return;
  }

  const banditCount = enemies.filter((e) => !e.isBoss).length;
  const spawns = pickEnemySpawnPositions(banditCount, mapData.spawnCT.x, mapData.spawnCT.z);
  let i = 0;
  for (const e of enemies) {
    if (e.isBoss) continue;
    removeEnemyLabel(e);
    const sx = spawns[i]?.x ?? mapData.spawnT.x;
    const sz = spawns[i]?.z ?? mapData.spawnT.z;
    if (!e.alive) {
      scene.remove(e.group);
      const role = assignEnemyRole(i, banditCount);
      const weaponType = pickNpcWeaponType(i, banditCount, role);
      const char = createBandit(i, currentMapKey, { squadSize: banditCount, weaponType });
      char.group.position.set(sx, 0, sz);
      scene.add(char.group);
      e.group = char.group;
      e.hitMeshes = char.hitMeshes;
      e.head = char.head;
      e.role = role;
      e.npcWeapon = weaponType;
      bindCharacterAnim(e, char);
      initEnemyBrain(e, i, banditCount);
    } else {
      e.group.position.set(sx, 0, sz);
    }
    e.group.rotation.set(0, 0, 0);
    applyDifficultyToEnemy(e, diff, i);
    e.alive = true;
    e.ragdoll = false;
    e.state = "patrol";
    e.patrolIndex = i % mapData.patrolPoints.length;
    e.target = { x: sx, z: sz };
    e.crouching = false;
    e.coverTarget = null;
    initJumpState(e);
    updateEnemyHealthBar(e);
    if (!e.hpBarEl) createEnemyHealthBar(e);
    i++;
  }
}

function endRound(winner) {
  roundActive = false;
  if (winner === "ct") scoreCT++;
  else scoreT++;
  round++;
  updateHUD();

  if (gameMode === "defuse" && (scoreCT >= 3 || scoreT >= 3)) {
    return endMatch(scoreCT >= 3 ? "ct" : "t");
  }

  showOverlay(winner === "ct" ? "ROUND CT!" : "ROUND T!");
  setTimeout(() => {
    if (matchOver) return;
    roundActive = true;
    roundTime = gameMode === "defuse" ? 120 : 180;
    bombPlanted = false;
    if (bomb) { scene.remove(bomb); bomb = null; }
    initPlayer();
    enemyMoveAllowedAt = performance.now() + ENEMY_SPAWN_DELAY_MS;
    respawnAllEnemies();
    spawnHelpers();
    Object.keys(weapons).forEach((k) => {
      if (k === "1") {
        const def = getPrimaryWeapon(primaryWeaponId);
        weapons[k].mag = def.mag;
        weapons[k].reserve = def.reserve;
      } else if (k === "2") {
        weapons[k].mag = WEAPONS.glock.mag;
        weapons[k].reserve = WEAPONS.glock.reserve;
      } else {
        weapons[k].mag = 1;
        weapons[k].reserve = 0;
      }
    });
    innerBombTimer = INNER_BOMB_TIME;
    innerBombActive = doorOpen && !innerBombDefused;
    innerBombDefused = false;
    if (innerBombMesh) scene.remove(innerBombMesh);
    innerBombMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.35, 0.85),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    innerBombMesh.position.set(mapData.innerBomb.x, 0.22, mapData.innerBomb.z);
    scene.add(innerBombMesh);
    enemies = enemies.filter((e) => {
      if (e.isBoss) {
        scene.remove(e.group);
        removeEnemyLabel(e);
        return false;
      }
      return true;
    });
    bossSpawned = false;
    spawnBoss(); // guardião sempre volta para a sala no round novo
    showOverlay(`ROUND ${round}`);
  }, 3000);
}

function endMatch(winner, opts = {}) {
  if (matchOver && !opts.skipCinematic) return;
  matchOver = true;
  roundActive = false;
  mobileControls?.hide();
  document.exitPointerLock?.();
  hud.classList.add("hidden");
  hideDeathChoice();

  if (opts.labyrinthWin) {
    inCinematic = false;
    showOverlay("Você escapou das trevas!");
    setTimeout(() => showEndScreen(true), 1200);
    return;
  }

  if (opts.skipCinematic) {
    showEndScreen(winner === "ct");
    return;
  }

  inCinematic = true;
  const mapCenter = {
    x: (mapData.spawnCT.x + mapData.spawnT.x) / 2,
    z: (mapData.spawnCT.z + mapData.spawnT.z) / 2,
  };
  const moveFn = (mesh, tx, tz, speed, who) => moveEntity(mesh, tx, tz, speed, who);

  if (winner === "ct") {
    playVictoryCinematic({
      scene,
      camera,
      playerName,
      exitPoint: { x: mapData.spawnCT.x, z: mapData.spawnCT.z - 5 },
      subtitleEl: null,
      cinematicEl,
      moveWithCollision: moveFn,
      getWalkableNear: (x, z) => {
        const offsets = [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [2, 2], [-2, -2]];
        for (const [ox, oz] of offsets) {
          const px = x + ox;
          const pz = z + oz;
          if (!collides(px, pz, 0.4, "npc")) return { x: px, z: pz };
        }
        return { x, z };
      },
      callback: () => showEndScreen(true),
    });
  } else {
    const celebrateUsed = [];
    playDefeatCinematic({
      scene,
      camera,
      enemies,
      playerName,
      mapCenter,
      subtitleEl: null,
      cinematicEl,
      moveWithCollision: moveFn,
      getCelebrateTarget: () => pickWalkablePatrolPoint(celebrateUsed),
      callback: () => showEndScreen(false),
    });
  }
}

function showEndScreen(won) {
  inCinematic = false;
  hideCinematicUI(cinematicEl);
  mobileControls?.hide();
  document.body.classList.remove("game-active");
  deathScreen?.classList.add("hidden");
  deathScreen?.classList.remove("active");

  const card = endScreen.querySelector(".end-card");
  card?.classList.toggle("end-win", won);
  card?.classList.toggle("end-lose", !won);

  endScreen.classList.remove("hidden");
  endScreen.classList.add("active");

  document.getElementById("endBadge").textContent = won ? "🏆" : "💀";
  document.getElementById("endTitle").textContent = won ? "MISSÃO CUMPRIDA!" : "DERROTA";
  document.getElementById("endSubtitle").textContent = won
    ? "Os reféns foram resgatados com sucesso."
    : "Os bandidos dominaram a área.";

  const grid = document.getElementById("endStatsGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="end-stat-box"><span class="label">PLACAR CT</span><span class="value">${scoreCT}</span></div>
      <div class="end-stat-box"><span class="label">PLACAR T</span><span class="value">${scoreT}</span></div>
      <div class="end-stat-box"><span class="label">ABATES</span><span class="value">${kills}</span></div>
      <div class="end-stat-box"><span class="label">MORTES</span><span class="value">${deaths}</span></div>
    `;
  }

  document.getElementById("endStats").textContent =
    `${playerName} • Round ${round} • Modo ${gameMode === "defuse" ? "Desarmar" : "Eliminação"}`;
}

function updateHUD() {
  document.getElementById("scoreCT").textContent = scoreCT;
  document.getElementById("scoreT").textContent = scoreT;
  document.getElementById("roundText").textContent = `ROUND ${round}`;
  const coinsEl = document.getElementById("hudCoins");
  if (coinsEl) coinsEl.textContent = `${sessionCoins} 🪙`;
}

function updateHealthHUD() {
  const h = Math.max(0, player.health);
  document.getElementById("healthFill").style.width = `${h}%`;
  document.getElementById("healthText").textContent = `${Math.round(h)} HP`;
}

function updateAmmoHUD() {
  const w = currentWeapon;
  const nameEl = document.getElementById("weaponName");
  const ammoEl = document.getElementById("ammoText");
  if (!w) {
    if (nameEl) nameEl.textContent = isLabyrinthMap(mapData) ? "Desarmado" : "—";
    if (ammoEl) ammoEl.textContent = "—";
    return;
  }
  if (nameEl) nameEl.textContent = w.name;
  if (ammoEl) ammoEl.textContent = w.melee ? "Corpo a corpo" : `${w.mag} / ${w.reserve}`;
}

function addKillfeed(killer, victim) {
  const el = document.createElement("div");
  el.className = "entry";
  el.textContent = `${killer} ☠ ${victim}`;
  document.getElementById("killfeed").prepend(el);
  setTimeout(() => el.remove(), 4000);
}

function showOverlay(text) {
  overlay.classList.remove("hidden");
  overlayMsg.textContent = text;
  setTimeout(() => overlay.classList.add("hidden"), 1800);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function applyAdminNightVision(on) {
  adminNightVision = on;
  document.body.classList.toggle("admin-nvg", on);
  if (!mapData) return;
  applyMapAtmosphere();
  if (on && isDarkMap(mapData)) {
    if (renderer) configureCharacterRenderer(renderer, isLabyrinthMap(mapData) ? 1.08 : 1.2);
    if (hemiLight) hemiLight.intensity *= 2.4;
    if (ambientLight) ambientLight.intensity *= 2.6;
    if (sunLight) sunLight.intensity *= 2.2;
    if (fillLight) fillLight.intensity *= 2.2;
    if (scene.fog) {
      scene.fog.near *= 0.25;
      scene.fog.far *= 2.8;
    }
  }
}

function updateAdminHud() {
  const el = document.getElementById("adminHud");
  if (!el) return;
  if (!adminSpectator && !adminPreviewMode) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  const meta = getMapMeta(currentMapKey);
  if (adminPreviewMode === "character") {
    el.innerHTML =
      "<strong>Preview personagem</strong><br>" +
      "Mouse gira • Scroll zoom • ESC menu";
    return;
  }
  const nvg = adminNightVision ? "ON" : "OFF";
  el.innerHTML =
    `<strong>Admin espectador</strong><br>` +
    `Mapa: ${meta.name}<br>` +
    `Tamanho: <strong>${meta.widthM} m × ${meta.heightM} m</strong> (~${meta.areaM2} m²)<br>` +
    `WASD voar • Espaço/Ctrl subir/descer • N visão noturna (${nvg}) • ESC menu`;
}

function updateAdminFly(dt) {
  processLook();
  _vForward.set(0, 0, -1).applyAxisAngle(_vUp, yaw);
  _vRight.set(1, 0, 0).applyAxisAngle(_vUp, yaw);
  let mx = 0;
  let mz = 0;
  let my = 0;
  if (keys["KeyW"]) {
    mx += _vForward.x;
    mz += _vForward.z;
  }
  if (keys["KeyS"]) {
    mx -= _vForward.x;
    mz -= _vForward.z;
  }
  if (keys["KeyA"]) {
    mx -= _vRight.x;
    mz -= _vRight.z;
  }
  if (keys["KeyD"]) {
    mx += _vRight.x;
    mz += _vRight.z;
  }
  if (keys["Space"]) my += 1;
  if (keys["ControlLeft"] || keys["KeyC"]) my -= 1;
  const boost = keys["ShiftLeft"] ? 2.6 : 1;
  const speed = adminFlySpeed * boost;
  const len = Math.hypot(mx, mz, my);
  if (len > 0) {
    camera.position.x += (mx / len) * speed * dt;
    camera.position.y += (my / len) * speed * dt;
    camera.position.z += (mz / len) * speed * dt;
  }
  applyCameraRotation();
}

function updateAdminCharOrbit(dt) {
  if (lookDelta.x || lookDelta.y) {
    adminCharOrbit.yaw -= lookDelta.x * 0.005;
    adminCharOrbit.pitch = Math.max(-0.15, Math.min(1.35, adminCharOrbit.pitch - lookDelta.y * 0.004));
    lookDelta.x = 0;
    lookDelta.y = 0;
  }
  if (!adminPreviewPivot) return;
  const p = adminPreviewPivot.position;
  const d = adminCharOrbit.dist;
  const cp = Math.cos(adminCharOrbit.pitch);
  camera.position.set(
    p.x + Math.sin(adminCharOrbit.yaw) * cp * d,
    p.y + 1.25 + Math.sin(adminCharOrbit.pitch) * d,
    p.z + Math.cos(adminCharOrbit.yaw) * cp * d
  );
  camera.lookAt(p.x, p.y + 1.15, p.z);
}

function onAdminWheel(e) {
  if (adminPreviewMode !== "character") return;
  e.preventDefault();
  adminCharOrbit.dist = Math.max(1.8, Math.min(12, adminCharOrbit.dist + e.deltaY * 0.008));
}

function adminExitToMenu() {
  adminSpectator = false;
  adminNoclip = false;
  adminPreviewMode = null;
  adminPreviewPivot = null;
  adminPreviewEntity = null;
  applyAdminNightVision(false);
  disposeFlashlight();
  roundActive = false;
  matchOver = true;
  inCinematic = false;
  document.exitPointerLock?.();
  mobileControls?.hide();
  hud?.classList.add("hidden");
  menu?.classList.remove("hidden");
  menu?.classList.add("active");
  document.body.classList.remove("game-active");
  updateAdminHud();
  if (typeof window.showAdminForAccount === "function") {
    import("./player-account.js").then((m) => {
      window.showAdminForAccount({ isAdmin: m.isSessionAdmin() });
    });
  }
}

function buildAdminPreviewCharacter(type, index) {
  if (type === "boss") return createBoss();
  if (type === "helper") return createHelper(index, "dust");
  if (type === "horror") return createBandit(index, "horror");
  return createBandit(index, currentMapKey || "dust");
}

function startCharacterPreviewSession(config) {
  try {
    playMode = document.querySelector(".device-btn.selected")?.dataset.device || "desktop";
    playerName = document.getElementById("playerName")?.value?.trim() || "Admin";
    adminPreviewMode = "character";
    adminSpectator = true;
    adminNoclip = true;
    adminCharOrbit = { yaw: 0.6, pitch: 0.25, dist: 4.2 };
    currentMapKey = "dust";
    mapData = MAPS.dust;

    menu.classList.remove("active");
    menu.classList.add("hidden");
    endScreen?.classList.add("hidden");
    deathScreen?.classList.add("hidden");
    hud?.classList.add("hidden");
    document.body.classList.add("game-active");

    initThree();
    applyMapAtmosphere();

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.88, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(14, 28, 0x445566, 0x222833));

    const type = config.charType || "bandit";
    const idx = config.charIndex || 0;
    const char = buildAdminPreviewCharacter(type, idx);
    char.group.position.set(0, 0, 0);
    scene.add(char.group);
    adminPreviewPivot = char.group;
    adminPreviewEntity = {
      group: char.group,
      rig: char.rig,
      mixer: char.mixer,
      animActions: char.animActions,
      gun: char.gun,
      weaponPivot: char.weaponPivot,
      npcWeapon: char.weaponType || "ak47",
      bones: char.bones,
      horrorMode: type === "horror",
      alwaysHoldWeapon: !!char.gun && type !== "horror",
      alive: true,
      baseY: 0,
    };
    initCharacterAnim(adminPreviewEntity);

    matchOver = false;
    roundActive = true;
    player.dead = false;
    clock = clock || new THREE.Clock();
    updateAdminHud();

    if (!window.__gameAnimating) {
      window.__gameAnimating = true;
      animate();
    }
    if (!window.__adminWheelBound && canvas) {
      window.__adminWheelBound = true;
      canvas.addEventListener("wheel", onAdminWheel, { passive: false });
    }
  } catch (err) {
    console.error(err);
    alert("Erro no preview: " + err.message);
    adminExitToMenu();
  }
}

function startAdminPreview(config) {
  if (config?.preview === "character") startCharacterPreviewSession(config);
  else startGame(config);
}

function adminSpawnBanditNear() {
  const i = enemies.filter((e) => !e.isBoss).length;
  const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(_vUp, yaw);
  const x = camera.position.x + fwd.x * 3;
  const z = camera.position.z + fwd.z * 3;
  const char = createBandit(i % 8, currentMapKey, { squadSize: 1, weaponType: "ak47" });
  char.group.position.set(x, 0, z);
  scene.add(char.group);
  const diff = botDifficulty || getDefaultDifficulty();
  const enemy = {
    group: char.group,
    hitMeshes: char.hitMeshes,
    head: char.head,
    health: diff.hp,
    maxHealth: diff.hp,
    team: "t",
    lastShot: 0,
    fireMs: diff.fireMs,
    dmgMin: diff.dmgMin,
    dmgMax: diff.dmgMax,
    coverAcc: diff.coverAcc,
    chaseAcc: diff.chaseAcc,
    state: "patrol",
    patrolIndex: 0,
    investigateUntil: 0,
    target: { x, z },
    speed: diff.speedMax,
    name: char.name,
    alive: true,
    ragdoll: false,
    crouching: false,
    baseY: 0,
  };
  initJumpState(enemy);
  initEnemyAmmo(enemy);
  initEnemyBrain(enemy, i, 1);
  createEnemyHealthBar(enemy);
  bindCharacterAnim(enemy, char);
  enemies.push(enemy);
  return enemy.name;
}

function adminSpawnHelperNear() {
  const i = helpers.length;
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(_vUp, yaw);
  const x = camera.position.x + right.x * 2.5;
  const z = camera.position.z + right.z * 2.5;
  const char = createHelper(i, currentMapKey);
  char.group.position.set(x, 0, z);
  scene.add(char.group);
  const stats = getHelperStats();
  const helper = {
    group: char.group,
    hitMeshes: char.hitMeshes,
    head: char.head,
    health: stats.hp,
    maxHealth: stats.hp,
    team: "ct",
    lastShot: 0,
    name: char.name,
    alive: true,
    isHelper: true,
    alwaysShowHp: true,
    fireMs: stats.fireMs,
    acc: stats.acc,
    dmgMin: stats.dmgMin,
    dmgMax: stats.dmgMax,
    speed: stats.speed,
    smart: stats.smart,
    intelligence: stats.smart,
    baseY: 0,
  };
  initJumpState(helper);
  createEnemyHealthBar(helper);
  bindCharacterAnim(helper, char);
  helpers.push(helper);
  return helper.name;
}

function adminMoveNearestBlock(dx, dz) {
  if (!wallMeshCache.length) return "Nenhum bloco perto.";
  let best = null;
  let bestD = Infinity;
  for (const mesh of wallMeshCache) {
    const d = mesh.position.distanceTo(camera.position);
    if (d < bestD) {
      bestD = d;
      best = mesh;
    }
  }
  if (!best || bestD > 18) return "Aproxime-se de uma parede (até 18 m).";
  best.position.x += dx;
  best.position.z += dz;
  for (const w of walls) {
    if (w.mesh === best) w.box.setFromObject(best);
  }
  return `Bloco movido ${dx.toFixed(1)} m, ${dz.toFixed(1)} m.`;
}

function runAdminCommand(raw) {
  if (!roundActive && !adminPreviewMode) return "Inicie uma partida admin primeiro.";
  const line = (raw || "").trim();
  if (!line) return null;
  const parts = line.replace(/^\//, "").split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  if (cmd === "help") {
    return "Comandos: /add t | /add ct | /weapon ak47 | /noclip | /tp x z | /nv | /bots N | /clear | /block dx dz";
  }
  if (cmd === "add" && parts[1] === "t") {
    if (!scene || isNoCombatMap(mapData)) return "Mapa sem combate.";
    return "Terrorista: " + adminSpawnBanditNear();
  }
  if (cmd === "add" && parts[1] === "ct") {
    if (!scene || isNoCombatMap(mapData)) return "Mapa sem combate.";
    return "CT aliado: " + adminSpawnHelperNear();
  }
  if (cmd === "weapon" && parts[1]) {
    const id = parts[1].toLowerCase();
    if (!getPrimaryWeapon(id)) return "Arma inválida. Ex: ak47, scar, m4a1, awm, doze, ump";
    primaryWeaponId = id;
    initWeapons();
    return "Arma trocada: " + getPrimaryWeapon(id).name;
  }
  if (cmd === "noclip") {
    adminNoclip = !adminNoclip;
    adminSpectator = adminNoclip || adminPreviewMode === "map";
    return adminNoclip ? "Noclip ativado." : "Noclip desativado.";
  }
  if (cmd === "tp" && parts.length >= 3) {
    const x = parseFloat(parts[1]);
    const z = parseFloat(parts[2]);
    if (Number.isNaN(x) || Number.isNaN(z)) return "Uso: /tp x z";
    camera.position.x = x;
    camera.position.z = z;
    return `Teleportado para ${x}, ${z}.`;
  }
  if (cmd === "nv") {
    applyAdminNightVision(!adminNightVision);
    updateAdminHud();
    return adminNightVision ? "Visão noturna ON." : "Visão noturna OFF.";
  }
  if (cmd === "bots" && parts[1]) {
    const n = Math.min(20, Math.max(0, parseInt(parts[1], 10)));
    if (Number.isNaN(n)) return "Uso: /bots 4";
    botCount = n;
    const el = document.getElementById("botCount");
    if (el) el.value = String(n);
    if (n > 0 && !isNoCombatMap(mapData)) spawnEnemies();
    return `${n} bot(s) — inimigos respawnados.`;
  }
  if (cmd === "clear") {
    enemies.filter((e) => !e.isBoss).forEach((e) => {
      if (e.group) scene.remove(e.group);
      removeEnemyLabel(e);
    });
    enemies = enemies.filter((e) => e.isBoss);
    return "Inimigos removidos (chefão mantido).";
  }
  if (cmd === "block" && parts.length >= 3) {
    const dx = parseFloat(parts[1]);
    const dz = parseFloat(parts[2]);
    if (Number.isNaN(dx) || Number.isNaN(dz)) return "Uso: /block dx dz (metros)";
    return adminMoveNearestBlock(dx, dz);
  }
  return "Comando desconhecido. Digite /help";
}

function animate() {
  requestAnimationFrame(animate);
  if (!clock || !renderer || !scene || !camera) return;

  const dt = Math.min(clock.getDelta(), 0.033);
  frameCount++;

  if (matchOver && !isCinematicActive() && !inCinematic) {
    renderer.render(scene, camera);
    return;
  }

  updateBloodSpray(bloodParticles, dt, scene);

  if (!inCinematic && !isCinematicActive()) {
    if (weaponView) {
      const moving = Math.hypot(moveVel.x, moveVel.z) > 0.3;
      updateWeaponView(weaponView, dt, moving);
    }

    if (frameCount % 3 === 0) updateEnemyLabels([...enemies, ...helpers], camera);

    if (roundActive && !player.dead && !isLabyrinthMap(mapData) && adminPreviewMode !== "map") {
      roundTime -= dt;
      hudTimerAcc += dt;
      if (hudTimerAcc >= 0.1) {
        hudTimerAcc = 0;
        document.getElementById("timer").textContent = formatTime(Math.max(0, roundTime));
      }
      if (roundTime <= 0) {
        if (gameMode === "defuse" && bombPlanted) endMatch("t");
        else if (gameMode === "defuse") endRound("ct");
        else if (scoreT > scoreCT) endMatch("t");
        else if (scoreCT > scoreT) endMatch("ct");
        else endRound(scoreCT >= scoreT ? "ct" : "t");
      }
      if (bombPlanted) roundTime = Math.min(roundTime, 40);
    }

    updateEnemySpawnCountdown();
    updatePlayer(dt);
    if (adminPreviewMode === "character" && adminPreviewEntity) {
      updateHumanAnimation(adminPreviewEntity, dt, getAnimOpts(adminPreviewEntity, {
        moving: false,
        speed: 0,
        shooting: false,
        reload: false,
        jump: false,
        grounded: true,
      }));
    }
    if (!isNoCombatMap(mapData)) {
      updateEnemies(dt);
      updateHelpers(dt);
    }
    if (isLabyrinthMap(mapData)) {
      updateMeleePickups(meleePickups, dt);
      updateExitZone(exitZone, dt);
    }
    updateDoor(dt);
    updateInnerBomb(dt);

    if (!player.dead && !adminSpectator && !adminPreviewMode) {
      if (isMobileMode() && mobileControls?.isFiring()) {
        if (!tryInteractWorld()) shoot();
      } else if (currentWeapon?.auto && mouseDown && pointerLocked) {
        shoot();
      }
    }
  }

  renderer.render(scene, camera);
}

window.startStrikeZone = startGame;
window.startAdminPreview = startAdminPreview;
window.runAdminCommand = runAdminCommand;
window.__strikeZoneReady = true;

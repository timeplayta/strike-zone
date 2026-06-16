import * as THREE from "three";
import {
  getBotDifficulty as getBotDifficultyFromModule,
  ENEMY_BASE_HP,
  ENEMY_BASE_FIRE_MS,
} from "./bot-difficulty.js";
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
import { createWeaponView, setWeaponView, setWeaponADS, triggerMuzzleFlash, triggerMeleeSwing, triggerReloadAnimation, updateWeaponView, hideAllWeapons, applyWeaponSkinToView } from "./weapon-view.js";
import { findWeaponSkinItem } from "./weapon-skin-apply.js";
import { spawnMeleePickups, updateMeleePickups, tryPickupMelee, collectMeleePickup } from "./melee-pickups.js";
import { spawnBattleRoyaleLoot, updateBattleRoyaleLoot, tryPickupBattleRoyaleLoot, collectBattleRoyaleLoot } from "./battle-royale-loot.js";
import { createExitZone, updateExitZone, checkExitReached } from "./exit-zone.js";
import { playGunshot, playEmptyClip } from "./audio.js";
import { showJumpscareOverlay, isJumpscareActive } from "./horror-jumpscare.js";
import {
  spawnLabyrinthMonsters,
  clearLabyrinthMonsters,
  updateLabyrinthMonsters,
  createTrevasMonsterMesh,
  LABYRINTH_MONSTER_DEFS,
} from "./horror-monsters.js";
import { isSessionAdmin } from "./player-account.js";
import {
  LOW_GRAPHICS,
  MAX_PIXEL_RATIO,
  ENABLE_ANTIALIAS,
  ENEMY_LABEL_FRAME_SKIP,
  BLOOD_SPRAY_MUL,
} from "./perf-config.js";
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
let weaponPickPending = false;
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
const ENEMY_HP = ENEMY_BASE_HP;
const BOSS_HP = 200;
const INNER_BOMB_TIME = 90;
const ENEMY_FIRE_MS = ENEMY_BASE_FIRE_MS;
const BOSS_FIRE_MS = 353;
const BASE_FOV = 75;
const ADS_WEAPONS = ["ak47", "scar", "awm", "bazooka", "revolver"];
const ENEMY_SPAWN_DELAY_MS = 3000;
const MIN_SPAWN_DIST_FROM_PLAYER = 18;

let botCount = 10;
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
let battleRoyaleLoot = null;
let battleRoyaleDoors = [];
let exitZone = null;
let currentMeleeId = null;
let collectedMelee = { facao: false, porrete: false, katana: false };

let adminSpectator = false;
let adminNoclip = false;
let adminNightVision = false;
let adminPreviewMode = null;
let adminFlySpeed = 14;
let adminHorrorFullLight = false;
let adminLiveSpectator = false;
let devLightBoost = 0;
let devFogFarBonus = 0;
let adminGodMode = false;
let devMoveSpeedMul = 1;
let lastAdminJumpTap = 0;
let lastAdminCharPreviewJumpTap = 0;
let adminCharPreviewFly = false;
const ADMIN_DOUBLE_JUMP_MS = 450;
let adminPreviewPivot = null;
let adminPreviewEntity = null;
let adminCharOrbit = { yaw: 0.6, pitch: 0.25, dist: 4.2 };

let deathJumpscareRunning = false;
let flashlightLight = null;
let flashlightFill = null;
let flashlightTarget = null;
let flashlightEquipped = false;

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const endScreen = document.getElementById("endScreen");
const deathScreen = document.getElementById("deathScreen");
const canvas = document.getElementById("gameCanvas");
const overlay = document.getElementById("overlay");
const overlayMsg = document.getElementById("overlayMsg");
const cinematicEl = document.getElementById("cinematic");

/** Dificuldade: 1 super / 2 muito fortes / 10 normais / 20 fracos */
function getBotDifficulty(count) {
  return getBotDifficultyFromModule(count);
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
  if (weaponPickPending) return;
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
  refillWeaponToMax(weapons[2], WEAPONS[weapons[2]?.id] || WEAPONS.glock);
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

function equipBattleRoyaleWeapon(id) {
  const def = WEAPONS[id];
  if (!def) return false;
  if (def.melee) {
    equipMelee(id);
    return true;
  }
  if (def.slot === 2) {
    weapons[2] = { ...def, mag: def.mag, reserve: def.reserve, lastShot: 0 };
    switchWeapon(2);
    showOverlay(`Loot: ${def.name}`);
    return true;
  }
  primaryWeaponId = id;
  weapons[1] = { ...def, mag: def.mag, reserve: def.reserve, lastShot: 0 };
  switchWeapon(1);
  applyPlayerWeaponSkins();
  showOverlay(`Loot: ${def.name}`);
  return true;
}

function tryInteractBattleRoyaleLoot() {
  if (!mapData?.openWorld || !battleRoyaleLoot || player.dead || inCinematic) return false;
  let item = tryPickupBattleRoyaleLoot(camera, battleRoyaleLoot, 3.4);
  if (!item && battleRoyaleLoot.hitMeshes?.length) {
    const ray = new THREE.Raycaster(camera.position.clone(), getShootDirection(), 0, 5);
    const hits = ray.intersectObjects(battleRoyaleLoot.hitMeshes, false);
    if (hits.length) item = battleRoyaleLoot.items.find((i) => i.uid === hits[0].object.userData.brLootId && !i.collected);
  }
  if (!item) return false;
  collectBattleRoyaleLoot(scene, battleRoyaleLoot, item);
  if (item.kind === "ammo") {
    if (item.ammo === "doze") {
      if (primaryWeaponId === "doze") refillWeaponToMax(weapons[1], WEAPONS.doze);
      else weapons[1].reserve = Math.min((weapons[1].reserve || 0) + 18, WEAPONS[primaryWeaponId]?.maxTotal || 120);
      showOverlay("Loot: munição de doze");
    } else {
      refillAllPlayerAmmo();
      showOverlay("Loot: munição AR");
    }
    updateAmmoHUD();
    return true;
  }
  return equipBattleRoyaleWeapon(item.id);
}

function createBattleRoyaleDoor(def) {
  const material = new THREE.MeshStandardMaterial({
    color: def.tint || 0x6b4423,
    roughness: 0.82,
    metalness: 0.05,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(def.w || 4.4, def.h || 3, 0.28), material);
  door.position.set(def.x, (def.h || 3) / 2, def.z);
  door.rotation.y = def.rot || 0;
  door.userData.brDoorId = def.id;
  door.userData.baseRot = door.rotation.y;
  door.userData.w = def.w || 4.4;
  door.userData.h = def.h || 3;
  door.userData.d = 0.28;
  return {
    id: def.id,
    mesh: door,
    x: def.x,
    z: def.z,
    w: def.w || 4.4,
    h: def.h || 3,
    open: false,
    angle: 0,
  };
}

function spawnBattleRoyaleDoors() {
  battleRoyaleDoors = [];
  for (const def of mapData.brDoors || []) {
    const door = createBattleRoyaleDoor(def);
    scene.add(door.mesh);
    battleRoyaleDoors.push(door);
  }
}

function tryInteractBattleRoyaleDoor() {
  if (!mapData?.openWorld || !battleRoyaleDoors.length || player.dead || inCinematic) return false;
  const ray = new THREE.Raycaster(camera.position.clone(), getShootDirection(), 0, 6);
  const hits = ray.intersectObjects(battleRoyaleDoors.map((d) => d.mesh), false);
  if (!hits.length) return false;
  const id = hits[0].object.userData.brDoorId;
  const door = battleRoyaleDoors.find((d) => d.id === id);
  if (!door) return false;
  door.open = !door.open;
  showOverlay(door.open ? "Porta aberta" : "Porta fechada");
  return true;
}

function updateBattleRoyaleDoors(dt) {
  for (const door of battleRoyaleDoors) {
    const target = door.open ? -Math.PI * 0.62 : 0;
    door.angle += (target - door.angle) * Math.min(1, dt * 9);
    door.mesh.rotation.y = (door.mesh.userData.baseRot || 0) + door.angle;
  }
}

function tryInteractWorld() {
  if (tryInteractBattleRoyaleDoor()) return true;
  if (tryInteractBattleRoyaleLoot()) return true;
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
    onJump: () => handlePlayerJump(),
    onFlashlight: () => toggleFlashlight(),
  });
}

function applyPlayModeUI() {
  document.body.classList.toggle("mode-mobile", isMobileMode());
  document.body.classList.toggle("mode-desktop", !isMobileMode());
  document.body.classList.toggle("game-active", !menu.classList.contains("active"));
  document.body.classList.toggle("play-labyrinth", isLabyrinthMap(mapData));
  document.body.classList.toggle("play-defuse", gameMode === "defuse" && !isLabyrinthMap(mapData));

  const mobBomb = document.getElementById("btnBomb");
  if (mobBomb) mobBomb.classList.toggle("hidden", gameMode !== "defuse" || isLabyrinthMap(mapData));

  const fireBtn = document.getElementById("btnFire");
  if (fireBtn) fireBtn.textContent = isLabyrinthMap(mapData) ? "ATACAR" : "ATIRAR";

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

function needsRoundWeaponPick() {
  if (adminPreviewMode === "map") return false;
  if (!mapData) return false;
  return !isLabyrinthMap(mapData);
}

function finishRoundWeaponPick(id) {
  primaryWeaponId = id;
  initWeapons();
  weaponPickPending = false;
  enemyMoveAllowedAt = Math.max(
    enemyMoveAllowedAt,
    performance.now() + ENEMY_SPAWN_DELAY_MS
  );
}

function offerRoundWeaponPick() {
  if (!needsRoundWeaponPick()) return Promise.resolve(primaryWeaponId);
  weaponPickPending = true;
  return import("./round-weapon-picker.js").then(
    (mod) =>
      new Promise((resolve) => {
        mod.showRoundWeaponPicker((id) => {
          finishRoundWeaponPick(id);
          resolve(id);
        });
      })
  );
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
  adminHorrorFullLight = false;
  window.__adminHorrorFullLight = false;
  devLightBoost = 0;
  devFogFarBonus = 0;
  adminGodMode = false;
  devMoveSpeedMul = 1;
  adminLiveSpectator = false;
  deathJumpscareRunning = false;
  lastAdminJumpTap = 0;
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
    primaryWeaponId = config.primaryWeaponId || "ak47";
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
      const requestedBots = parseInt(document.getElementById("botCount")?.value || "10", 10);
      const maxBots = mapData.maxBots || 20;
      botCount = mapData.defaultBotCount || Math.min(maxBots, Math.max(1, requestedBots));
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
    if (camera && mapData.openWorld) {
      camera.far = 1800;
      camera.updateProjectionMatrix();
    }
    buildMap();
    bakeWallColliders();
    initPlayer();
    if (!adminPreviewMode && isHorrorMap(mapData) && !isLabyrinthMap(mapData)) {
      spawnLabyrinthMonsters(scene, mapData);
    }
    enemyMoveAllowedAt = performance.now() + (isLabyrinthMap(mapData) ? 0 : botCount === 1 ? 900 : ENEMY_SPAWN_DELAY_MS);
    const mapPreviewOnly = adminPreviewMode === "map";
    if (!mapPreviewOnly && !isNoCombatMap(mapData)) spawnEnemies();
    if (!mapPreviewOnly) spawnHelpers();
    initWeapons();
    roundTime = mapPreviewOnly ? 99999 : isLabyrinthMap(mapData) ? 9999 : gameMode === "defuse" ? 120 : 180;
    roundActive = true;
    collectedMelee = { facao: false, porrete: false, katana: false };
    currentMeleeId = null;

    const showMatchOverlay = () => {
      if (mapPreviewOnly) {
        showOverlay("Espectador — W na mira • Espaço/Ctrl/X subir/descer • ESC menu");
        document.getElementById("objective").textContent = "Inspeção de mapa (admin)";
        document.getElementById("timer").textContent = "∞";
        hud.classList.add("hidden");
      } else if (isLabyrinthMap(mapData)) {
        showOverlay("Labirinto das Trevas — 3 monstros no escuro • J = lanterna");
        document.getElementById("objective").textContent =
          "J = lanterna • O Gosmento, o Gigante e Bam-Bam estão nas trevas";
        document.getElementById("timer").textContent = "∞";
      } else if (isHorrorMap(mapData)) {
        showOverlay("Modo terror — 3 monstros nas sombras • J = lanterna");
        document.getElementById("objective").textContent =
          "Sobreviva — Gosmento, Gigante e Bam-Bam estão no mapa • J = lanterna";
      } else {
        showOverlay(`ROUND ${round} — Inimigos entram em 3s`);
        document.getElementById("objective").textContent = isMobileMode()
          ? gameMode === "defuse"
            ? "Joystick mover • Direita mirar • ATIRAR • B = bomba"
            : "Elimine os bandidos — joystick, mira e ATIRAR"
          : gameMode === "defuse"
            ? `Passe pelo CENTRO do mapa → sala do guardião (200 HP) • ${botCount} bandido(s) • Botão direito = mirar`
            : `Elimine ${botCount} bandido(s) — centro do mapa = sala do guardião musculoso • Botão direito = mirar`;
      }
    };

    const requestPointerLockIfAllowed = () => {
      if (!isMobileMode() && adminPreviewMode !== "character" && !weaponPickPending) requestPointerLock();
    };

    updateHUD();
    updateAdminHud();
    updateAdminGameplayHud();
    updateFlashlightHud();

    clock = new THREE.Clock();
    if (!window.__gameAnimating) {
      window.__gameAnimating = true;
      animate();
    }

    offerRoundWeaponPick().then(() => {
      showMatchOverlay();
      requestPointerLockIfAllowed();
    });

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
    hemiLight.color.setHex(0x120a10);
    hemiLight.groundColor.setHex(0x020101);
    hemiLight.intensity = 0.09;
    ambientLight.color.setHex(0x080606);
    ambientLight.intensity = 0.07;
    sunLight.color.setHex(0x331818);
    sunLight.intensity = 0.14;
    fillLight.color.setHex(0x0a1018);
    fillLight.intensity = 0.08;
    scene.background = new THREE.Color(0x030202);
    scene.fog = new THREE.Fog(0x040202, 2.5, 18);
  } else if (mapData.openWorld) {
    hemiLight.color.setHex(0xd7f2ff);
    hemiLight.groundColor.setHex(0x5f8a45);
    hemiLight.intensity = 0.62;
    ambientLight.color.setHex(0xcfe8ff);
    ambientLight.intensity = 0.48;
    sunLight.color.setHex(0xffe3a0);
    sunLight.intensity = 1.05;
    fillLight.color.setHex(0x90c7ff);
    fillLight.intensity = 0.58;
    scene.background = new THREE.Color(mapData.sky);
    scene.fog = new THREE.Fog(mapData.fog, 260, 1450);
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
  if (adminHorrorFullLight && isDarkMap(mapData)) {
    applyDevFullLightVisuals();
    return;
  }
  if (devLightBoost > 0) applyDevLightBoost();
  if (devFogFarBonus !== 0) applyDevFogBonus();
  if (adminNightVision && isDarkMap(mapData)) {
    if (renderer) configureCharacterRenderer(renderer, labyrinth ? 1.08 : 1.25);
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

function applyDevLightBoost() {
  if (!mapData || devLightBoost <= 0) return;
  const labyrinth = isLabyrinthMap(mapData);
  const horror = isHorrorMap(mapData);
  const mul = 1 + devLightBoost * 0.5;
  if (hemiLight) hemiLight.intensity *= mul;
  if (ambientLight) ambientLight.intensity *= mul;
  if (sunLight) sunLight.intensity *= mul;
  if (fillLight) fillLight.intensity *= mul;
  if (scene.fog) {
    scene.fog.far = Math.min(240, scene.fog.far * (1 + devLightBoost * 0.4));
    scene.fog.near *= Math.max(0.25, 1 - devLightBoost * 0.12);
  }
  if (renderer) {
    const base = labyrinth ? 0.74 : horror ? 0.86 : 1.05;
    configureCharacterRenderer(renderer, base * (1 + devLightBoost * 0.28));
  }
}

function applyDevFogBonus() {
  if (!scene?.fog || devFogFarBonus === 0) return;
  scene.fog.far = Math.max(6, scene.fog.far + devFogFarBonus);
}

function adjustDevLight(delta) {
  devLightBoost = Math.max(0, Math.min(2, devLightBoost + delta));
  if (devLightBoost > 0) adminHorrorFullLight = false;
  window.__adminHorrorFullLight = adminHorrorFullLight;
  applyMapAtmosphere();
  return `Nível de luz: ${devLightBoost.toFixed(1)} (0=normal, 2=máximo)`;
}

function setDevLightLevel(level) {
  devLightBoost = Math.max(0, Math.min(2, level));
  if (devLightBoost > 0) adminHorrorFullLight = false;
  window.__adminHorrorFullLight = adminHorrorFullLight;
  applyMapAtmosphere();
  return `Nível de luz: ${devLightBoost.toFixed(1)}`;
}

function adjustDevFog(delta) {
  devFogFarBonus = Math.max(-30, Math.min(80, devFogFarBonus + delta));
  applyMapAtmosphere();
  return `Nevoeiro: bônus ${devFogFarBonus} m`;
}

function applyDevFullLightVisuals() {
  if (!mapData || !isDarkMap(mapData)) return;
  const lab = isLabyrinthMap(mapData);
  if (renderer) configureCharacterRenderer(renderer, lab ? 1.4 : 1.75);
  if (hemiLight) {
    hemiLight.color.setHex(0xe8ecf4);
    hemiLight.groundColor.setHex(0x888480);
    hemiLight.intensity = lab ? 1.1 : 1.15;
  }
  if (ambientLight) {
    ambientLight.color.setHex(0xf0ebe4);
    ambientLight.intensity = lab ? 0.95 : 1.05;
  }
  if (sunLight) {
    sunLight.color.setHex(0xfff8ee);
    sunLight.intensity = lab ? 1.05 : 1.25;
  }
  if (fillLight) {
    fillLight.color.setHex(0xe8f4ff);
    fillLight.intensity = lab ? 0.85 : 1.05;
  }
  const bg = lab ? 0xc8c0bc : mapData.sky || 0xc4a574;
  scene.background = new THREE.Color(bg).multiplyScalar(lab ? 0.78 : 0.95);
  scene.fog = new THREE.Fog(
    new THREE.Color(bg).multiplyScalar(0.72).getHex(),
    lab ? 50 : 60,
    lab ? 180 : 220
  );
}

function isAdminGameplay() {
  return isSessionAdmin();
}

function applyAdminDevFullLight(on) {
  if (!isDarkMap(mapData)) return;
  adminHorrorFullLight = on;
  window.__adminHorrorFullLight = on;
  if (on) {
    devLightBoost = 0;
    devFogFarBonus = 0;
  }
  applyMapAtmosphere();
  if (on) showOverlay("Mapa iluminado — H para desligar");
  else showOverlay("Iluminação normal");
  updateAdminGameplayHud();
  updateAdminHud();
  window.devChatLog?.(on ? "Mapa totalmente iluminado." : "Iluminação normal.", "ok");
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
    applyPlayerWeaponSkins();
  }
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: ENABLE_ANTIALIAS,
    powerPreference: LOW_GRAPHICS ? "low-power" : "high-performance",
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
    if (!pointerLocked && !matchOver && !weaponPickPending && !player.dead) requestPointerLock();
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function requestPointerLock() {
  if (isMobileMode()) return;
  canvas.requestPointerLock?.();
}

function buildLabyrinthHorrorAmbience(scene, mapData) {
  if (!scene || !mapData) return;

  const bloodMat = new THREE.MeshStandardMaterial({
    color: 0x4a0a0a,
    transparent: true,
    opacity: 0.65,
    emissive: 0x330000,
    emissiveIntensity: 0.35,
    depthWrite: false,
  });
  const dripMat = bloodMat.clone();
  dripMat.opacity = 0.45;

  const spawns = mapData.monsterSpawns || [];
  for (let i = 0; i < spawns.length; i++) {
    const p = spawns[i];
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 10), bloodMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(p.x, 0.025, p.z);
    scene.add(pool);

    const warn = new THREE.PointLight(
      i === 0 ? 0x44ff66 : i === 1 ? 0xff3311 : 0xffaa66,
      0.35,
      10,
      2
    );
    warn.position.set(p.x, 1.2, p.z);
    scene.add(warn);

    for (let d = 0; d < 3; d++) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.8), dripMat);
      streak.position.set(p.x + (d - 1) * 0.5, 1.4, p.z + 0.55);
      scene.add(streak);
    }
  }

  const pathPts = mapData.patrolPoints?.slice(0, 24) || [];
  for (let i = 0; i < pathPts.length; i += 3) {
    const p = pathPts[i];
    const smear = new THREE.Mesh(new THREE.CircleGeometry(0.45, 6), dripMat);
    smear.rotation.x = -Math.PI / 2;
    smear.position.set(p.x + 1.1, 0.02, p.z - 1.1);
    scene.add(smear);
  }
}

function buildOpenWorldScenery(scene, mapData) {
  buildMapProps(scene, mapData.props || [], mapData.propTint || {});

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2300, 2300, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0x2f75b6, transparent: true, opacity: 0.55 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.035;
  scene.add(water);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x5a554a });
  const roads = [
    { x: 0, z: -160, w: 1300, d: 12, rot: 0.12 },
    { x: -210, z: 120, w: 12, d: 920, rot: -0.25 },
    { x: 360, z: 120, w: 12, d: 760, rot: 0.42 },
  ];
  for (const r of roads) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = r.rot;
    m.position.set(r.x, 0.018, r.z);
    scene.add(m);
  }

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(18 + j * 3, 10, 8), cloudMat);
      puff.position.set(j * 18, Math.sin(j) * 5, 0);
      puff.scale.y = 0.38;
      cloud.add(puff);
    }
    cloud.position.set(-780 + (i % 8) * 220, 150 + (i % 3) * 28, -740 + Math.floor(i / 8) * 1280);
    scene.add(cloud);
  }

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(28, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffef9a })
  );
  sun.position.set(560, 420, -740);
  scene.add(sun);
}

function buildMap() {
  walls = [];
  meleePickups = null;
  battleRoyaleLoot = null;
  battleRoyaleDoors = [];
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

  if (mapData.openWorld) {
    buildOpenWorldScenery(scene, mapData);
    spawnBattleRoyaleDoors();
    battleRoyaleLoot = spawnBattleRoyaleLoot(scene, mapData.brLoot || []);
  } else if (isLabyrinthMap(mapData)) {
    // Sem props no labirinto — corredores 100% livres
  } else {
    buildWorldDecor(scene, mapData, wallMeshesForCeil);
  }

  if (isLabyrinthMap(mapData)) {
    // pilares removidos
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
    if (isLabyrinthMap(mapData)) continue;
    const col = getPropCollider(p);
    if (!col.w || !col.h) continue;
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
    buildLabyrinthHorrorAmbience(scene, mapData);
    spawnLabyrinthMonsters(scene, mapData);
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
  const skins = {};
  for (const id of ["ak47", "scar", "m4", "ump45", "awm", "doze", "bazooka", "glock", "revolver"]) {
    const color = getWeaponSkinColor(playerName, id);
    if (color) skins[id] = color;
  }
  applyWeaponSkinToView(weaponView, skins);
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
  if (weaponPickPending) return false;
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
  const maxBots = mapData.maxBots || 20;
  botCount = mapData.defaultBotCount || Math.min(maxBots, Math.max(1, parseInt(document.getElementById("botCount")?.value || String(botCount), 10)));
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
  const lab = isLabyrinthMap(mapData);
  flashlightLight = new THREE.SpotLight(
    0xfff6e8,
    0,
    lab ? 58 : 50,
    Math.PI / 5.2,
    0.35,
    1.02
  );
  flashlightLight.castShadow = false;
  flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -12);
  flashlightLight.position.set(0.18, -0.12, 0.04);
  flashlightLight.target = flashlightTarget;
  camera.add(flashlightLight);
  camera.add(flashlightTarget);
  flashlightFill = new THREE.PointLight(0xffeed8, 0, lab ? 14 : 11, 1.4);
  flashlightFill.position.set(0, 0, 0.2);
  camera.add(flashlightFill);
}

function disposeFlashlight() {
  if (flashlightLight && camera) {
    camera.remove(flashlightLight);
    if (flashlightTarget) camera.remove(flashlightTarget);
    if (flashlightFill) camera.remove(flashlightFill);
    flashlightLight.dispose?.();
    flashlightFill?.dispose?.();
  }
  flashlightLight = null;
  flashlightFill = null;
  flashlightTarget = null;
  flashlightEquipped = false;
  updateFlashlightHud();
}

function canToggleFlashlight() {
  if (!isDarkMap(mapData) || !roundActive || inCinematic || adminPreviewMode) return false;
  if (player.dead && !adminSpectator && !adminLiveSpectator) return false;
  return true;
}

function getFlashlightIntensity() {
  const lab = isLabyrinthMap(mapData);
  return { spot: lab ? 34 : 28, fill: lab ? 5.2 : 4 };
}

function updateFlashlightHud() {
  const el = document.getElementById("flashlightHud");
  if (el) {
    const show =
      isDarkMap(mapData) &&
      flashlightEquipped &&
      roundActive &&
      (!player.dead || adminSpectator || adminLiveSpectator);
    el.classList.toggle("hidden", !show);
    el.classList.toggle("active", show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
  }
  const mobBtn = document.getElementById("btnFlashlight");
  if (mobBtn) {
    const showBtn =
      isDarkMap(mapData) &&
      roundActive &&
      (!player.dead || adminSpectator || adminLiveSpectator);
    mobBtn.classList.toggle("hidden", !showBtn);
    mobBtn.classList.toggle("active", !!flashlightEquipped);
  }
}

function updateFlashlightBeam() {
  if (!flashlightEquipped) return;
  const { spot, fill } = getFlashlightIntensity();
  if (flashlightLight) flashlightLight.intensity = spot;
  if (flashlightFill) flashlightFill.intensity = fill;
}

function toggleFlashlight() {
  if (!canToggleFlashlight()) return;
  ensureFlashlightRig();
  flashlightEquipped = !flashlightEquipped;
  const { spot, fill } = getFlashlightIntensity();
  if (flashlightLight) flashlightLight.intensity = flashlightEquipped ? spot : 0;
  if (flashlightFill) flashlightFill.intensity = flashlightEquipped ? fill : 0;
  if (fillLight && isDarkMap(mapData)) {
    const base = isLabyrinthMap(mapData) ? 0.11 : 0.24;
    fillLight.intensity = flashlightEquipped ? base * 2.5 : base;
  }
  updateFlashlightHud();
  if (flashlightEquipped) {
    showOverlay("Lanterna ligada — J para desligar");
  } else {
    showOverlay("Lanterna desligada");
  }
  const obj = document.getElementById("objective");
  if (obj && isDarkMap(mapData)) {
    if (isLabyrinthMap(mapData)) {
      obj.textContent = `Explore o escuro${getDarkObjectiveExtra()} • Armas no caminho • Saída verde`;
    } else {
      obj.textContent = `Sobreviva ao escuro${getDarkObjectiveExtra()} • elimine as ameaças`;
    }
  }
}

function getDarkObjectiveExtra() {
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
  if (window.__devChatOpen) return;
  keys[e.code] = true;
  if (e.code === "Escape" && adminLiveSpectator) {
    toggleAdminLiveSpectator(false);
    return;
  }
  if (e.code === "Escape" && (adminSpectator || adminPreviewMode)) {
    adminExitToMenu();
    return;
  }
  if (e.code === "KeyH" && isDarkMap(mapData) && isAdminGameplay() && adminPreviewMode !== "character") {
    applyAdminDevFullLight(!adminHorrorFullLight);
    updateAdminHud();
    return;
  }
  if (e.code === "KeyN" && (adminSpectator || adminPreviewMode) && isDarkMap(mapData)) {
    applyAdminNightVision(!adminNightVision);
    updateAdminHud();
    return;
  }
  if (e.code === "KeyJ" && canToggleFlashlight()) {
    toggleFlashlight();
    return;
  }
  if (adminPreviewMode === "character") {
    if (e.code === "Space") {
      e.preventDefault();
      if (tryAdminCharPreviewFlyToggle()) return;
    }
    if (!adminCharPreviewFly) return;
    return;
  }
  if (adminSpectator || adminPreviewMode) return;
  if (e.code === "KeyR") reload();
  if (e.code === "KeyE") tryInteractWorld();
  if (e.code === "Digit1") switchWeapon(1);
  if (e.code === "Digit2") switchWeapon(2);
  if (e.code === "Digit3") switchWeapon(3);
  if (e.code === "KeyB" && gameMode === "defuse") tryPlantOrDefuse();
  if (e.code === "Space") {
    e.preventDefault();
    handlePlayerJump();
  }
}

function onKeyUp(e) {
  keys[e.code] = false;
}

function onMouseMove(e) {
  if (isMobileMode() || inCinematic) return;
  if (adminPreviewMode === "character" || (adminSpectator && adminNoclip)) {
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
  return !!currentWeapon?.canADS || ADS_WEAPONS.includes(currentWeapon?.id || primaryWeaponId);
}

function updateADS(dt) {
  const want = rightMouseDown && canPlayerADS() && !player.dead && !inCinematic && roundActive;
  adsActive = want;

  const def = currentWeapon || getPrimaryWeapon(primaryWeaponId);
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
    if (want) scope.dataset.active = currentWeapon?.id || primaryWeaponId;
    else delete scope.dataset.active;
  }
  if (weaponView) setWeaponADS(weaponView, want, currentWeapon?.id || primaryWeaponId);
}

function processLook() {
  if (inCinematic) return;
  if (adminPreviewMode === "character" && !adminCharPreviewFly) return;
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
    else if (slot === 2) setWeaponView(weaponView, slot, currentWeapon.id || "glock");
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
  else if (slot === "2") baseMag = WEAPONS[w.id]?.mag || WEAPONS.glock.mag;
  else baseMag = 1;
  if (w.mag >= baseMag) return;
  const toLoad = Math.min(baseMag - w.mag, w.reserve);
  if (toLoad <= 0) return;
  if (weaponView) triggerReloadAnimation(weaponView);
  w.mag += toLoad;
  w.reserve -= toLoad;
  updateAmmoHUD();
}

function shoot() {
  if (player.dead || inCinematic || !roundActive || weaponPickPending) return;
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

  const shotDirBeforeKick = getShootDirection();
  w.lastShot = now;
  const skinItem = currentWeaponSkinItem();
  const mythicSkin = skinItem?.tier === "mítica";
  if (!w.melee) {
    w.mag--;
    playGunshot(w.name);
    if (weaponView) triggerMuzzleFlash(weaponView);
    applyShotKick(w, mythicSkin);
  }
  updateAmmoHUD();

  const origin = camera.position.clone();
  const baseDir = shotDirBeforeKick;
  if (skinItem?.cosmic) spawnCosmicShotFx(skinItem.cosmic, origin, baseDir);

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

  const rawSpread = adsActive && w.adsSpread != null ? w.adsSpread : w.spread;
  const spreadBase = rawSpread * (mythicSkin ? 0.72 : 1);
  const damageMul = mythicSkin ? 1.1 : 1;

  if (w.explosive) {
    const dir = baseDir.clone();
    dir.x += (Math.random() - 0.5) * spreadBase;
    dir.y += (Math.random() - 0.5) * spreadBase;
    dir.z += (Math.random() - 0.5) * spreadBase;
    dir.normalize();
    const ray = new THREE.Raycaster(origin, dir, 0, 80);
    const hits = ray.intersectObjects([...hitTargets, ...wallMeshCache, ...doorHitMeshes], false);
    const impactPoint = hits[0]?.point || origin.clone().add(dir.multiplyScalar(26));
    spawnExplosion(impactPoint, 4.2);
    spawnImpact(impactPoint, false);
    for (const e of enemies) {
      if (!e.alive) continue;
      const dist = e.group.position.distanceTo(impactPoint);
      if (dist > 4.2) continue;
      const splash = w.damage * damageMul * Math.max(0.25, 1 - dist / 4.2);
      damageEnemy(e, splash, false, e.group.position.clone().add(new THREE.Vector3(0, 1, 0)));
    }
    return;
  }

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
        const dmg = calcWeaponDamage(w, dist, headshot) * damageMul;
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

function applyShotKick(w, mythicSkin = false) {
  const base = {
    ak47: 0.012,
    m4: 0.008,
    scar: 0.01,
    ump45: 0.007,
    awm: 0.018,
    doze: 0.02,
    bazooka: 0.026,
    glock: 0.009,
  }[w.id] ?? 0.01;
  pitch = Math.max(-1.45, Math.min(1.45, pitch + base * (mythicSkin ? 0.82 : 1)));
  yaw += (Math.random() - 0.5) * base * 0.35;
  applyCameraRotation();
}

function cosmicMaterial(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function buildCosmicProjectile(kind) {
  const g = new THREE.Group();
  if (kind === "satellite") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.04), cosmicMaterial(0xddeeff));
    const panelMat = cosmicMaterial(0x66aaff, 0.7);
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.004), panelMat);
    const p2 = p1.clone();
    p1.position.x = -0.08;
    p2.position.x = 0.08;
    g.add(body, p1, p2);
  } else if (kind === "galaxy") {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), cosmicMaterial(0xffffff));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24), cosmicMaterial(0x9966ff, 0.8));
    ring.rotation.x = Math.PI / 2.4;
    g.add(core, ring);
  } else if (kind === "planet") {
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), cosmicMaterial(0x66bbff));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.006, 6, 24), cosmicMaterial(0xffcc88, 0.7));
    ring.rotation.x = Math.PI / 2.6;
    g.add(planet, ring);
  } else if (kind === "comet") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), cosmicMaterial(0x88ddff)));
    const trail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 10), cosmicMaterial(0x66ccff, 0.45));
    trail.position.z = 0.11;
    trail.rotation.x = Math.PI / 2;
    g.add(trail);
  } else if (kind === "asteroid") {
    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), cosmicMaterial(0xaa8866, 0.9)));
  } else if (kind === "moon") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), cosmicMaterial(0xd8d8ff, 0.8)));
  } else if (kind === "blackhole") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), cosmicMaterial(0x090011, 1)));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 28), cosmicMaterial(0xaa66ff, 0.85));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  } else {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), cosmicMaterial(0xffcc44, 0.9)));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), cosmicMaterial(0xff8844, 0.28));
    g.add(glow);
  }
  return g;
}

function spawnCosmicShotFx(kind, origin, dir) {
  const g = buildCosmicProjectile(kind);
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const start = origin.clone().add(dir.clone().multiplyScalar(0.9)).add(right.multiplyScalar(0.18));
  start.y -= 0.12;
  g.position.copy(start);
  g.scale.setScalar(0.75);
  scene.add(g);
  const born = performance.now();
  const velocity = dir.clone().multiplyScalar(0.34);
  const tick = () => {
    const age = (performance.now() - born) / 1000;
    g.position.add(velocity);
    g.rotation.x += 0.12;
    g.rotation.y += 0.16;
    g.traverse((o) => {
      if (o.material?.opacity != null) o.material.opacity = Math.max(0, o.material.opacity - 0.018);
    });
    if (age < 0.75) requestAnimationFrame(tick);
    else scene.remove(g);
  };
  tick();
}

function spawnExplosion(pos, radius = 3) {
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.82 })
  );
  core.position.copy(pos);
  scene.add(core);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.32, 0.025, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.75 })
  );
  ring.position.copy(pos);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  setTimeout(() => {
    scene.remove(core);
    scene.remove(ring);
  }, 220);
}

function spawnGhostSoul(pos) {
  const ghost = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcdbbff,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat);
  body.scale.set(0.8, 1.25, 0.65);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat.clone());
  head.position.y = 0.22;
  ghost.add(body, head);
  ghost.position.copy(pos).add(new THREE.Vector3(0, 0.9, 0));
  scene.add(ghost);
  const started = performance.now();
  const tick = () => {
    const t = (performance.now() - started) / 1000;
    ghost.position.y += 0.018;
    ghost.position.x += Math.sin(t * 5) * 0.004;
    ghost.rotation.y += 0.04;
    ghost.traverse((o) => {
      if (o.material) o.material.opacity = Math.max(0, 0.75 - t * 0.45);
    });
    if (t < 1.7) requestAnimationFrame(tick);
    else scene.remove(ghost);
  };
  tick();
}

function currentWeaponSkinItem() {
  if (!currentWeapon || currentWeapon.melee) return null;
  const id = currentWeapon.id || primaryWeaponId;
  const color = getWeaponSkinColor(playerName, id);
  return findWeaponSkinItem(id, color);
}

function shouldSpawnGhostKillFx() {
  const item = currentWeaponSkinItem();
  return item?.tier === "mítica" || item?.id === "ak_shadow";
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
  const sprayCount = Math.max(2, Math.round((headshot ? 9 : fromPlayer && dmg >= 80 ? 7 : 5) * BLOOD_SPRAY_MUL));
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
  if (shouldSpawnGhostKillFx()) spawnGhostSoul(bloodPos);
  bloodParticles.push(
    ...spawnBloodSpray(
      scene,
      bloodPos.clone().add(new THREE.Vector3(0, 0.6, 0)),
      Math.max(4, Math.round(14 * BLOOD_SPRAY_MUL)),
      { death: true }
    )
  );

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
  if (weaponPickPending) {
    weaponPickPending = false;
    const rwPanel = document.getElementById("roundWeaponPicker");
    if (rwPanel) {
      rwPanel.classList.add("hidden");
      rwPanel.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("round-weapon-pick-active");
  }
  player.dead = true;
  player.health = 0;
  deaths++;
  updateHealthHUD();

  const bloodPos = camera.position.clone();
  bloodPos.y = 0.1;
  bloodPools.push(spawnBloodPool(scene, bloodPos, 1.4));
  bloodParticles.push(
    ...spawnBloodSpray(scene, camera.position.clone(), Math.max(6, Math.round(20 * BLOOD_SPRAY_MUL)))
  );
  addKillfeed(attacker || "Bandido", playerName);

  document.body.classList.add("damage-flash");
  setTimeout(() => document.body.classList.remove("damage-flash"), 150);

  roundActive = false;
  inCinematic = false;
  if (flashlightLight) flashlightLight.intensity = 0;
  if (flashlightFill) flashlightFill.intensity = 0;
  flashlightEquipped = false;
  updateFlashlightHud();
  document.exitPointerLock?.();
  mobileControls?.hide();
  hud.classList.add("hidden");
  document.body.classList.add("show-cursor", "death-screen-active");

  const msg = document.getElementById("deathMsg");
  if (msg) {
    msg.textContent = `Abatido por ${attacker || "inimigo"}. Renascer para continuar ou finalize para ir à tela de resultados.`;
  }
  deathScreen?.classList.remove("hidden");
  deathScreen?.classList.add("active");
}

function killPlayer(attacker) {
  if (isHorrorMap(mapData) && !isLabyrinthMap(mapData) && !deathJumpscareRunning) {
    playHorrorDeathJumpscare(attacker);
    return;
  }
  showDeathChoice(attacker);
}

async function playHorrorDeathJumpscare(attacker) {
  if (player.dead || deathJumpscareRunning) return;
  deathJumpscareRunning = true;
  roundActive = false;
  document.exitPointerLock?.();
  mobileControls?.hide();
  if (weaponView) hideAllWeapons(weaponView);

  const src = getHorrorJumpscareSource(attacker);

  await showJumpscareOverlay({
    camera,
    scene,
    renderer,
    sourceGroup: src.sourceGroup,
    def: src.def,
    style: src.style,
    name: src.name,
    duration: 1500,
    sound: "death",
  });

  deathJumpscareRunning = false;
  showDeathChoice(attacker);
}

function getHorrorJumpscareSource(attacker) {
  const fallback = {
    sourceGroup: null,
    style: "death",
    name: attacker || "VOCÊ NÃO DEVERIA TER PASSADO",
    def: { color: 0x220808, eye: 0xff1100, scale: 1.45, height: 2.6 },
  };

  if (!enemies?.length) return fallback;

  let match = null;
  if (attacker) {
    match = enemies.find((e) => e.alive && e.group && e.name === attacker);
  }
  if (!match) {
    let best = 1e9;
    for (const e of enemies) {
      if (!e.alive || !e.group) continue;
      const d = camera.position.distanceTo(e.group.position);
      if (d < best) {
        best = d;
        match = e;
      }
    }
  }

  if (!match?.group) return fallback;

  return {
    sourceGroup: match.group,
    style: "death",
    name: match.name || attacker || "AMEAÇA",
    def: null,
  };
}

function hideDeathChoice() {
  deathScreen?.classList.add("hidden");
  deathScreen?.classList.remove("active");
  hud.classList.remove("hidden");
  document.body.classList.remove("show-cursor", "death-screen-active");
  if (isMobileMode()) mobileControls?.show();
}

function finishMatchFromDeath() {
  hideDeathChoice();
  matchOver = true;
  roundActive = false;
  endMatch("t", { skipCinematic: true });
}

function damagePlayer(dmg, attacker) {
  if (adminGodMode || adminSpectator || player.dead || inCinematic || weaponPickPending) return;
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
  if (inCinematic || isJumpscareActive()) return;
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

  if (who === "player" && battleRoyaleDoors.length) {
    for (const door of battleRoyaleDoors) {
      if (door.open) continue;
      const halfW = door.w / 2;
      if (Math.abs(x - door.x) < halfW + r && Math.abs(z - door.z) < 0.22 + r) return true;
    }
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
    if (adminCharPreviewFly) updateAdminFly(dt);
    else updateAdminCharOrbit(dt);
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

  if (isJumpscareActive()) return;

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
  const maxSpeed = (isMobileMode() ? MOVE_SPEED_MOBILE : MOVE_SPEED) * devMoveSpeedMul;
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
  } else if (mapData.openWorld && roundActive && !player.dead) {
    const obj = document.getElementById("objective");
    const nearLoot = tryPickupBattleRoyaleLoot(camera, battleRoyaleLoot, 3.4);
    if (obj && nearLoot) {
      const label = nearLoot.kind === "ammo"
        ? (nearLoot.ammo === "doze" ? "munição de doze" : "munição AR")
        : (WEAPONS[nearLoot.id]?.name || nearLoot.id);
      obj.textContent = `Pressione E — pegar ${label}`;
    } else if (obj) {
      const nearDoor = battleRoyaleDoors.find((d) => !d.open && Math.hypot(camera.position.x - d.x, camera.position.z - d.z) < 5);
      if (nearDoor) obj.textContent = "Pressione E — abrir porta da casa";
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
        const def = WEAPONS[weapons[k].id] || WEAPONS.glock;
        weapons[k].mag = def.mag;
        weapons[k].reserve = def.reserve;
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
    offerRoundWeaponPick().then(() => showOverlay(`ROUND ${round}`));
  }, 3000);
}

function endMatch(winner, opts = {}) {
  if (matchOver && !opts.skipCinematic) return;
  matchOver = true;
  roundActive = false;
  weaponPickPending = false;
  import("./round-weapon-picker.js").then((m) => m.hideRoundWeaponPicker?.()).catch(() => {});
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
  const lab = isLabyrinthMap(mapData);
  document.body.classList.toggle("hud-labyrinth", lab);

  if (!lab) {
    document.getElementById("scoreCT").textContent = scoreCT;
    document.getElementById("scoreT").textContent = scoreT;
    document.getElementById("roundText").textContent = `ROUND ${round}`;
  } else {
    const roundEl = document.getElementById("roundText");
    if (roundEl) roundEl.textContent = "FIM DAS TREVAS";
    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.textContent = "☠";
  }

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
}

function handlePlayerJump() {
  if (tryAdminJumpSpectatorToggle()) return;
  if (adminLiveSpectator || (adminSpectator && !adminPreviewMode)) return;
  tryJump(player);
}

function tryAdminCharPreviewFlyToggle() {
  if (adminPreviewMode !== "character") return false;
  const now = performance.now();
  const doubleTap = now - lastAdminCharPreviewJumpTap <= ADMIN_DOUBLE_JUMP_MS;
  lastAdminCharPreviewJumpTap = now;
  if (doubleTap) {
    lastAdminCharPreviewJumpTap = 0;
    toggleAdminCharPreviewFly(!adminCharPreviewFly);
    return true;
  }
  return false;
}

function syncFlyAnglesFromCamera() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  yaw = Math.atan2(dir.x, -dir.z);
  pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
}

function syncCharOrbitFromCamera() {
  if (!adminPreviewPivot) return;
  const p = adminPreviewPivot.position;
  const lookY =
    adminPreviewEntity?.isTrevasMonster
      ? (adminPreviewEntity.monsterId === "gosmento" ? 1.8 : adminPreviewEntity.monsterId === "gigante" ? 1.4 : 0.85)
      : 1.15;
  const dx = camera.position.x - p.x;
  const dy = camera.position.y - p.y - lookY;
  const dz = camera.position.z - p.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > 0.5) {
    adminCharOrbit.dist = dist;
    adminCharOrbit.yaw = Math.atan2(dx, dz);
    adminCharOrbit.pitch = Math.asin(Math.max(-0.15, Math.min(1.35, dy / dist)));
  }
}

function toggleAdminCharPreviewFly(force) {
  if (adminPreviewMode !== "character") return;
  const next = typeof force === "boolean" ? force : !adminCharPreviewFly;
  adminCharPreviewFly = next;
  if (next) {
    syncFlyAnglesFromCamera();
    lookDelta.x = 0;
    lookDelta.y = 0;
    showOverlay("Preview voador — W na mira • Espaço/Ctrl/X subir/descer • 2× PULAR volta à órbita");
  } else {
    syncCharOrbitFromCamera();
    lookDelta.x = 0;
    lookDelta.y = 0;
    showOverlay("Preview órbita — mouse gira • 2× PULAR para voar");
  }
  updateAdminHud();
}

function tryAdminJumpSpectatorToggle() {
  if (!isSessionAdmin() || !isHorrorMap(mapData) || adminPreviewMode) return false;
  const now = performance.now();
  const doubleTap = now - lastAdminJumpTap <= ADMIN_DOUBLE_JUMP_MS;
  lastAdminJumpTap = now;
  if (doubleTap) {
    lastAdminJumpTap = 0;
    toggleAdminLiveSpectator(!adminLiveSpectator);
    return true;
  }
  return false;
}

function restorePlayerWeaponView() {
  if (!weaponView || !currentWeapon) return;
  for (const slot of ["1", "2", "3"]) {
    if (weapons[slot] === currentWeapon) {
      switchWeapon(Number(slot));
      break;
    }
  }
}

function toggleAdminLiveSpectator(force) {
  if (!isSessionAdmin() || !isHorrorMap(mapData) || adminPreviewMode) return;
  const next = typeof force === "boolean" ? force : !adminLiveSpectator;
  adminLiveSpectator = next;
  adminSpectator = next;
  adminNoclip = next;
  if (next) {
    moveVel.x = 0;
    moveVel.z = 0;
    if (weaponView) hideAllWeapons(weaponView);
    showOverlay("Espectador admin — W na mira • Espaço/Ctrl/X subir/descer • 2× PULAR ou ESC para voltar");
  } else {
    camera.position.y = PLAYER_EYE_HEIGHT + (player.jumpOffset || 0);
    restorePlayerWeaponView();
    showOverlay("Modo jogador");
  }
  updateAdminHud();
  updateAdminGameplayHud();
}

function updateAdminGameplayHud() {
  const el = document.getElementById("adminHud");
  if (!el || !isSessionAdmin() || !isDarkMap(mapData) || adminPreviewMode) return;
  if (adminLiveSpectator || adminSpectator) return;
  el.classList.remove("hidden");
  if (isHorrorMap(mapData)) {
    const light = adminHorrorFullLight ? "ON" : "OFF";
    el.innerHTML =
      "<strong>Admin — mapa terror</strong><br>" +
      `H = iluminar mapa (${light})<br>` +
      "J = lanterna • 2× PULAR = espectador voador";
  } else {
    const light = adminHorrorFullLight ? "ON" : "OFF";
    el.innerHTML =
      "<strong>Admin — labirinto</strong><br>" +
      `H = iluminar mapa (${light})<br>` +
      "J = lanterna";
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
    const monsterLabel =
      adminPreviewEntity?.isTrevasMonster
        ? LABYRINTH_MONSTER_DEFS.find((d) => d.id === adminPreviewEntity.monsterId)?.name || "Monstro"
        : null;
    if (adminCharPreviewFly) {
      el.innerHTML =
        "<strong>Preview personagem — voo</strong><br>" +
        (monsterLabel ? `${monsterLabel}<br>` : "") +
        "WASD voar (W na mira) • Espaço/Ctrl/X subir/descer • 2× PULAR órbita • ESC menu";
    } else {
      el.innerHTML =
        "<strong>Preview personagem</strong><br>" +
        (monsterLabel ? `${monsterLabel}<br>` : "") +
        "Mouse gira • Scroll zoom • 2× PULAR voar • ESC menu";
    }
    return;
  }
  const nvg = adminNightVision ? "ON" : "OFF";
  const liveHint = adminLiveSpectator ? " • 2× PULAR ou ESC = voltar ao jogador" : "";
  const darkHint = isDarkMap(mapData)
    ? ` • H iluminar mapa (${adminHorrorFullLight ? "ON" : "OFF"})`
    : "";
  el.innerHTML =
    `<strong>Admin espectador</strong><br>` +
    `Mapa: ${meta.name}<br>` +
    `Tamanho: <strong>${meta.widthM} m × ${meta.heightM} m</strong> (~${meta.areaM2} m²)<br>` +
    `WASD voar (W na mira) • Espaço/Ctrl/X subir/descer • N visão noturna (${nvg})${darkHint} • ESC menu${liveHint}`;
}

function isAdminFlyDescendKey() {
  return (
    keys["ControlLeft"] ||
    keys["ControlRight"] ||
    keys["KeyC"] ||
    keys["KeyX"] ||
    keys["AltLeft"]
  );
}

function updateAdminFly(dt) {
  processLook();
  applyCameraRotation();

  const move = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);

  const camRight = new THREE.Vector3().crossVectors(_vUp, forward);
  if (camRight.lengthSq() < 1e-6) camRight.set(1, 0, 0);
  else camRight.normalize();

  if (keys["KeyW"]) move.add(forward);
  if (keys["KeyS"]) move.sub(forward);
  if (keys["KeyA"]) move.sub(camRight);
  if (keys["KeyD"]) move.add(camRight);

  // Vertical no mundo — independente da mira (sempre sobe/desce de verdade)
  if (keys["Space"]) move.y += 1;
  if (isAdminFlyDescendKey()) move.y -= 1;

  const boost = keys["ShiftLeft"] ? 2.6 : 1;
  const speed = adminFlySpeed * boost * devMoveSpeedMul;

  if (move.lengthSq() > 0) {
    move.normalize();
    camera.position.addScaledVector(move, speed * dt);
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
  const lookY =
    adminPreviewEntity?.isTrevasMonster
      ? (adminPreviewEntity.monsterId === "gosmento" ? 1.8 : adminPreviewEntity.monsterId === "gigante" ? 1.4 : 0.85)
      : 1.15;
  camera.position.set(
    p.x + Math.sin(adminCharOrbit.yaw) * cp * d,
    p.y + lookY + Math.sin(adminCharOrbit.pitch) * d,
    p.z + Math.cos(adminCharOrbit.yaw) * cp * d
  );
  camera.lookAt(p.x, p.y + lookY, p.z);
}

function onAdminWheel(e) {
  if (adminPreviewMode !== "character" || adminCharPreviewFly) return;
  e.preventDefault();
  adminCharOrbit.dist = Math.max(1.8, Math.min(18, adminCharOrbit.dist + e.deltaY * 0.008));
}

function adminExitToMenu() {
  adminSpectator = false;
  adminNoclip = false;
  adminCharPreviewFly = false;
  adminLiveSpectator = false;
  adminHorrorFullLight = false;
  window.__adminHorrorFullLight = false;
  lastAdminJumpTap = 0;
  lastAdminCharPreviewJumpTap = 0;
  adminPreviewMode = null;
  adminPreviewPivot = null;
  adminPreviewEntity = null;
  applyAdminNightVision(false);
  disposeFlashlight();
  clearLabyrinthMonsters(scene);
  deathJumpscareRunning = false;
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

function buildAdminPreviewCharacter(type, index, monsterId) {
  if (type === "trevas") {
    const id = monsterId || LABYRINTH_MONSTER_DEFS[index]?.id || "gosmento";
    const group = createTrevasMonsterMesh(id, { preview: true });
    return { group, isTrevasMonster: true, monsterId: id };
  }
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
    adminCharPreviewFly = false;
    lastAdminCharPreviewJumpTap = 0;
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
    const monsterId = config.monsterId;
    const char = buildAdminPreviewCharacter(type, idx, monsterId);

    if (char.isTrevasMonster) {
      char.group.position.set(0, 0, 0);
      scene.add(char.group);
      adminPreviewPivot = char.group;
      adminPreviewEntity = { group: char.group, isTrevasMonster: true, monsterId: char.monsterId };
      adminCharOrbit.dist =
        char.monsterId === "gosmento" ? 12
        : char.monsterId === "gigante" ? 14
        : 4.2;
      if (char.monsterId === "gigante") {
        adminCharOrbit.yaw = 0;
        adminCharOrbit.pitch = 0.18;
      }
    } else {
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
      adminCharOrbit = { yaw: 0.6, pitch: 0.25, dist: 4.2 };
    }

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
    return "Mapa: /luz +|- | /claro | /escuro | /fog +|- | /nv | /mapa | /tp x z | /tpme | /block dx dz — NPC: /add t|ct [n] | /bots N | /clear | /killall | /boss — Jogador: /heal | /god | /vel +|- | /weapon | /moedas | /noclip — Partida: /win ct|t | /round — Digite / no chat para lista completa.";
  }

  if (cmd === "luz" || cmd === "light") {
    if (parts[1] === "+" || parts[1] === "up" || parts[1] === "mais") return adjustDevLight(0.25);
    if (parts[1] === "-" || parts[1] === "down" || parts[1] === "menos") return adjustDevLight(-0.25);
    if (parts[1]) {
      const n = parseFloat(parts[1]);
      if (Number.isNaN(n)) return "Uso: /luz + | /luz - | /luz 1.5";
      return setDevLightLevel(n);
    }
    return `Luz atual: ${devLightBoost.toFixed(1)} — use /luz + ou /luz -`;
  }

  if (cmd === "claro" || cmd === "h") {
    if (!isDarkMap(mapData)) return "Só em mapas escuros (terror / labirinto).";
    applyAdminDevFullLight(!adminHorrorFullLight);
    return adminHorrorFullLight ? "Mapa iluminado." : "Iluminação normal.";
  }

  if (cmd === "escuro" || cmd === "dark") {
    adminHorrorFullLight = false;
    window.__adminHorrorFullLight = false;
    devLightBoost = 0;
    devFogFarBonus = 0;
    applyMapAtmosphere();
    updateAdminHud();
    updateAdminGameplayHud();
    return "Mapa voltou ao escuro normal.";
  }

  if (cmd === "fog" || cmd === "nevoa" || cmd === "neveiro") {
    if (parts[1] === "+" || parts[1] === "mais") return adjustDevFog(8);
    if (parts[1] === "-" || parts[1] === "menos") return adjustDevFog(-8);
    return `Nevoeiro bônus: ${devFogFarBonus} m — use /fog + ou /fog -`;
  }

  if (cmd === "mapa" || cmd === "mapinfo" || cmd === "info") {
    const meta = getMapMeta(currentMapKey);
    return `${meta.name} — ${meta.widthM}×${meta.heightM} m — luz ${devLightBoost.toFixed(1)} — pos ${camera.position.x.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
  }

  if (cmd === "add" || cmd === "spawn") {
    const kind = (parts[1] || "").toLowerCase();
    const n = Math.min(10, Math.max(1, parseInt(parts[2], 10) || 1));
    if (kind === "t" || kind === "inimigo" || kind === "terrorista" || kind === "bandido") {
      if (!scene || isNoCombatMap(mapData)) return "Mapa sem combate.";
      const names = [];
      for (let i = 0; i < n; i++) names.push(adminSpawnBanditNear());
      return n === 1 ? "Inimigo: " + names[0] : `${n} inimigos: ${names.join(", ")}`;
    }
    if (kind === "ct" || kind === "amigo" || kind === "aliado" || kind === "helper") {
      if (!scene || isNoCombatMap(mapData)) return "Mapa sem combate.";
      const names = [];
      for (let i = 0; i < n; i++) names.push(adminSpawnHelperNear());
      return n === 1 ? "Aliado: " + names[0] : `${n} aliados: ${names.join(", ")}`;
    }
    return "Uso: /add t|ct [quantidade] ou /add inimigo|amigo";
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

  if (cmd === "tpme" || cmd === "home") {
    if (!mapData?.spawnCT) return "Spawn não definido.";
    camera.position.set(mapData.spawnCT.x, PLAYER_EYE_HEIGHT, mapData.spawnCT.z);
    return `Teleportado ao spawn CT (${mapData.spawnCT.x}, ${mapData.spawnCT.z}).`;
  }

  if (cmd === "nv") {
    applyAdminNightVision(!adminNightVision);
    updateAdminHud();
    return adminNightVision ? "Visão noturna ON." : "Visão noturna OFF.";
  }

  if (cmd === "heal" || cmd === "cura") {
    player.health = 100;
    player.dead = false;
    updateHealthHUD();
    return "Vida restaurada (100).";
  }

  if (cmd === "god" || cmd === "deus") {
    adminGodMode = !adminGodMode;
    return adminGodMode ? "Modo Deus ON — sem dano." : "Modo Deus OFF.";
  }

  if (cmd === "vel" || cmd === "speed" || cmd === "velocidade") {
    if (parts[1] === "+" || parts[1] === "mais") {
      devMoveSpeedMul = Math.min(3, devMoveSpeedMul + 0.25);
    } else if (parts[1] === "-" || parts[1] === "menos") {
      devMoveSpeedMul = Math.max(0.5, devMoveSpeedMul - 0.25);
    } else {
      return `Velocidade: ${devMoveSpeedMul.toFixed(2)}x — /vel + ou /vel -`;
    }
    return `Velocidade: ${devMoveSpeedMul.toFixed(2)}x`;
  }

  if (cmd === "moedas" || cmd === "coins") {
    const n = parseInt(parts[1], 10);
    if (Number.isNaN(n)) return "Uso: /moedas 100";
    sessionCoins += n;
    updateHUD();
    return `+${n} moedas (sessão: ${sessionCoins}).`;
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

  if (cmd === "clear" || cmd === "limpar") {
    enemies.filter((e) => !e.isBoss).forEach((e) => {
      if (e.group) scene.remove(e.group);
      removeEnemyLabel(e);
    });
    enemies = enemies.filter((e) => e.isBoss);
    return "Inimigos removidos (chefão mantido).";
  }

  if (cmd === "killall" || cmd === "matar") {
    const victims = enemies.filter((e) => e.alive && !e.isBoss);
    for (const e of victims) {
      e.health = 0;
      killEnemy(e, false);
    }
    return `${victims.length} inimigo(s) eliminado(s).`;
  }

  if (cmd === "boss" || cmd === "chefao" || cmd === "chefão") {
    if (bossSpawned) return "Chefão já está no mapa.";
    if (!mapData?.bossSpawn) return "Este mapa não tem chefão.";
    spawnBoss();
    return "Chefão spawnado.";
  }

  if (cmd === "win" && parts[1]) {
    const w = parts[1].toLowerCase();
    if (w === "ct") {
      endMatch("ct", { skipCinematic: true });
      return "Vitória CT.";
    }
    if (w === "t") {
      endMatch("t", { skipCinematic: true });
      return "Vitória terroristas.";
    }
    return "Uso: /win ct | /win t";
  }

  if (cmd === "round") {
    endRound(scoreCT >= scoreT ? "ct" : "t");
    return "Round reiniciado.";
  }

  if (cmd === "block" && parts.length >= 3) {
    const dx = parseFloat(parts[1]);
    const dz = parseFloat(parts[2]);
    if (Number.isNaN(dx) || Number.isNaN(dz)) return "Uso: /block dx dz (metros)";
    return adminMoveNearestBlock(dx, dz);
  }

  return "Comando desconhecido. Digite / no chat para ver opções.";
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

    if (frameCount % ENEMY_LABEL_FRAME_SKIP === 0) updateEnemyLabels([...enemies, ...helpers], camera);

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

    if (isDarkMap(mapData) && isSessionAdmin()) updateAdminGameplayHud();

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
      if (roundActive && !player.dead && !adminSpectator) {
        updateLabyrinthMonsters(dt, camera, scene, renderer, (name, dmg) => {
          if (!player.dead) damagePlayer(dmg, name);
        });
      }
    } else if (isHorrorMap(mapData) && roundActive && !player.dead && !adminSpectator) {
      updateLabyrinthMonsters(dt, camera, scene, renderer, (name, dmg) => {
        if (!player.dead) damagePlayer(dmg, name);
      });
    }
    if (mapData?.openWorld) {
      updateBattleRoyaleLoot(battleRoyaleLoot);
      updateBattleRoyaleDoors(dt);
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

  if (!isJumpscareActive()) renderer.render(scene, camera);
}

window.startStrikeZone = startGame;
window.startAdminPreview = startAdminPreview;
window.runAdminCommand = runAdminCommand;
window.strikeZoneToggleAdminLight = () => {
  if (!isDarkMap(mapData)) {
    showOverlay("Só em mapas escuros");
    return;
  }
  if (!isAdminGameplay()) {
    showOverlay("Login admin (MJuan) necessário");
    return;
  }
  applyAdminDevFullLight(!adminHorrorFullLight);
};
window.__strikeZoneReady = true;

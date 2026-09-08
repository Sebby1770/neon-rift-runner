import './styles.css';
import { createIcons, icons } from 'lucide';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { ACHIEVEMENTS, checkAchievements } from './game/achievements.js';
import { createQualityGovernor, tierSettings } from './game/performance.js';
import { createAudio } from './game/audio.js';
import {
  baseTargetSpeed,
  doubleHazardChance,
  gateSpawnChance,
  gateSpawnInterval,
  hazardDamage,
  hazardSpawnInterval,
  isNearMiss,
  pickupIntervalRange,
  resolveDifficulty,
} from './game/difficulty.js';
import {
  clearGroup,
  createGate,
  crossedGatePlane,
  isGateCleared,
  createHazard,
  createPickup,
  createShield,
  createShip,
  createShockwave,
  disposeObject,
  isGapWallHit,
  isGapWallNearMiss,
} from './game/entities.js';
import {
  createGhostRecorder,
  deserializeGhost,
  sampleAtTime,
  serializeGhost,
  tickGhostRecorder,
} from './game/ghost.js';
import {
  bindAllHoldButtons,
  createKeys,
  gamepadStartEdge,
  handleKeyEvent,
  mergeInput,
  pollGamepadSnapshot,
} from './game/input.js';
import { createMaterials, palette } from './game/materials.js';
import {
  createDailyRng,
  random,
  randFloat,
  randFloatSpread,
  resetRandomSource,
  setRandomSource,
} from './game/rng.js';
import { downloadCanvasPng, drawShareCard } from './game/shareCard.js';
import {
  applyGateClear,
  applyGateMiss,
  applyNearMiss,
  checkMilestones,
  createGameState,
  formatScore,
  formatTime,
  getRunExtras,
  getRunSummary,
  leaderboardMode,
  MODES,
  resetRunState,
} from './game/state.js';
import {
  maybeStartStorm,
  stormDoubleHazardBonus,
  stormHazardIntervalMul,
  stormScoreMultiplier,
  tickStorm,
} from './game/storm.js';
import {
  buildShareText,
  getBestScore,
  getTodayKey,
  hasSeenTutorial,
  loadAchievements,
  loadGhost,
  loadLeaderboard,
  loadSettings,
  markTutorialSeen,
  resetTutorial,
  saveGhost,
  saveSettings,
  submitScore,
  unlockAchievements,
} from './game/storage.js';
import {
  createNebulaBands,
  createParticles,
  createRails,
  createSkyline,
  createSpeedStreaks,
  createStarField,
  createTunnel,
  createWorldGroups,
  resetParticle,
  resetSpeedStreak,
} from './game/world.js';

createIcons({ icons });

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const canvas = document.querySelector('#scene');
const game = document.querySelector('#game');
const splash = document.querySelector('#splash');
const pausePanel = document.querySelector('#pausePanel');
const gameOverPanel = document.querySelector('#gameOverPanel');
const settingsPanel = document.querySelector('#settingsPanel');
const scoreEl = document.querySelector('#score');
const comboEl = document.querySelector('#combo');
const gatesEl = document.querySelector('#gates');
const streakEl = document.querySelector('#streak');
const finalScoreEl = document.querySelector('#finalScore');
const finalGatesEl = document.querySelector('#finalGates');
const finalStreakEl = document.querySelector('#finalStreak');
const finalTimeEl = document.querySelector('#finalTime');
const finalBestEl = document.querySelector('#finalBest');
const newBestEl = document.querySelector('#newBest');
const hullBar = document.querySelector('#hullBar');
const boostBar = document.querySelector('#boostBar');
const riftBar = document.querySelector('#riftBar');
const pauseButton = document.querySelector('#pauseButton');
const soundButton = document.querySelector('#soundButton');
const settingsButton = document.querySelector('#settingsButton');
const startButton = document.querySelector('#startButton');
const zenButton = document.querySelector('#zenButton');
const dailyButton = document.querySelector('#dailyButton');
const practiceButton = document.querySelector('#practiceButton');
const resumeButton = document.querySelector('#resumeButton');
const restartButton = document.querySelector('#restartButton');
const restartFromPause = document.querySelector('#restartFromPause');
const titleFromPause = document.querySelector('#titleFromPause');
const titleFromOver = document.querySelector('#titleFromOver');
const shareButton = document.querySelector('#shareButton');
const shareCardButton = document.querySelector('#shareCardButton');
const closeSettingsButton = document.querySelector('#closeSettings');
const resetTutorialButton = document.querySelector('#resetTutorial');
const dismissTutorialButton = document.querySelector('#dismissTutorial');
const tutorialPanel = document.querySelector('#tutorialPanel');
const callout = document.querySelector('#callout');
const achievementToast = document.querySelector('#achievementToast');
const splashBestEl = document.querySelector('#splashBest');
const splashDailyBestEl = document.querySelector('#splashDailyBest');
const splashAchievementsEl = document.querySelector('#splashAchievements');
const achievementsList = document.querySelector('#achievementsList');
const achievementsCountEl = document.querySelector('#achievementsCount');
const leaderboardList = document.querySelector('#leaderboardList');
const leaderboardTabs = document.querySelectorAll('[data-board]');
const bloomToggle = document.querySelector('#bloomToggle');
const reducedMotionToggle = document.querySelector('#reducedMotionToggle');
const sfxVolumeSlider = document.querySelector('#sfxVolume');
const musicVolumeSlider = document.querySelector('#musicVolume');
const musicToggle = document.querySelector('#musicToggle');
const muteToggle = document.querySelector('#muteToggle');
const fpsToggle = document.querySelector('#fpsToggle');
const adaptiveQualityToggle = document.querySelector('#adaptiveQualityToggle');
const difficultySelect = document.querySelector('#difficultySelect');
const difficultyChips = document.querySelectorAll('[data-difficulty]');
const modeBadge = document.querySelector('#modeBadge');
const comboStat = document.querySelector('.stat-combo');
const fpsMeterEl = document.querySelector('#fpsMeter');
const screenFlashEl = document.querySelector('#screenFlash');

// ---------------------------------------------------------------------------
// Settings + state
// ---------------------------------------------------------------------------
let settings = loadSettings();
const state = createGameState({
  muted: settings.muted,
  difficulty: settings.difficulty || 'normal',
});
const keys = createKeys();
const bounds = { x: 5.3, yMin: 1.1, yMax: 5.8 };
let lastRunSummary = null;
let lastRunIsNewBest = false;
let activeBoardMode = 'normal';
let bloomEnabled = settings.bloom !== false;
const qualityGovernor = createQualityGovernor();
let qualitySettings = qualityGovernor.settings;
let lastFrameAt = 0;
let unlockedAchievements = new Set(loadAchievements());
let achievementToastTimer = 0;
let pendingAchievementToasts = [];
let ghostRecorder = createGhostRecorder();
let activeGhostSamples = [];
let ghostShip = null;
let prevGamepadStart = false;
let fpsFrames = 0;
let fpsTimer = 0;
let fpsValue = 0;
let input = createKeys();

const audio = createAudio({
  getMuted: () => state.muted || settings.muted,
  getSfxVolume: () => settings.sfxVolume ?? 0.8,
  getMusicEnabled: () => settings.music !== false,
  getMusicVolume: () => settings.musicVolume ?? 0.55,
});

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050609, 0.055);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 4.6, 13.5);

const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.88,
  0.66,
  0.12,
);
const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);
applyBloomSetting();

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const materials = createMaterials();
const groups = createWorldGroups();
scene.add(groups.world);

const ship = createShip(materials);
ship.position.set(0, 2.6, 0);
scene.add(ship);

const shield = createShield();
ship.add(shield);

// Translucent ghost of best-path (hidden until samples load)
ghostShip = createShip(materials);
ghostShip.visible = false;
ghostShip.traverse((child) => {
  if (child.isMesh && child.material) {
    child.material = child.material.clone();
    if ('opacity' in child.material) {
      child.material.transparent = true;
      child.material.opacity = 0.28;
      child.material.depthWrite = false;
    }
    if ('emissiveIntensity' in child.material) {
      child.material.emissiveIntensity = (child.material.emissiveIntensity || 0.3) * 0.45;
    }
  }
  if (child.isPointLight) {
    child.intensity = 0;
  }
});
scene.add(ghostShip);

const starField = createStarField();
scene.add(starField);

const tunnel = createTunnel();
scene.add(tunnel);

createRails(materials).forEach((rail) => groups.rails.add(rail));
createSkyline(materials).forEach((building) => groups.skyline.add(building));
createParticles(120).forEach((p) => groups.particles.add(p));
createSpeedStreaks(48, materials).forEach((s) => groups.streaks.add(s));
createNebulaBands().forEach((b) => groups.nebula.add(b));

const ambientLight = new THREE.AmbientLight(0x8cb7ff, 0.38);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-4, 8, 7);
scene.add(sun);
const sideLight = new THREE.PointLight(palette.amber, 30, 45);
sideLight.position.set(7, 4, -14);
scene.add(sideLight);

const pointerTargets = [ship];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function applyBloomSetting() {
  // The user's own bloom switch is the ceiling; adaptive quality may take bloom
  // away on a struggling device but never turns it on against their wish.
  bloomEnabled = settings.bloom !== false && qualitySettings.bloom !== false;
  bloomPass.enabled = bloomEnabled;
  if (!bloomEnabled) bloomPass.strength = 0;
}

/**
 * Applies a quality tier to the renderer and the decorative particle fields.
 *
 * Particles and speed streaks are pooled at startup, so thinning them means
 * hiding the tail of each pool rather than rebuilding it.
 */
function applyQualityTier(tier) {
  qualitySettings = tierSettings(tier);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualitySettings.maxPixelRatio));
  applyBloomSetting();

  const thin = (group, scale) => {
    const keep = Math.max(1, Math.round(group.children.length * scale));
    group.children.forEach((child, index) => {
      child.visible = index < keep;
    });
  };
  thin(groups.particles, qualitySettings.particleScale);
  thin(groups.streaks, qualitySettings.streakScale);
}

function setAdaptiveQuality(enabled) {
  settings.adaptiveQuality = enabled;
  if (!enabled) {
    // Turning it off returns to full detail rather than freezing at whatever
    // tier the device happened to land on.
    qualityGovernor.setTier('high');
    applyQualityTier('high');
  }
  persistSettings();
}

function applyReducedMotion() {
  document.documentElement.classList.toggle('reduced-motion', !!settings.reducedMotion);
}

function getXLimit() {
  if (camera.aspect < 0.58) return 3.25;
  if (camera.aspect < 0.82) return 4.15;
  return bounds.x;
}

function randomFlightX(edgePadding = 0) {
  const limit = Math.max(1.2, getXLimit() - edgePadding);
  return randFloat(-limit, limit);
}

function setOverlay(element, visible) {
  if (!element) return;
  element.classList.toggle('is-visible', visible);
}

function showCallout(message) {
  callout.textContent = message;
  callout.classList.add('is-visible');
  state.calloutTimer = 1.45;
}

function triggerScreenFlash(seconds = 0.28) {
  state.flashTimer = Math.max(state.flashTimer || 0, seconds);
  if (screenFlashEl) {
    screenFlashEl.classList.add('is-active');
  }
  game.classList.add('is-flash');
}

function currentDifficulty() {
  return state.difficulty || settings.difficulty || 'normal';
}

function normalBoardModeForDifficulty(diff = 'normal') {
  if (diff === 'easy') return 'normal:easy';
  if (diff === 'hard') return 'normal:hard';
  return 'normal';
}

function setDifficulty(id) {
  const preset = resolveDifficulty(id);
  settings.difficulty = preset.id;
  state.difficulty = preset.id;
  persistSettings();
  syncDifficultyUI();
  refreshSplashMeta();
}

function syncDifficultyUI() {
  const id = settings.difficulty || 'normal';
  difficultyChips.forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.difficulty === id);
  });
  if (difficultySelect) difficultySelect.value = id;
}

function queueAchievementToast(achievement) {
  pendingAchievementToasts.push(achievement);
  if (achievementToastTimer <= 0) flushAchievementToast();
}

function flushAchievementToast() {
  if (!achievementToast || !pendingAchievementToasts.length) {
    if (achievementToast) achievementToast.classList.remove('is-visible');
    return;
  }
  const next = pendingAchievementToasts.shift();
  achievementToast.innerHTML = `<span class="ach-label">Achievement</span><strong>${next.name}</strong><span class="ach-desc">${next.description}</span>`;
  achievementToast.classList.add('is-visible');
  achievementToastTimer = 2.6;
  audio.play('achievement');
}

function refreshSoundIcon() {
  const muted = state.muted || settings.muted;
  soundButton.innerHTML = `<i data-lucide="${muted ? 'volume-x' : 'volume-2'}"></i>`;
  createIcons({ icons });
}

function syncSettingsUI() {
  if (bloomToggle) bloomToggle.checked = settings.bloom !== false;
  if (reducedMotionToggle) reducedMotionToggle.checked = !!settings.reducedMotion;
  if (sfxVolumeSlider) sfxVolumeSlider.value = String(Math.round((settings.sfxVolume ?? 0.8) * 100));
  if (musicVolumeSlider) {
    musicVolumeSlider.value = String(Math.round((settings.musicVolume ?? 0.55) * 100));
  }
  if (musicToggle) musicToggle.checked = settings.music !== false;
  if (muteToggle) muteToggle.checked = !!(state.muted || settings.muted);
  if (fpsToggle) fpsToggle.checked = !!settings.showFps;
  if (adaptiveQualityToggle) adaptiveQualityToggle.checked = settings.adaptiveQuality !== false;
  syncDifficultyUI();
  updateFpsMeterVisibility();
  renderAchievementsList();
}

function persistSettings() {
  settings = saveSettings({
    ...settings,
    muted: state.muted,
    difficulty: settings.difficulty || 'normal',
    showFps: !!settings.showFps,
    adaptiveQuality: settings.adaptiveQuality !== false,
  });
  audio.syncMusic();
}

function updateFpsMeterVisibility() {
  if (!fpsMeterEl) return;
  fpsMeterEl.hidden = !settings.showFps;
  if (!settings.showFps) fpsMeterEl.textContent = '';
}

function renderAchievementsList() {
  const total = ACHIEVEMENTS.length;
  const count = unlockedAchievements.size;
  if (achievementsCountEl) achievementsCountEl.textContent = `${count}/${total}`;
  if (splashAchievementsEl) splashAchievementsEl.textContent = `${count}/${total}`;
  if (!achievementsList) return;
  achievementsList.innerHTML = ACHIEVEMENTS.map((a) => {
    const unlocked = unlockedAchievements.has(a.id);
    return `<li class="${unlocked ? 'is-unlocked' : 'is-locked'}"><span class="ach-dot"></span><div><strong>${a.name}</strong><span>${a.description}</span></div></li>`;
  }).join('');
}

function processAchievements(summary, extras) {
  if (summary.practice) return;
  const newly = checkAchievements(summary, extras, unlockedAchievements);
  if (!newly.length) return;
  for (const a of newly) unlockedAchievements.add(a.id);
  unlockAchievements(newly.map((a) => a.id));
  for (const a of newly) queueAchievementToast(a);
  renderAchievementsList();
}

function refreshSplashMeta() {
  const boardMode = normalBoardModeForDifficulty(settings.difficulty || 'normal');
  const best = getBestScore(boardMode);
  const dailyBest = getBestScore('daily', { todayKey: getTodayKey() });
  if (splashBestEl) {
    const label = resolveDifficulty(settings.difficulty).label;
    splashBestEl.textContent = best > 0 ? formatScore(best) : '—';
    splashBestEl.title = `Best (${label})`;
  }
  if (splashDailyBestEl) {
    splashDailyBestEl.textContent = dailyBest > 0 ? formatScore(dailyBest) : '—';
  }
  renderAchievementsList();
  // Keep leaderboard tab on normal family when difficulty changes
  if (activeBoardMode === 'normal' || activeBoardMode?.startsWith?.('normal')) {
    renderLeaderboard(boardMode);
  } else {
    renderLeaderboard(activeBoardMode);
  }
}

function updateModeBadge() {
  if (!modeBadge) return;
  if (state.mode === MODES.TITLE || state.mode === MODES.GAMEOVER) {
    modeBadge.hidden = true;
    return;
  }
  if (state.practice) {
    modeBadge.hidden = false;
    modeBadge.textContent = 'Practice';
    modeBadge.dataset.mode = 'practice';
  } else if (state.daily) {
    modeBadge.hidden = false;
    modeBadge.textContent = 'Daily';
    modeBadge.dataset.mode = 'daily';
  } else if (state.zen) {
    modeBadge.hidden = false;
    modeBadge.textContent = 'Zen';
    modeBadge.dataset.mode = 'zen';
  } else {
    const diff = resolveDifficulty(currentDifficulty());
    modeBadge.hidden = false;
    modeBadge.textContent = diff.label;
    modeBadge.dataset.mode = diff.id === 'normal' ? 'normal' : diff.id;
  }
}

function renderLeaderboard(mode = 'normal') {
  // Map splash "normal" tab to difficulty-specific board
  let boardMode = mode;
  if (mode === 'normal') {
    boardMode = normalBoardModeForDifficulty(settings.difficulty || 'normal');
  }
  activeBoardMode = mode;
  leaderboardTabs.forEach((tab) => {
    const tabMode = tab.dataset.board;
    tab.classList.toggle(
      'is-active',
      tabMode === mode || (mode?.startsWith?.('normal') && tabMode === 'normal'),
    );
  });
  if (!leaderboardList) return;
  const board = loadLeaderboard(boardMode, {
    todayKey: boardMode === 'daily' ? getTodayKey() : undefined,
  });
  if (!board.length) {
    const diffHint =
      mode === 'normal'
        ? ` (${resolveDifficulty(settings.difficulty).label})`
        : '';
    leaderboardList.innerHTML = `<li class="empty">No scores yet${diffHint} — launch a run.</li>`;
    return;
  }
  // Built as nodes rather than an innerHTML template: these values come from
  // localStorage, which is shared by every project on the same origin, so no
  // field here should ever be able to become markup.
  leaderboardList.replaceChildren(
    ...board.map((entry, i) => {
      const row = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = `#${i + 1}`;
      const pts = document.createElement('span');
      pts.className = 'pts';
      pts.textContent = formatScore(entry.score);
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = `${entry.gates}g · ${formatTime(entry.runTime)}`;
      row.append(rank, pts, meta);
      return row;
    }),
  );
}

function loadGhostForRun({ zen, daily, practice, difficulty }) {
  if (practice) {
    activeGhostSamples = [];
    return;
  }
  let mode = 'normal';
  if (daily) mode = 'daily';
  else if (zen) mode = 'zen';
  else mode = normalBoardModeForDifficulty(difficulty || 'normal');
  activeGhostSamples = deserializeGhost(loadGhost(mode));
}

function updateGhostShip() {
  if (!ghostShip) return;
  if (!activeGhostSamples.length || state.mode !== MODES.PLAYING) {
    ghostShip.visible = false;
    return;
  }
  const pos = sampleAtTime(activeGhostSamples, state.runTime);
  if (!pos) {
    ghostShip.visible = false;
    return;
  }
  ghostShip.visible = true;
  ghostShip.position.x = pos.x;
  ghostShip.position.y = pos.y;
  ghostShip.position.z = ship.position.z - 0.15;
  ghostShip.rotation.z = Math.sin(state.runTime * 2.2) * 0.05;
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
function startGame({ zen = false, daily = false, practice = false } = {}) {
  resetRandomSource();
  let dailyKey = null;
  if (daily) {
    dailyKey = getTodayKey();
    setRandomSource(createDailyRng(dailyKey));
  }

  const difficulty = settings.difficulty || 'normal';
  resetRunState(state, { zen, daily, practice, dailyKey, difficulty });
  ship.position.set(0, 2.6, 0);
  ship.rotation.set(0, 0, 0);
  if (ghostShip) {
    ghostShip.position.set(0, 2.6, -0.15);
    ghostShip.visible = false;
  }
  game.classList.remove('is-overdrive', 'is-storm', 'is-flash');
  game.classList.toggle('is-practice', !!practice);
  callout.classList.remove('is-visible');
  callout.textContent = '';
  if (newBestEl) newBestEl.classList.remove('is-visible');
  if (screenFlashEl) screenFlashEl.classList.remove('is-active');

  clearGroup(groups.obstacles, materials);
  clearGroup(groups.gates, materials);
  clearGroup(groups.pickups, materials);
  clearGroup(groups.effects, materials);

  ghostRecorder = createGhostRecorder();
  loadGhostForRun({ zen, daily, practice, difficulty });

  for (let i = 0; i < 3; i += 1) {
    const gate = createGate(materials, {
      runTime: 0,
      randomX: randomFlightX,
      difficulty,
    });
    gate.position.z = -55 - i * 33;
    gate.userData.previousZ = gate.position.z;
    groups.gates.add(gate);
  }

  setOverlay(splash, false);
  setOverlay(pausePanel, false);
  setOverlay(gameOverPanel, false);
  setOverlay(settingsPanel, false);
  setOverlay(tutorialPanel, false);
  audio.resume();
  audio.startMusic();
  audio.play('launch');
  updateModeBadge();
  updateHud();
}

function returnToTitle() {
  state.mode = MODES.TITLE;
  state.practice = false;
  game.classList.remove('is-overdrive', 'is-practice', 'is-storm', 'is-flash');
  if (ghostShip) ghostShip.visible = false;
  clearGroup(groups.obstacles, materials);
  clearGroup(groups.gates, materials);
  clearGroup(groups.pickups, materials);
  clearGroup(groups.effects, materials);
  setOverlay(pausePanel, false);
  setOverlay(gameOverPanel, false);
  setOverlay(settingsPanel, false);
  setOverlay(splash, true);
  resetRandomSource();
  refreshSplashMeta();
  updateModeBadge();
  updateHud();
  audio.play('tap');
}

function pauseGame() {
  if (state.mode !== MODES.PLAYING) return;
  // Practice: Esc returns to title (no score pressure)
  if (state.practice) {
    returnToTitle();
    return;
  }
  state.mode = MODES.PAUSED;
  setOverlay(pausePanel, true);
  audio.play('tap');
}

function resumeGame() {
  if (state.mode !== MODES.PAUSED) return;
  state.mode = MODES.PLAYING;
  setOverlay(pausePanel, false);
  audio.play('launch');
}

function endGame() {
  if (state.mode === MODES.GAMEOVER) return;
  // Practice never game-overs from hull
  if (state.practice) return;

  state.mode = MODES.GAMEOVER;
  game.classList.remove('is-storm', 'is-overdrive');
  if (ghostShip) ghostShip.visible = false;

  const summary = getRunSummary(state);
  const extras = getRunExtras(state);
  lastRunSummary = summary;
  const mode = leaderboardMode(state);

  let result = { isNewBest: false };
  if (mode) {
    result = submitScore(mode, summary, {
      todayKey: summary.dailyKey || getTodayKey(),
    });
  }
  state.isNewBest = result.isNewBest;
  lastRunIsNewBest = !!result.isNewBest;

  // Persist ghost path on new best for this board
  if (result.isNewBest && mode && ghostRecorder?.samples?.length) {
    try {
      const raw = serializeGhost(ghostRecorder.samples);
      saveGhost(mode, JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  processAchievements(summary, { ...extras, completed: true });

  if (finalScoreEl) finalScoreEl.textContent = formatScore(summary.score);
  if (finalGatesEl) finalGatesEl.textContent = String(summary.gates);
  if (finalStreakEl) finalStreakEl.textContent = String(summary.maxStreak);
  if (finalTimeEl) finalTimeEl.textContent = formatTime(summary.runTime);
  const best = mode
    ? getBestScore(mode, {
        todayKey: mode === 'daily' ? summary.dailyKey : undefined,
      })
    : 0;
  if (finalBestEl) finalBestEl.textContent = formatScore(best || summary.score);
  if (newBestEl) newBestEl.classList.toggle('is-visible', !!result.isNewBest);

  setOverlay(gameOverPanel, true);
  audio.play('crash');
  refreshSplashMeta();
  resetRandomSource();
  updateModeBadge();
}

function openSettings() {
  syncSettingsUI();
  setOverlay(settingsPanel, true);
  audio.play('tap');
}

function closeSettings() {
  setOverlay(settingsPanel, false);
  persistSettings();
  applyBloomSetting();
  applyReducedMotion();
  refreshSoundIcon();
}

function openTutorial() {
  setOverlay(tutorialPanel, true);
  createIcons({ icons });
}

function dismissTutorial() {
  markTutorialSeen();
  setOverlay(tutorialPanel, false);
  audio.play('tap');
}

// ---------------------------------------------------------------------------
// Update loop
// ---------------------------------------------------------------------------
function update(delta) {
  // Gamepad + keyboard merge each frame
  const pad = pollGamepadSnapshot();
  const startEdge = gamepadStartEdge(pad, prevGamepadStart);
  prevGamepadStart = startEdge.prevStart;
  if (startEdge.pressedEdge) {
    if (tutorialPanel?.classList.contains('is-visible')) {
      dismissTutorial();
    } else if (settingsPanel?.classList.contains('is-visible')) {
      closeSettings();
    } else if (state.mode === MODES.PLAYING) {
      pauseGame();
    } else if (state.mode === MODES.PAUSED) {
      resumeGame();
    } else if (state.mode === MODES.GAMEOVER) {
      returnToTitle();
    }
  }
  input = mergeInput(keys, pad);

  const playing = state.mode === MODES.PLAYING;
  const elapsed = clock.elapsedTime;
  const overdriveActive = playing && state.overdrive > 0;
  const boostActive = playing && (overdriveActive || (input.boost && state.boost > 2));

  const reduced = settings.reducedMotion;
  const speedMul = reduced ? 0.92 : 1;

  state.targetSpeed =
    baseTargetSpeed(state.zen || state.practice, playing ? state.runTime : 0) * speedMul +
    (input.boost && state.boost > 2 ? 17 : 0) +
    (overdriveActive ? 20 : 0) +
    (state.stormActive ? 4 : 0);
  state.speed = THREE.MathUtils.lerp(state.speed, state.targetSpeed, 1 - Math.exp(-delta * 2.5));

  if (achievementToastTimer > 0) {
    achievementToastTimer = Math.max(0, achievementToastTimer - delta);
    if (achievementToastTimer === 0) flushAchievementToast();
  }

  // Screen flash decay
  if (state.flashTimer > 0) {
    state.flashTimer = Math.max(0, state.flashTimer - delta);
    if (state.flashTimer === 0) {
      game.classList.remove('is-flash');
      if (screenFlashEl) screenFlashEl.classList.remove('is-active');
    }
  }

  // FPS meter
  if (settings.showFps && fpsMeterEl) {
    fpsFrames += 1;
    fpsTimer += delta;
    if (fpsTimer >= 0.4) {
      fpsValue = Math.round(fpsFrames / fpsTimer);
      const tier = qualityGovernor.tier;
      fpsMeterEl.textContent = tier === 'high' ? `${fpsValue} FPS` : `${fpsValue} FPS · ${tier}`;
      fpsFrames = 0;
      fpsTimer = 0;
    }
  }

  if (playing) {
    state.runTime += delta;
    state.spawnTimer -= delta;
    state.pickupTimer -= delta;
    state.hazardTimer -= delta;
    if (!state.practice) {
      state.invulnerable = Math.max(0, state.invulnerable - delta);
    } else {
      state.invulnerable = Math.max(state.invulnerable, 999);
      state.hull = 999;
    }
    state.overdrive = Math.max(0, state.overdrive - delta);
    state.shake = Math.max(0, state.shake - delta * 2.4);
    state.combo = Math.max(1, state.combo - delta * (overdriveActive ? 0.01 : 0.05));
    state.calloutTimer = Math.max(0, state.calloutTimer - delta);
    state.nearMissCooldown = Math.max(0, state.nearMissCooldown - delta);

    // Rift Storm tick / start
    const stormEndMsg = tickStorm(state, delta);
    if (stormEndMsg) {
      showCallout(stormEndMsg);
      audio.play('milestone');
    }
    const stormStartMsg = maybeStartStorm(state);
    if (stormStartMsg) {
      showCallout(stormStartMsg);
      state.calloutTimer = 1.8;
      triggerScreenFlash(0.35);
      audio.play('overdrive');
    }

    if (state.rift >= 100 && !overdriveActive) {
      triggerOverdrive();
    }

    if (input.boost && state.boost > 2 && !overdriveActive) {
      state.boost = Math.max(0, state.boost - delta * 22);
      state.combo = Math.min(6, state.combo + delta * 0.18);
    } else {
      state.boost = Math.min(100, state.boost + delta * (overdriveActive ? 13 : 7.5));
    }

    if (overdriveActive) {
      state.rift = Math.max(0, state.rift - delta * 16.5);
      state.combo = Math.min(8, state.combo + delta * 0.25);
      state.invulnerable = Math.max(state.invulnerable, 0.16);
    }

    moveShip(delta, boostActive);
    tickGhostRecorder(ghostRecorder, ship.position, state.runTime, delta);
    updateGhostShip();
    spawnObjects();
    const stormMul = stormScoreMultiplier(state);
    state.scoreCarry +=
      delta *
      state.speed *
      state.combo *
      (boostActive ? 2.1 : 1) *
      (overdriveActive ? 1.7 : 1) *
      stormMul;
    if (state.scoreCarry >= 1) {
      const gained = Math.floor(state.scoreCarry);
      state.score += gained;
      state.scoreCarry -= gained;
    }
    updateCollisions();

    // Live achievement checks mid-run (gates/score/streak) for toast feedback
    if (!state.practice && state.runTime > 1) {
      processAchievements(getRunSummary(state), getRunExtras(state));
    }

    const milestones = checkMilestones(state);
    for (const msg of milestones) {
      // Avoid stacking with RIFT STORM callout on gate 25
      if (state.stormActive && msg.includes('25 gates')) continue;
      showCallout(msg);
      audio.play('milestone');
    }
  } else {
    ship.rotation.z = THREE.MathUtils.lerp(
      ship.rotation.z,
      Math.sin(elapsed) * 0.04,
      1 - Math.exp(-delta * 2),
    );
    ship.position.y = THREE.MathUtils.lerp(
      ship.position.y,
      2.6 + Math.sin(elapsed * 1.4) * 0.12,
      1 - Math.exp(-delta * 2),
    );
    if (ghostShip) ghostShip.visible = false;
  }

  if (state.calloutTimer === 0) callout.classList.remove('is-visible');
  game.classList.toggle('is-overdrive', state.overdrive > 0);
  game.classList.toggle('is-storm', !!state.stormActive);
  updateWorld(delta, elapsed, playing, overdriveActive);
  updateCamera(delta, boostActive, elapsed, overdriveActive);
  updateHud();
}

function moveShip(delta, boostActive) {
  const xLimit = getXLimit();
  const overdriveActive = state.overdrive > 0;
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.up) - Number(input.down);
  const moveSpeed = boostActive ? 9.3 : 7.6;
  ship.position.x += horizontal * moveSpeed * delta;
  ship.position.y += vertical * moveSpeed * delta;
  ship.position.x = THREE.MathUtils.clamp(ship.position.x, -xLimit, xLimit);
  ship.position.y = THREE.MathUtils.clamp(ship.position.y, bounds.yMin, bounds.yMax);
  ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -horizontal * 0.42, 1 - Math.exp(-delta * 10));
  ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, vertical * 0.16, 1 - Math.exp(-delta * 8));
  ship.userData.trails.forEach((trail, index) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 18 + index) * 0.14 + (boostActive ? 0.45 : 0);
    trail.scale.set(
      trail.userData.baseScale.x * pulse,
      trail.userData.baseScale.y,
      trail.userData.baseScale.z,
    );
    const trailColor = state.stormActive
      ? palette.violet
      : overdriveActive
        ? palette.amber
        : palette.cyan;
    trail.material.color.setHex(trailColor);
    trail.material.opacity = overdriveActive ? 0.96 : boostActive ? 0.88 : 0.56;
  });
  ship.userData.glow.color.setHex(
    state.stormActive ? palette.violet : overdriveActive ? palette.amber : palette.cyan,
  );
  ship.userData.glow.intensity = overdriveActive ? 18 : boostActive ? 12 : state.stormActive ? 14 : 6;
}

function spawnObjects() {
  const rt = state.runTime;
  const diff = currentDifficulty();
  if (state.spawnTimer <= 0) {
    state.spawnTimer = gateSpawnInterval(rt, diff);
    if (random() < gateSpawnChance(rt, diff)) {
      groups.gates.add(
        createGate(materials, { runTime: rt, randomX: randomFlightX, difficulty: diff }),
      );
    }
  }

  // Zen: no deadly hazards. Practice: sparse hazards for free-fly (no hull loss).
  const allowHazards = !state.zen && state.overdrive <= 0;
  if (allowHazards && state.hazardTimer <= 0) {
    let interval = state.practice
      ? hazardSpawnInterval(rt, diff) * 1.8
      : hazardSpawnInterval(rt, diff);
    interval *= stormHazardIntervalMul(state);
    state.hazardTimer = interval;
    groups.obstacles.add(
      createHazard(materials, { runTime: rt, randomX: randomFlightX, difficulty: diff }),
    );
    const doubleChance = doubleHazardChance(rt, diff) + stormDoubleHazardBonus(state);
    if (!state.practice && random() < doubleChance) {
      groups.obstacles.add(
        createHazard(materials, { runTime: rt, randomX: randomFlightX, difficulty: diff }),
      );
    }
  }

  if (state.pickupTimer <= 0) {
    const [lo, hi] = pickupIntervalRange(rt);
    state.pickupTimer = randFloat(lo, hi) * (state.practice ? 0.75 : 1);
    const roll = random();
    const kind = roll > 0.86 ? 'rift' : roll > 0.68 ? 'shield' : 'boost';
    groups.pickups.add(createPickup(materials, kind, { randomX: randomFlightX }));
  }
}

function updateWorld(delta, elapsed, playing, overdriveActive) {
  const travel = state.speed * delta * (playing ? 1 : 0.42);

  tunnel.rotation.z += delta * (overdriveActive ? 0.16 : 0.04);
  tunnel.position.z += travel * 0.08;
  if (tunnel.position.z > -72) tunnel.position.z = -92;

  starField.position.z += travel * 0.18;
  if (starField.position.z > 55) starField.position.z = 0;

  groups.rails.children.forEach((rail, index) => {
    rail.position.z += travel * rail.userData.speedFactor;
    rail.material.opacity =
      0.24 + Math.sin(elapsed * 5 + index) * 0.08 + (input.boost ? 0.22 : 0) + (state.stormActive ? 0.12 : 0);
    if (rail.position.z > 18) rail.position.z -= 240;
  });

  groups.skyline.children.forEach((building, index) => {
    building.position.z += travel * 0.78;
    building.position.x += Math.sin(elapsed * 0.8 + index) * delta * 0.05;
    if (building.position.z > 28) {
      building.position.z -= 294;
      building.position.x =
        Math.sign(building.position.x || 1) * THREE.MathUtils.randFloat(8.8, 15.8);
    }
  });

  groups.particles.children.forEach((particle) => {
    particle.position.z += travel * (1.2 + particle.userData.drift + (overdriveActive ? 0.85 : 0));
    particle.position.y += Math.sin(elapsed * 3 + particle.position.x) * delta * 0.15;
    if (particle.position.z > 20) resetParticle(particle);
  });

  groups.streaks.children.forEach((streak) => {
    streak.position.z += travel * (1.8 + streak.userData.depth + (overdriveActive ? 1.6 : 0));
    streak.material.opacity = THREE.MathUtils.lerp(
      streak.material.opacity,
      overdriveActive ? 0.88 : THREE.MathUtils.mapLinear(state.speed, 24, 62, 0.14, 0.56),
      1 - Math.exp(-delta * 5),
    );
    streak.scale.z = THREE.MathUtils.lerp(
      streak.scale.z,
      overdriveActive ? 14 : 7,
      1 - Math.exp(-delta * 4),
    );
    if (streak.position.z > 22) resetSpeedStreak(streak);
  });

  groups.nebula.children.forEach((band, index) => {
    band.position.z += travel * band.userData.drift;
    band.rotation.z += delta * (index % 2 === 0 ? 0.015 : -0.012);
    const stormBoost = state.stormActive ? 0.1 : 0;
    band.material.opacity = overdriveActive
      ? 0.16
      : 0.08 + Math.sin(elapsed + index) * 0.015 + stormBoost;
    if (state.stormActive) {
      band.material.color.setHex(index % 2 === 0 ? palette.violet : palette.rose);
    } else if (band.userData.baseHue == null) {
      // leave material as created
    }
    if (band.position.z > 34) {
      band.position.z -= 188;
      band.position.x = randFloatSpread(10);
    }
  });

  // Tunnel tint during Rift Storm
  if (tunnel?.material) {
    tunnel.material.color.setHex(state.stormActive ? 0x1a0818 : 0x0a1014);
    tunnel.material.opacity = state.stormActive ? 0.32 : 0.2;
  }
  if (scene.fog) {
    scene.fog.color.setHex(state.stormActive ? 0x120814 : 0x050609);
    scene.fog.density = state.stormActive ? 0.068 : 0.055;
  }

  moveDynamicGroup(groups.gates, travel, delta, elapsed);
  moveDynamicGroup(groups.obstacles, travel, delta, elapsed);
  moveDynamicGroup(groups.pickups, travel, delta, elapsed);
  updateEffects(delta);

  shield.rotation.y += delta * 1.4;
  shield.rotation.z -= delta * 0.8;
  shield.material.opacity = THREE.MathUtils.lerp(
    shield.material.opacity,
    state.invulnerable > 0 || overdriveActive ? 0.3 + Math.sin(elapsed * 16) * 0.08 : 0,
    1 - Math.exp(-delta * 8),
  );
}

function moveDynamicGroup(group, travel, delta, elapsed) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const object = group.children[i];
    object.userData.previousZ = object.position.z;
    object.position.z += travel;
    object.rotation.z += delta * (object.userData.spin || 0);
    object.rotation.y += delta * (object.userData.spin || 0) * 0.44;
    if (object.userData.variant === 'slicer') {
      const swaySpeed = object.userData.swaySpeed || 1.8;
      object.position.x =
        object.userData.baseX + Math.sin(elapsed * swaySpeed + object.userData.phase) * object.userData.sway;
    }
    if (object.userData.variant === 'gapwall') {
      const swaySpeed = object.userData.swaySpeed || 1.15;
      const gapX =
        (object.userData.baseGapX || 0) +
        Math.sin(elapsed * swaySpeed + object.userData.phase) * (object.userData.sway || 1.8);
      object.userData.gapX = gapX;
      object.position.x = gapX;
    }
    if (
      object.userData.type === 'boost' ||
      object.userData.type === 'shield' ||
      object.userData.type === 'rift'
    ) {
      object.position.y =
        object.userData.baseY + Math.sin(elapsed * 2.4 + object.userData.phase) * 0.18;
    }
    if (object.userData.variant !== 'gapwall') {
      object.scale.multiplyScalar(1 + Math.sin(elapsed * 5 + object.position.z) * 0.0008);
    }
    if (object.position.z > 12) {
      group.remove(object);
      disposeObject(object, materials);
    }
  }
}

function updateCollisions() {
  const shipPosition = ship.position;

  groups.gates.children.forEach((gate) => {
    if (gate.userData.scored) return;
    if (!crossedGatePlane(gate.userData.previousZ ?? gate.position.z, gate.position.z)) return;
    gate.userData.scored = true;
    if (isGateCleared(shipPosition, gate)) {
      applyGateClear(state);
      pulseObject(gate, palette.lime);
      createShockwaveAt(gate.position, state.streak >= 4 ? palette.amber : palette.lime, gate.userData.radius);
      if (state.streak === 4) showCallout('Gate streak: rift charge climbing');
      if (state.streak > 0 && state.streak % 7 === 0) showCallout(`${state.streak} gate streak`);
      audio.play('gate');
    } else {
      applyGateMiss(state);
      pulseObject(gate, palette.rose);
      createShockwaveAt(gate.position, palette.rose, gate.userData.radius * 0.7);
      audio.play('miss');
    }
  });

  for (let i = groups.pickups.children.length - 1; i >= 0; i -= 1) {
    const pickup = groups.pickups.children[i];
    if (shipPosition.distanceTo(pickup.position) > pickup.userData.radius + 0.65) continue;
    if (pickup.userData.type === 'boost') {
      state.boost = Math.min(100, state.boost + 34);
      state.score += 170;
      audio.play('pickup');
      showCallout('Boost charge');
    } else if (pickup.userData.type === 'rift') {
      state.rift = Math.min(100, state.rift + 32);
      state.combo = Math.min(8, state.combo + 0.45);
      state.score += 320;
      audio.play('rift');
      showCallout('Rift shard');
    } else {
      state.invulnerable = Math.max(state.invulnerable, 4.8);
      state.score += 220;
      audio.play('shield');
      showCallout('Shield online');
    }
    createShockwaveAt(
      pickup.position,
      pickup.userData.type === 'rift' ? palette.violet : palette.lime,
      pickup.userData.radius,
    );
    groups.pickups.remove(pickup);
    disposeObject(pickup, materials);
  }

  if (state.overdrive > 0) {
    for (let i = groups.obstacles.children.length - 1; i >= 0; i -= 1) {
      const hazard = groups.obstacles.children[i];
      const smash =
        hazard.userData.variant === 'gapwall'
          ? Math.abs(hazard.position.z) < 2.2
          : shipPosition.distanceTo(hazard.position) <= hazard.userData.radius + 0.72;
      if (!smash) continue;
      state.score += 420;
      state.rift = Math.min(100, state.rift + 5);
      state.shake = Math.max(state.shake, 0.35);
      createShockwaveAt(hazard.position, palette.amber, hazard.userData.radius || 1.2);
      groups.obstacles.remove(hazard);
      disposeObject(hazard, materials);
      audio.play('pickup');
    }
    return;
  }

  const diff = currentDifficulty();

  // Near-miss scoring (normal / practice, not invulnerable)
  if (!state.zen && state.invulnerable <= 0 && state.nearMissCooldown <= 0) {
    for (const hazard of groups.obstacles.children) {
      if (hazard.position.z < -2.5 || hazard.position.z > 2.5) continue;
      let skim = false;
      if (hazard.userData.variant === 'gapwall') {
        skim = isGapWallNearMiss(shipPosition, hazard, 0.58);
      } else {
        const d = shipPosition.distanceTo(hazard.position);
        skim = isNearMiss(d, hazard.userData.radius, 0.58, diff);
      }
      if (skim) {
        applyNearMiss(state);
        showCallout('Near miss +bonus');
        audio.play('nearmiss');
        createShockwaveAt(hazard.position, palette.cyan, (hazard.userData.radius || 1) * 0.5, 0.6);
        break;
      }
    }
  }

  if (state.zen || state.practice || state.invulnerable > 0) return;

  for (let i = groups.obstacles.children.length - 1; i >= 0; i -= 1) {
    const hazard = groups.obstacles.children[i];
    let hit = false;
    if (hazard.userData.variant === 'gapwall') {
      if (hazard.position.z < -1.1 || hazard.position.z > 1.1) continue;
      if (hazard.userData.scored) continue;
      // Evaluate once when crossing the plane
      if (hazard.position.z > -0.35) {
        hazard.userData.scored = true;
        hit = isGapWallHit(shipPosition, hazard, 0.58);
      }
    } else {
      hit = shipPosition.distanceTo(hazard.position) <= hazard.userData.radius + 0.58;
    }
    if (!hit) continue;
    state.hull -= hazardDamage(diff, 24);
    state.combo = 1;
    state.streak = 0;
    state.rift = Math.max(0, state.rift - 18);
    state.shake = 1;
    state.invulnerable = 1.1;
    state.speed *= 0.86;
    audio.play('hit');
    groups.obstacles.remove(hazard);
    disposeObject(hazard, materials);
    if (state.hull <= 0) {
      state.hull = 0;
      endGame();
      break;
    }
  }
}

function pulseObject(object, color) {
  const flash = new THREE.PointLight(color, 30, 16);
  flash.position.copy(object.position);
  groups.world.add(flash);
  setTimeout(() => {
    groups.world.remove(flash);
    if (typeof flash.dispose === 'function') flash.dispose();
  }, 130);
}

function triggerOverdrive() {
  state.overdrive = 6.2;
  state.rift = 100;
  state.invulnerable = Math.max(state.invulnerable, 6.2);
  state.combo = Math.min(8, state.combo + 1.2);
  state.shake = Math.max(state.shake, 0.7);
  showCallout('Overdrive');
  triggerScreenFlash(0.32);
  createShockwaveAt(ship.position, palette.white, 1.4, 1.6);
  audio.play('overdrive');
}

function createShockwaveAt(position, color, radius = 1, force = 1) {
  groups.effects.add(createShockwave(materials, position, color, radius, force));
}

function updateEffects(delta) {
  for (let i = groups.effects.children.length - 1; i >= 0; i -= 1) {
    const effect = groups.effects.children[i];
    effect.userData.life -= delta;
    effect.scale.addScalar(effect.userData.growth * delta);
    effect.material.opacity = Math.max(0, (effect.userData.life / effect.userData.maxLife) * 0.74);
    if (effect.userData.life <= 0) {
      groups.effects.remove(effect);
      disposeObject(effect, materials);
    }
  }
}

function updateCamera(delta, boostActive, elapsed, overdriveActive) {
  const shakeAmount = settings.reducedMotion ? state.shake * 0.08 : state.shake * 0.28;
  const sideFollow = camera.aspect < 0.72 ? 0.74 : 0.32;
  const lookFollow = camera.aspect < 0.72 ? 0.5 : 0.2;
  const target = new THREE.Vector3(
    ship.position.x * sideFollow + (Math.random() - 0.5) * shakeAmount,
    ship.position.y + 2.05 + (Math.random() - 0.5) * shakeAmount,
    12.4 - (boostActive ? 1.2 : 0),
  );
  camera.position.lerp(target, 1 - Math.exp(-delta * 4.8));
  const lookAt = new THREE.Vector3(ship.position.x * lookFollow, ship.position.y + 0.25, -10);
  camera.lookAt(lookAt);
  camera.fov = THREE.MathUtils.lerp(
    camera.fov,
    overdriveActive ? 73 : boostActive ? 69 : 64,
    1 - Math.exp(-delta * 3),
  );
  camera.updateProjectionMatrix();

  if (bloomEnabled) {
    bloomPass.strength = THREE.MathUtils.lerp(
      bloomPass.strength,
      overdriveActive ? 1.55 : boostActive ? 1.25 : 0.88 + Math.sin(elapsed) * 0.06,
      1 - Math.exp(-delta * 2),
    );
  }
}

function updateHud() {
  scoreEl.textContent = formatScore(state.score);
  comboEl.textContent = `x${state.combo.toFixed(1)}`;
  streakEl.textContent = String(state.streak);
  gatesEl.textContent = String(state.gates);
  const hullDisplay = state.practice || state.zen ? 100 : state.hull;
  hullBar.style.transform = `scaleX(${THREE.MathUtils.clamp(hullDisplay, 0, 100) / 100})`;
  boostBar.style.transform = `scaleX(${state.boost / 100})`;
  riftBar.style.transform = `scaleX(${state.rift / 100})`;
  hullBar.style.filter = !state.practice && state.hull <= 30 ? 'saturate(1.4) brightness(1.15)' : '';
  boostBar.style.filter = input.boost ? 'brightness(1.35)' : '';
  riftBar.style.filter = state.overdrive > 0 ? 'brightness(1.8) saturate(1.5)' : '';

  // Combo / heat meter polish
  const heat = state.combo;
  if (comboStat) {
    comboStat.classList.toggle('combo-hot', heat >= 2.5);
    comboStat.classList.toggle('combo-blaze', heat >= 4.5);
    comboStat.classList.toggle('combo-overdrive', state.overdrive > 0);
    comboStat.classList.toggle('combo-storm', !!state.stormActive);
  }
  comboEl.classList.toggle('is-pulse', heat >= 3 || state.stormActive);
  game.classList.toggle('is-heat', heat >= 3.5);
  game.classList.toggle('is-blaze', heat >= 5.5);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  update(delta);
  composer.render();

  // Measured against the wall clock, not `delta`, which is clamped — the whole
  // point is to notice the frames the clamp hides.
  const now = performance.now();
  if (settings.adaptiveQuality !== false && lastFrameAt) {
    const outcome = qualityGovernor.record(now - lastFrameAt, now);
    if (outcome.changed) applyQualityTier(outcome.tier);
  }
  lastFrameAt = now;

  requestAnimationFrame(animate);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualitySettings.maxPixelRatio));
  renderer.setSize(width, height);
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
}

async function shareScore() {
  if (!lastRunSummary) return;
  const mode = lastRunSummary.daily
    ? 'daily'
    : lastRunSummary.zen
      ? 'zen'
      : normalBoardModeForDifficulty(lastRunSummary.difficulty || 'normal');
  const text = buildShareText(lastRunSummary, {
    mode,
    dailyKey: lastRunSummary.dailyKey,
    difficulty: lastRunSummary.difficulty,
  });
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showCallout('Score copied');
      state.calloutTimer = 1.2;
      audio.play('tap');
    }
  } catch {
    // fallback: ignore
  }
}

async function shareCard() {
  if (!lastRunSummary) return;
  const modeLabel = lastRunSummary.daily
    ? `Daily Challenge (${lastRunSummary.dailyKey || getTodayKey()})`
    : lastRunSummary.zen
      ? 'Zen Run'
      : lastRunSummary.practice
        ? 'Practice'
        : 'Normal Run';
  const difficultyLabel = lastRunSummary.daily || lastRunSummary.zen || lastRunSummary.practice
    ? ''
    : resolveDifficulty(lastRunSummary.difficulty || 'normal').label;
  const canvas = drawShareCard(lastRunSummary, {
    modeLabel,
    difficultyLabel,
    isNewBest: lastRunIsNewBest || state.isNewBest,
  });
  if (!canvas) {
    showCallout('Share card unavailable');
    return;
  }
  const ok = await downloadCanvasPng(
    canvas,
    `neon-rift-${Math.round(lastRunSummary.score)}.png`,
  );
  if (ok) {
    showCallout('Share card saved');
    state.calloutTimer = 1.4;
    audio.play('tap');
  } else {
    showCallout('Could not export card');
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (event) =>
  handleKeyEvent(keys, event, true, {
    onEscape: () => {
      if (tutorialPanel?.classList.contains('is-visible')) {
        dismissTutorial();
        return;
      }
      if (settingsPanel?.classList.contains('is-visible')) {
        closeSettings();
        return;
      }
      if (state.mode === MODES.PLAYING) pauseGame();
      else if (state.mode === MODES.PAUSED) resumeGame();
      else if (state.mode === MODES.GAMEOVER) returnToTitle();
    },
  }),
);
window.addEventListener('keyup', (event) => handleKeyEvent(keys, event, false));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || state.mode !== MODES.PLAYING) return;
  // A background tab stops painting but the run kept going, so players came back
  // to a wrecked ship. Pause directly rather than calling pauseGame(), which
  // drops practice runs to the title — that is what Esc is for.
  state.mode = MODES.PAUSED;
  setOverlay(pausePanel, true);
});

window.addEventListener('resize', resize);
window.addEventListener('pointermove', (event) => {
  if (state.mode !== MODES.PLAYING || event.pointerType !== 'mouse') return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(pointerTargets, true);
  document.body.style.cursor = intersects.length ? 'crosshair' : '';
});

bindAllHoldButtons(document, keys);

startButton?.addEventListener('click', () => startGame({ zen: false, daily: false }));
zenButton?.addEventListener('click', () => startGame({ zen: true, daily: false }));
dailyButton?.addEventListener('click', () => startGame({ zen: false, daily: true }));
practiceButton?.addEventListener('click', () => startGame({ practice: true }));
resumeButton?.addEventListener('click', resumeGame);
restartButton?.addEventListener('click', () =>
  startGame({ zen: state.zen, daily: state.daily, practice: state.practice }),
);
restartFromPause?.addEventListener('click', () =>
  startGame({ zen: state.zen, daily: state.daily, practice: state.practice }),
);
titleFromPause?.addEventListener('click', returnToTitle);
titleFromOver?.addEventListener('click', returnToTitle);
shareButton?.addEventListener('click', shareScore);
shareCardButton?.addEventListener('click', shareCard);
pauseButton?.addEventListener('click', () => {
  if (state.mode === MODES.PLAYING) {
    if (state.practice) {
      // Pause button in practice opens pause panel so user can still resume/restart
      state.mode = MODES.PAUSED;
      setOverlay(pausePanel, true);
      audio.play('tap');
    } else {
      pauseGame();
    }
  } else if (state.mode === MODES.PAUSED) resumeGame();
});
soundButton?.addEventListener('click', () => {
  state.muted = !state.muted;
  settings.muted = state.muted;
  persistSettings();
  refreshSoundIcon();
  audio.resume();
  audio.syncMusic();
  audio.play('tap');
});
settingsButton?.addEventListener('click', openSettings);
closeSettingsButton?.addEventListener('click', closeSettings);
dismissTutorialButton?.addEventListener('click', dismissTutorial);
resetTutorialButton?.addEventListener('click', () => {
  resetTutorial();
  closeSettings();
  openTutorial();
});

bloomToggle?.addEventListener('change', () => {
  settings.bloom = bloomToggle.checked;
  applyBloomSetting();
  persistSettings();
});
reducedMotionToggle?.addEventListener('change', () => {
  settings.reducedMotion = reducedMotionToggle.checked;
  applyReducedMotion();
  persistSettings();
});
sfxVolumeSlider?.addEventListener('input', () => {
  settings.sfxVolume = Number(sfxVolumeSlider.value) / 100;
  persistSettings();
});
musicVolumeSlider?.addEventListener('input', () => {
  settings.musicVolume = Number(musicVolumeSlider.value) / 100;
  persistSettings();
});
musicToggle?.addEventListener('change', () => {
  settings.music = musicToggle.checked;
  persistSettings();
  if (settings.music) {
    audio.resume();
    audio.startMusic();
  } else {
    audio.syncMusic();
  }
});
muteToggle?.addEventListener('change', () => {
  state.muted = muteToggle.checked;
  settings.muted = state.muted;
  persistSettings();
  refreshSoundIcon();
});
fpsToggle?.addEventListener('change', () => {
  settings.showFps = fpsToggle.checked;
  persistSettings();
  updateFpsMeterVisibility();
});
adaptiveQualityToggle?.addEventListener('change', () => {
  setAdaptiveQuality(adaptiveQualityToggle.checked);
});
difficultySelect?.addEventListener('change', () => {
  setDifficulty(difficultySelect.value);
  audio.play('tap');
});
difficultyChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    setDifficulty(chip.dataset.difficulty);
    audio.play('tap');
  });
});

leaderboardTabs.forEach((tab) => {
  tab.addEventListener('click', () => renderLeaderboard(tab.dataset.board));
});

// Init
state.muted = !!settings.muted;
state.difficulty = settings.difficulty || 'normal';
applyBloomSetting();
applyReducedMotion();
refreshSoundIcon();
syncSettingsUI();
refreshSplashMeta();
setOverlay(splash, true);
updateHud();
if (!hasSeenTutorial()) {
  openTutorial();
}
animate();

// Service worker registration lives here rather than in an inline <script> so
// the page can keep a strict `script-src 'self'` policy with no 'unsafe-inline'.
// Modules run before the load event, so this still registers after first paint.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

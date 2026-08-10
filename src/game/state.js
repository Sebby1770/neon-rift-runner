/**
 * Pure game state factory and score/combo helpers (testable, no DOM/Three).
 */

import { resetStormState, stormScoreMultiplier } from './storm.js';

export const MODES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

export function createGameState(overrides = {}) {
  const state = {
    mode: MODES.TITLE,
    zen: false,
    daily: false,
    practice: false,
    dailyKey: null,
    difficulty: 'normal',
    muted: false,
    score: 0,
    scoreCarry: 0,
    gates: 0,
    streak: 0,
    maxStreak: 0,
    hull: 100,
    boost: 100,
    rift: 0,
    overdrive: 0,
    combo: 1,
    speed: 28,
    targetSpeed: 28,
    spawnTimer: 0,
    pickupTimer: 0,
    hazardTimer: 0,
    lanePulse: 0,
    invulnerable: 0,
    shake: 0,
    runTime: 0,
    calloutTimer: 0,
    // Milestone tracking
    milestonesHit: {},
    nearMissCooldown: 0,
    nearMisses: 0,
    // Best-score tracking for current session end
    isNewBest: false,
    // Screen flash (seconds remaining)
    flashTimer: 0,
    // Rift Storm fields (also set by resetStormState)
    stormActive: false,
    stormTimer: 0,
    stormMultiplier: 1,
    nextStormGate: 25,
    ...overrides,
  };
  resetStormState(state);
  // Re-apply overrides that resetStormState might have wiped
  if (overrides.stormActive != null) state.stormActive = overrides.stormActive;
  if (overrides.stormTimer != null) state.stormTimer = overrides.stormTimer;
  if (overrides.stormMultiplier != null) state.stormMultiplier = overrides.stormMultiplier;
  if (overrides.nextStormGate != null) state.nextStormGate = overrides.nextStormGate;
  return state;
}

/**
 * Reset run-specific fields for a new game start.
 * Preserves mute and settings-related fields.
 */
export function resetRunState(
  state,
  {
    zen = false,
    daily = false,
    practice = false,
    dailyKey = null,
    difficulty = 'normal',
  } = {},
) {
  state.mode = MODES.PLAYING;
  state.zen = zen;
  state.daily = daily;
  state.practice = practice;
  state.dailyKey = dailyKey;
  state.difficulty = difficulty || 'normal';
  state.score = 0;
  state.scoreCarry = 0;
  state.gates = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.hull = practice || zen ? 999 : 100;
  state.boost = 100;
  state.rift = 0;
  state.overdrive = 0;
  state.combo = 1;
  state.speed = zen || practice ? 23 : 28;
  state.targetSpeed = state.speed;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.hazardTimer = 1.2;
  state.lanePulse = 0;
  state.invulnerable = practice ? 9999 : 1.6;
  state.shake = 0;
  state.runTime = 0;
  state.calloutTimer = 0;
  state.milestonesHit = {};
  state.nearMissCooldown = 0;
  state.nearMisses = 0;
  state.isNewBest = false;
  state.flashTimer = 0;
  resetStormState(state);
  return state;
}

export function formatScore(score) {
  return Math.max(0, Math.round(score)).toLocaleString('en-US');
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

/** Score awarded for successfully clearing a gate. */
export function gateClearScore(streak, combo, stormMul = 1) {
  return Math.round((260 + streak * 16) * combo * stormMul);
}

/** Apply a successful gate pass. Mutates state, returns points gained. */
export function applyGateClear(state) {
  state.gates += 1;
  state.streak += 1;
  if (state.streak > state.maxStreak) state.maxStreak = state.streak;
  state.combo = Math.min(6, state.combo + 0.38);
  const mul = stormScoreMultiplier(state);
  const points = gateClearScore(state.streak, state.combo, mul);
  state.score += points;
  state.boost = Math.min(100, state.boost + 10);
  state.rift = Math.min(100, state.rift + 12 + Math.min(10, state.streak));
  return points;
}

/** Apply a missed gate. Mutates state. */
export function applyGateMiss(state) {
  state.streak = 0;
  state.combo = Math.max(1, state.combo * 0.76);
  state.score = Math.max(0, state.score - 90);
  state.rift = Math.max(0, state.rift - 8);
}

/** Near-miss bonus when skimming a hazard without colliding. */
export function applyNearMiss(state) {
  const mul = stormScoreMultiplier(state);
  const points = Math.round(140 * state.combo * mul);
  state.score += points;
  state.combo = Math.min(6, state.combo + 0.12);
  state.nearMissCooldown = 0.55;
  state.nearMisses = (state.nearMisses || 0) + 1;
  return points;
}

/** Score thresholds that fire milestone callouts once per run. */
export const SCORE_MILESTONES = [5000, 15000, 30000, 50000, 100000];
export const GATE_MILESTONES = [10, 25, 50, 100];

/**
 * Check and mark milestones. Returns list of callout messages to show.
 * Skips the 25-gate callout text when a storm will claim that moment (optional).
 */
export function checkMilestones(state) {
  const messages = [];

  for (const n of GATE_MILESTONES) {
    const key = `gates:${n}`;
    if (state.gates >= n && !state.milestonesHit[key]) {
      state.milestonesHit[key] = true;
      messages.push(`${n} gates cleared`);
    }
  }

  for (const n of SCORE_MILESTONES) {
    const key = `score:${n}`;
    if (state.score >= n && !state.milestonesHit[key]) {
      state.milestonesHit[key] = true;
      messages.push(`${formatScore(n)} points`);
    }
  }

  return messages;
}

/** Snapshot of run stats for game-over screen / leaderboard. */
export function getRunSummary(state) {
  return {
    score: Math.round(state.score),
    gates: state.gates,
    maxStreak: state.maxStreak,
    runTime: state.runTime,
    zen: state.zen,
    daily: state.daily,
    practice: state.practice,
    dailyKey: state.dailyKey,
    nearMisses: state.nearMisses || 0,
    difficulty: state.difficulty || 'normal',
  };
}

/** Extra run counters for achievements (not all stored on leaderboard). */
export function getRunExtras(state) {
  return {
    nearMisses: state.nearMisses || 0,
    practice: !!state.practice,
  };
}

/**
 * Leaderboard mode key for a finished run.
 * Normal mode is keyed by difficulty: normal | normal:easy | normal:hard
 * (plain "normal" keeps backward compatibility for Normal difficulty).
 */
export function leaderboardMode(state) {
  if (state.practice) return null;
  if (state.daily) return 'daily';
  if (state.zen) return 'zen';
  const diff = state.difficulty || 'normal';
  if (diff === 'easy') return 'normal:easy';
  if (diff === 'hard') return 'normal:hard';
  return 'normal';
}

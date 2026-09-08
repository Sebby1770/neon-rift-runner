/**
 * localStorage persistence for high scores, settings, achievements, ghost, flags.
 * Pure enough to unit-test with a mock storage adapter.
 */

export const STORAGE_KEYS = {
  settings: 'neon-rift:settings',
  normal: 'neon-rift:scores:normal',
  normalEasy: 'neon-rift:scores:normal:easy',
  normalHard: 'neon-rift:scores:normal:hard',
  zen: 'neon-rift:scores:zen',
  daily: 'neon-rift:scores:daily',
  achievements: 'neon-rift:achievements',
  tutorial: 'neon-rift:tutorial',
  ghost: 'neon-rift:ghost',
};

const DEFAULT_SETTINGS = {
  muted: false,
  music: true,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  bloom: true,
  reducedMotion: false,
  difficulty: 'normal',
  showFps: false,
  adaptiveQuality: true,
};

const MAX_LEADERBOARD = 10;

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // private mode / blocked
  }
  return null;
}

export function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadSettings(storage = defaultStorage()) {
  const base = { ...DEFAULT_SETTINGS };
  if (!storage) return base;
  try {
    const raw = storage.getItem(STORAGE_KEYS.settings);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const merged = { ...base, ...parsed };
    if (!['easy', 'normal', 'hard'].includes(merged.difficulty)) {
      merged.difficulty = 'normal';
    }
    return merged;
  } catch {
    return base;
  }
}

export function saveSettings(settings, storage = defaultStorage()) {
  if (!storage) return settings;
  try {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    if (!['easy', 'normal', 'hard'].includes(merged.difficulty)) {
      merged.difficulty = 'normal';
    }
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify(merged));
    return merged;
  } catch {
    return settings;
  }
}

function scoresKey(mode) {
  if (mode === 'zen') return STORAGE_KEYS.zen;
  if (mode === 'daily') return STORAGE_KEYS.daily;
  if (mode === 'normal:easy') return STORAGE_KEYS.normalEasy;
  if (mode === 'normal:hard') return STORAGE_KEYS.normalHard;
  return STORAGE_KEYS.normal;
}

/**
 * Load top scores for a mode. Daily board is scoped to today's date key.
 * Entries: { score, gates, maxStreak, runTime, at, dailyKey?, difficulty? }
 */
const DIFFICULTIES = ['easy', 'normal', 'hard'];

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

/**
 * Forces a stored leaderboard entry into a known shape.
 *
 * Entries come back from localStorage, which is scoped to the ORIGIN — every
 * project published under the same GitHub Pages account shares this store, so
 * anything able to write there can decide what this game renders. The read path
 * used to check only `typeof score === 'number'`, and `gates` was interpolated
 * straight into an innerHTML template: a stored `<img src=x onerror=…>` was
 * rendered verbatim. Numbers are coerced, strings are constrained to known
 * values, and anything unrecognised is dropped.
 */
export function sanitizeScoreEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

  const score = Number(entry.score);
  if (!Number.isFinite(score)) return null;

  const runTime = Number(entry.runTime);
  const record = {
    score: Math.round(score),
    gates: toCount(entry.gates),
    maxStreak: toCount(entry.maxStreak),
    runTime: Number.isFinite(runTime) && runTime > 0 ? runTime : 0,
    at: typeof entry.at === 'string' ? entry.at.slice(0, 40) : '',
  };

  if (DIFFICULTIES.includes(entry.difficulty)) record.difficulty = entry.difficulty;
  if (typeof entry.dailyKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.dailyKey)) {
    record.dailyKey = entry.dailyKey;
  }
  return record;
}

export function loadLeaderboard(mode = 'normal', { todayKey, storage = defaultStorage() } = {}) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(scoresKey(mode));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    let entries = list.map(sanitizeScoreEntry).filter(Boolean);
    if (mode === 'daily' && todayKey) {
      entries = entries.filter((e) => e.dailyKey === todayKey);
    }
    return entries.sort((a, b) => b.score - a.score).slice(0, MAX_LEADERBOARD);
  } catch {
    return [];
  }
}

export function getBestScore(mode = 'normal', opts = {}) {
  const board = loadLeaderboard(mode, opts);
  return board.length ? board[0].score : 0;
}

/**
 * Insert a score entry, keep top 10, persist.
 * Returns { board, rank (1-based or 0 if not placed), isNewBest }
 */
export function submitScore(mode, entry, { storage = defaultStorage(), todayKey } = {}) {
  const record = sanitizeScoreEntry({
    ...entry,
    score: entry.score || 0,
    at: entry.at || new Date().toISOString(),
  }) ?? { score: 0, gates: 0, maxStreak: 0, runTime: 0, at: '' };
  if (entry.difficulty) record.difficulty = entry.difficulty;
  if (mode === 'daily') {
    record.dailyKey = entry.dailyKey || todayKey || getTodayKey();
  }
  if (mode === 'normal:easy') record.difficulty = 'easy';
  if (mode === 'normal:hard') record.difficulty = 'hard';
  if (mode === 'normal' && !record.difficulty) record.difficulty = 'normal';

  let board = [];
  if (storage) {
    try {
      const raw = storage.getItem(scoresKey(mode));
      if (raw) board = JSON.parse(raw);
      if (!Array.isArray(board)) board = [];
    } catch {
      board = [];
    }
  }

  // For daily, keep only today's entries when submitting for today
  if (mode === 'daily' && record.dailyKey) {
    board = board.filter((e) => e.dailyKey === record.dailyKey);
  }

  const previousBest = board.length ? Math.max(...board.map((e) => e.score)) : 0;
  board.push(record);
  board.sort((a, b) => b.score - a.score);
  board = board.slice(0, MAX_LEADERBOARD);

  if (storage) {
    try {
      // Merge back older daily days when mode is daily so history isn't wiped
      if (mode === 'daily') {
        let all = [];
        try {
          const raw = storage.getItem(scoresKey(mode));
          all = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(all)) all = [];
        } catch {
          all = [];
        }
        const others = all.filter((e) => e.dailyKey !== record.dailyKey);
        const merged = [...others, ...board]
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);
        storage.setItem(scoresKey(mode), JSON.stringify(merged));
      } else {
        storage.setItem(scoresKey(mode), JSON.stringify(board));
      }
    } catch {
      // ignore quota errors
    }
  }

  const rankIndex = board.findIndex(
    (e) => e.at === record.at && e.score === record.score,
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : 0;
  const isNewBest = record.score > previousBest && record.score > 0;

  return { board, rank, isNewBest, entry: record };
}

export function buildShareText(summary, { mode = 'normal', dailyKey, difficulty } = {}) {
  const diff = difficulty || summary.difficulty || 'normal';
  const diffLabel =
    diff === 'easy' ? 'Easy' : diff === 'hard' ? 'Hard' : diff === 'normal' ? 'Normal' : '';
  let label =
    mode === 'daily' || mode?.startsWith?.('daily')
      ? `Daily Challenge (${dailyKey || summary.dailyKey || getTodayKey()})`
      : mode === 'zen'
        ? 'Zen Run'
        : mode === 'practice'
          ? 'Practice'
          : 'Normal Run';
  if ((mode === 'normal' || mode?.startsWith?.('normal')) && diffLabel && mode !== 'zen') {
    label = `${label} · ${diffLabel}`;
  }
  // Also handle mode keys normal:easy / normal:hard
  if (mode === 'normal:easy') label = 'Normal Run · Easy';
  if (mode === 'normal:hard') label = 'Normal Run · Hard';

  const time =
    typeof summary.runTime === 'number'
      ? `${Math.floor(summary.runTime / 60)}:${String(Math.floor(summary.runTime) % 60).padStart(2, '0')}`
      : '0:00';
  return [
    `Neon Rift Runner — ${label}`,
    `Score: ${Math.round(summary.score).toLocaleString('en-US')}`,
    `Gates: ${summary.gates} · Max streak: ${summary.maxStreak} · Time: ${time}`,
    'Thread the gates. Steal charge. Outrun the collapsing skyline.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Ghost path (per mode key)
// ---------------------------------------------------------------------------

/**
 * Ghost storage key suffix from leaderboard-style mode.
 * Modes: normal, normal:easy, normal:hard, zen, daily
 */
export function ghostModeKey(mode = 'normal') {
  if (mode === 'zen') return 'zen';
  if (mode === 'daily') return 'daily';
  if (mode === 'normal:easy') return 'normal:easy';
  if (mode === 'normal:hard') return 'normal:hard';
  return 'normal';
}

/**
 * Load all ghost paths as a map { modeKey: samples[] }.
 */
export function loadGhostMap(storage = defaultStorage()) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEYS.ghost);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Load ghost samples for a mode key. Returns array (possibly empty).
 */
export function loadGhost(mode = 'normal', storage = defaultStorage()) {
  const map = loadGhostMap(storage);
  const key = ghostModeKey(mode);
  const entry = map[key];
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  if (Array.isArray(entry.samples)) return entry.samples;
  return [];
}

/**
 * Save ghost samples for a mode. Caps length at 1200.
 * Returns saved samples array.
 */
export function saveGhost(mode, samples, storage = defaultStorage()) {
  const key = ghostModeKey(mode);
  const list = Array.isArray(samples) ? samples.slice(0, 1200) : [];
  const map = loadGhostMap(storage);
  map[key] = list;
  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.ghost, JSON.stringify(map));
    } catch {
      // quota
    }
  }
  return list;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * Load unlocked achievement ids. Returns string[].
 */
export function loadAchievements(storage = defaultStorage()) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEYS.achievements);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string');
  } catch {
    return [];
  }
}

/**
 * Persist unlocked achievement ids (deduped).
 * Returns the saved array.
 */
export function saveAchievements(ids, storage = defaultStorage()) {
  const unique = [...new Set((ids || []).filter((id) => typeof id === 'string'))];
  if (!storage) return unique;
  try {
    storage.setItem(STORAGE_KEYS.achievements, JSON.stringify(unique));
  } catch {
    // quota
  }
  return unique;
}

/**
 * Merge newly unlocked ids into storage. Returns full unlocked list.
 */
export function unlockAchievements(newIds, storage = defaultStorage()) {
  const current = loadAchievements(storage);
  const merged = saveAchievements([...current, ...(newIds || [])], storage);
  return merged;
}

// ---------------------------------------------------------------------------
// Tutorial flag
// ---------------------------------------------------------------------------

export function hasSeenTutorial(storage = defaultStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(STORAGE_KEYS.tutorial) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.tutorial, '1');
  } catch {
    // ignore
  }
}

export function resetTutorial(storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEYS.tutorial);
  } catch {
    // ignore
  }
}

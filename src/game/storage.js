/**
 * localStorage persistence for high scores, settings, achievements, and flags.
 * Pure enough to unit-test with a mock storage adapter.
 */

export const STORAGE_KEYS = {
  settings: 'neon-rift:settings',
  normal: 'neon-rift:scores:normal',
  zen: 'neon-rift:scores:zen',
  daily: 'neon-rift:scores:daily',
  achievements: 'neon-rift:achievements',
  tutorial: 'neon-rift:tutorial',
};

const DEFAULT_SETTINGS = {
  muted: false,
  music: true,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  bloom: true,
  reducedMotion: false,
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
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

export function saveSettings(settings, storage = defaultStorage()) {
  if (!storage) return settings;
  try {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify(merged));
    return merged;
  } catch {
    return settings;
  }
}

function scoresKey(mode) {
  if (mode === 'zen') return STORAGE_KEYS.zen;
  if (mode === 'daily') return STORAGE_KEYS.daily;
  return STORAGE_KEYS.normal;
}

/**
 * Load top scores for a mode. Daily board is scoped to today's date key.
 * Entries: { score, gates, maxStreak, runTime, at, dailyKey? }
 */
export function loadLeaderboard(mode = 'normal', { todayKey, storage = defaultStorage() } = {}) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(scoresKey(mode));
    if (!raw) return [];
    let list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (mode === 'daily' && todayKey) {
      list = list.filter((e) => e.dailyKey === todayKey);
    }
    return list
      .filter((e) => e && typeof e.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADERBOARD);
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
  const record = {
    score: Math.round(entry.score || 0),
    gates: entry.gates || 0,
    maxStreak: entry.maxStreak || 0,
    runTime: entry.runTime || 0,
    at: entry.at || new Date().toISOString(),
  };
  if (mode === 'daily') {
    record.dailyKey = entry.dailyKey || todayKey || getTodayKey();
  }

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

export function buildShareText(summary, { mode = 'normal', dailyKey } = {}) {
  const label =
    mode === 'daily'
      ? `Daily Challenge (${dailyKey || summary.dailyKey || getTodayKey()})`
      : mode === 'zen'
        ? 'Zen Run'
        : mode === 'practice'
          ? 'Practice'
          : 'Normal Run';
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

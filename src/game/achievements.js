/**
 * Pure achievements definitions and unlock checks (no DOM).
 *
 * checkAchievements(runSummary, runExtras, unlockedSet) → newly unlocked list
 */

export const ACHIEVEMENTS = [
  {
    id: 'first_gate',
    name: 'First Gate',
    description: 'Clear your first gate',
    icon: 'circle-dot',
  },
  {
    id: 'gates_50',
    name: 'Gate Hopper',
    description: 'Clear 50 gates in a single run',
    icon: 'target',
  },
  {
    id: 'gates_100',
    name: 'Gate Legend',
    description: 'Clear 100 gates in a single run',
    icon: 'trophy',
  },
  {
    id: 'score_10k',
    name: 'Ten Thousand',
    description: 'Score 10,000 points in a run',
    icon: 'sparkles',
  },
  {
    id: 'score_50k',
    name: 'High Roller',
    description: 'Score 50,000 points in a run',
    icon: 'flame',
  },
  {
    id: 'streak_20',
    name: 'Flow State',
    description: 'Reach a 20-gate streak',
    icon: 'zap',
  },
  {
    id: 'near_miss_master',
    name: 'Near-Miss Master',
    description: 'Skim 10 hazards in a single run',
    icon: 'crosshair',
  },
  {
    id: 'survivor_2min',
    name: 'Survivor',
    description: 'Survive for 2 minutes',
    icon: 'timer',
  },
  {
    id: 'daily_player',
    name: 'Daily Pilot',
    description: 'Complete a Daily Challenge run',
    icon: 'calendar',
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    description: 'Clear 25 gates in a Zen run',
    icon: 'sparkles',
  },
];

/** Map id → definition for O(1) lookup. */
export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/**
 * Whether a single achievement unlocks given run stats.
 * runSummary: { score, gates, maxStreak, runTime, zen, daily, ... }
 * runExtras:  { nearMisses, practice?, ... }
 */
export function isAchievementMet(id, runSummary, runExtras = {}) {
  const s = runSummary || {};
  const e = runExtras || {};
  const gates = s.gates || 0;
  const score = s.score || 0;
  const maxStreak = s.maxStreak || 0;
  const runTime = s.runTime || 0;
  const nearMisses = e.nearMisses || 0;

  switch (id) {
    case 'first_gate':
      return gates >= 1;
    case 'gates_50':
      return gates >= 50;
    case 'gates_100':
      return gates >= 100;
    case 'score_10k':
      return score >= 10000;
    case 'score_50k':
      return score >= 50000;
    case 'streak_20':
      return maxStreak >= 20;
    case 'near_miss_master':
      return nearMisses >= 10;
    case 'survivor_2min':
      return runTime >= 120;
    case 'daily_player':
      // Only after a finished run (game over), not mid-flight
      return !!s.daily && !!e.completed;
    case 'zen_master':
      return !!s.zen && gates >= 25;
    default:
      return false;
  }
}

/**
 * Returns achievement objects newly unlocked by this run.
 * unlockedSet: Set<string> or array of already-unlocked ids.
 */
export function checkAchievements(runSummary, runExtras = {}, unlockedSet = new Set()) {
  const unlocked =
    unlockedSet instanceof Set ? unlockedSet : new Set(Array.isArray(unlockedSet) ? unlockedSet : []);
  const newly = [];
  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue;
    if (isAchievementMet(achievement.id, runSummary, runExtras)) {
      newly.push(achievement);
    }
  }
  return newly;
}

/** Progress fraction 0–1 for UI (best-effort from a single run summary). */
export function achievementProgress(id, runSummary, runExtras = {}) {
  const s = runSummary || {};
  const e = runExtras || {};
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  switch (id) {
    case 'first_gate':
      return clamp01((s.gates || 0) / 1);
    case 'gates_50':
      return clamp01((s.gates || 0) / 50);
    case 'gates_100':
      return clamp01((s.gates || 0) / 100);
    case 'score_10k':
      return clamp01((s.score || 0) / 10000);
    case 'score_50k':
      return clamp01((s.score || 0) / 50000);
    case 'streak_20':
      return clamp01((s.maxStreak || 0) / 20);
    case 'near_miss_master':
      return clamp01((e.nearMisses || 0) / 10);
    case 'survivor_2min':
      return clamp01((s.runTime || 0) / 120);
    case 'daily_player':
      return s.daily ? 1 : 0;
    case 'zen_master':
      return s.zen ? clamp01((s.gates || 0) / 25) : 0;
    default:
      return 0;
  }
}

import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  achievementProgress,
  checkAchievements,
  isAchievementMet,
} from '../achievements.js';

describe('ACHIEVEMENTS catalog', () => {
  it('defines expected ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain('first_gate');
    expect(ids).toContain('gates_50');
    expect(ids).toContain('gates_100');
    expect(ids).toContain('score_10k');
    expect(ids).toContain('score_50k');
    expect(ids).toContain('streak_20');
    expect(ids).toContain('near_miss_master');
    expect(ids).toContain('survivor_2min');
    expect(ids).toContain('daily_player');
    expect(ids).toContain('zen_master');
    expect(ids.length).toBe(10);
  });

  it('maps by id', () => {
    expect(ACHIEVEMENT_BY_ID.first_gate.name).toBe('First Gate');
  });
});

describe('isAchievementMet', () => {
  it('first_gate at 1 gate', () => {
    expect(isAchievementMet('first_gate', { gates: 0 })).toBe(false);
    expect(isAchievementMet('first_gate', { gates: 1 })).toBe(true);
  });

  it('gates thresholds', () => {
    expect(isAchievementMet('gates_50', { gates: 49 })).toBe(false);
    expect(isAchievementMet('gates_50', { gates: 50 })).toBe(true);
    expect(isAchievementMet('gates_100', { gates: 100 })).toBe(true);
  });

  it('score thresholds', () => {
    expect(isAchievementMet('score_10k', { score: 9999 })).toBe(false);
    expect(isAchievementMet('score_10k', { score: 10000 })).toBe(true);
    expect(isAchievementMet('score_50k', { score: 50000 })).toBe(true);
  });

  it('streak_20', () => {
    expect(isAchievementMet('streak_20', { maxStreak: 19 })).toBe(false);
    expect(isAchievementMet('streak_20', { maxStreak: 20 })).toBe(true);
  });

  it('near_miss_master uses runExtras', () => {
    expect(isAchievementMet('near_miss_master', {}, { nearMisses: 9 })).toBe(false);
    expect(isAchievementMet('near_miss_master', {}, { nearMisses: 10 })).toBe(true);
  });

  it('survivor_2min at 120s', () => {
    expect(isAchievementMet('survivor_2min', { runTime: 119.9 })).toBe(false);
    expect(isAchievementMet('survivor_2min', { runTime: 120 })).toBe(true);
  });

  it('daily_player requires daily flag and completed run', () => {
    expect(isAchievementMet('daily_player', { daily: true }, { completed: false })).toBe(false);
    expect(isAchievementMet('daily_player', { daily: false }, { completed: true })).toBe(false);
    expect(isAchievementMet('daily_player', { daily: true }, { completed: true })).toBe(true);
  });

  it('zen_master requires zen and 25 gates', () => {
    expect(isAchievementMet('zen_master', { zen: true, gates: 24 })).toBe(false);
    expect(isAchievementMet('zen_master', { zen: false, gates: 30 })).toBe(false);
    expect(isAchievementMet('zen_master', { zen: true, gates: 25 })).toBe(true);
  });
});

describe('checkAchievements', () => {
  it('returns only newly unlocked', () => {
    const summary = { gates: 55, score: 12000, maxStreak: 5, runTime: 40 };
    const unlocked = new Set(['first_gate']);
    const newly = checkAchievements(summary, { nearMisses: 0 }, unlocked);
    const ids = newly.map((a) => a.id);
    expect(ids).toContain('gates_50');
    expect(ids).toContain('score_10k');
    expect(ids).not.toContain('first_gate');
    expect(ids).not.toContain('gates_100');
  });

  it('accepts array unlocked set', () => {
    const newly = checkAchievements({ gates: 1 }, {}, ['first_gate']);
    expect(newly).toHaveLength(0);
  });

  it('unlocks multiple on a strong run', () => {
    const summary = {
      gates: 100,
      score: 55000,
      maxStreak: 22,
      runTime: 130,
      daily: true,
    };
    const extras = { nearMisses: 12, completed: true };
    const newly = checkAchievements(summary, extras, new Set());
    const ids = newly.map((a) => a.id);
    expect(ids).toContain('first_gate');
    expect(ids).toContain('gates_100');
    expect(ids).toContain('score_50k');
    expect(ids).toContain('streak_20');
    expect(ids).toContain('near_miss_master');
    expect(ids).toContain('survivor_2min');
    expect(ids).toContain('daily_player');
  });
});

describe('achievementProgress', () => {
  it('clamps between 0 and 1', () => {
    expect(achievementProgress('gates_50', { gates: 25 })).toBeCloseTo(0.5);
    expect(achievementProgress('gates_50', { gates: 100 })).toBe(1);
    expect(achievementProgress('near_miss_master', {}, { nearMisses: 5 })).toBeCloseTo(0.5);
  });
});

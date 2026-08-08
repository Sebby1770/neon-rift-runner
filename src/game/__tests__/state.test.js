import { describe, expect, it } from 'vitest';
import {
  applyGateClear,
  applyGateMiss,
  applyNearMiss,
  checkMilestones,
  createGameState,
  formatScore,
  formatTime,
  getRunSummary,
  leaderboardMode,
  MODES,
  resetRunState,
  gateClearScore,
} from '../state.js';

describe('createGameState', () => {
  it('returns default title state', () => {
    const s = createGameState();
    expect(s.mode).toBe(MODES.TITLE);
    expect(s.score).toBe(0);
    expect(s.combo).toBe(1);
    expect(s.hull).toBe(100);
  });

  it('applies overrides', () => {
    const s = createGameState({ muted: true, score: 42 });
    expect(s.muted).toBe(true);
    expect(s.score).toBe(42);
  });
});

describe('resetRunState', () => {
  it('resets for normal run', () => {
    const s = createGameState({ score: 999, streak: 5 });
    resetRunState(s, { zen: false });
    expect(s.mode).toBe(MODES.PLAYING);
    expect(s.score).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.hull).toBe(100);
    expect(s.zen).toBe(false);
    expect(s.speed).toBe(28);
  });

  it('resets for zen run with high hull', () => {
    const s = createGameState();
    resetRunState(s, { zen: true });
    expect(s.zen).toBe(true);
    expect(s.hull).toBe(999);
    expect(s.speed).toBe(23);
  });

  it('tracks daily key', () => {
    const s = createGameState();
    resetRunState(s, { daily: true, dailyKey: '2026-04-01' });
    expect(s.daily).toBe(true);
    expect(s.dailyKey).toBe('2026-04-01');
  });
});

describe('formatScore / formatTime', () => {
  it('formats scores with grouping', () => {
    expect(formatScore(1234)).toMatch(/1.?234/);
    expect(formatScore(-5)).toBe('0');
  });

  it('formats time as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
});

describe('gate scoring', () => {
  it('computes clear score from streak and combo', () => {
    expect(gateClearScore(1, 1)).toBe(276);
    expect(gateClearScore(5, 2)).toBe(Math.round((260 + 80) * 2));
  });

  it('applyGateClear increments gates and streak', () => {
    const s = createGameState();
    resetRunState(s);
    const pts = applyGateClear(s);
    expect(s.gates).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(s.score).toBe(pts);
    expect(s.boost).toBeGreaterThan(100 - 1);
  });

  it('tracks maxStreak', () => {
    const s = createGameState();
    resetRunState(s);
    applyGateClear(s);
    applyGateClear(s);
    applyGateClear(s);
    applyGateMiss(s);
    expect(s.streak).toBe(0);
    expect(s.maxStreak).toBe(3);
  });

  it('applyGateMiss reduces combo and score', () => {
    const s = createGameState();
    resetRunState(s);
    s.score = 200;
    s.combo = 2;
    s.streak = 4;
    applyGateMiss(s);
    expect(s.streak).toBe(0);
    expect(s.combo).toBeLessThan(2);
    expect(s.score).toBe(110);
  });
});

describe('near miss', () => {
  it('awards bonus and sets cooldown', () => {
    const s = createGameState();
    resetRunState(s);
    s.combo = 2;
    const pts = applyNearMiss(s);
    expect(pts).toBe(280);
    expect(s.score).toBe(280);
    expect(s.nearMissCooldown).toBeGreaterThan(0);
  });
});

describe('milestones', () => {
  it('fires gate milestones once', () => {
    const s = createGameState();
    resetRunState(s);
    s.gates = 10;
    const first = checkMilestones(s);
    expect(first).toContain('10 gates cleared');
    const second = checkMilestones(s);
    expect(second).toHaveLength(0);
  });

  it('fires score milestones', () => {
    const s = createGameState();
    resetRunState(s);
    s.score = 5000;
    const msgs = checkMilestones(s);
    expect(msgs.some((m) => m.includes('5'))).toBe(true);
  });
});

describe('run summary / leaderboard mode', () => {
  it('builds summary', () => {
    const s = createGameState();
    resetRunState(s, { zen: true });
    s.score = 100.7;
    s.gates = 3;
    s.maxStreak = 2;
    s.runTime = 12.5;
    const sum = getRunSummary(s);
    expect(sum.score).toBe(101);
    expect(sum.zen).toBe(true);
    expect(sum.gates).toBe(3);
  });

  it('selects leaderboard mode', () => {
    expect(leaderboardMode({ daily: true, zen: false })).toBe('daily');
    expect(leaderboardMode({ daily: false, zen: true })).toBe('zen');
    expect(leaderboardMode({ daily: false, zen: false })).toBe('normal');
  });
});

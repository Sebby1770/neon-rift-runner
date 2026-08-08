import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildShareText,
  getBestScore,
  getTodayKey,
  loadLeaderboard,
  loadSettings,
  saveSettings,
  submitScore,
  STORAGE_KEYS,
} from '../storage.js';
import { createRng, hashString, createDailyRng } from '../rng.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

describe('getTodayKey', () => {
  it('formats YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 8); // month is 0-indexed
    expect(getTodayKey(d)).toBe('2026-04-08');
  });
});

describe('settings', () => {
  it('returns defaults when empty', () => {
    const store = memoryStorage();
    const s = loadSettings(store);
    expect(s.bloom).toBe(true);
    expect(s.muted).toBe(false);
    expect(s.sfxVolume).toBe(0.8);
  });

  it('persists and reloads', () => {
    const store = memoryStorage();
    saveSettings({ muted: true, bloom: false, sfxVolume: 0.3 }, store);
    const s = loadSettings(store);
    expect(s.muted).toBe(true);
    expect(s.bloom).toBe(false);
    expect(s.sfxVolume).toBe(0.3);
  });
});

describe('leaderboard', () => {
  let store;

  beforeEach(() => {
    store = memoryStorage();
  });

  it('submits and ranks scores', () => {
    submitScore('normal', { score: 100, gates: 2, maxStreak: 1, runTime: 10 }, { storage: store });
    const { rank, isNewBest } = submitScore(
      'normal',
      { score: 500, gates: 5, maxStreak: 3, runTime: 20 },
      { storage: store },
    );
    expect(isNewBest).toBe(true);
    expect(rank).toBe(1);
    expect(getBestScore('normal', { storage: store })).toBe(500);
    const board = loadLeaderboard('normal', { storage: store });
    expect(board).toHaveLength(2);
    expect(board[0].score).toBe(500);
  });

  it('keeps top 10 only', () => {
    for (let i = 1; i <= 15; i += 1) {
      submitScore('normal', { score: i * 10, gates: i, maxStreak: 1, runTime: i }, { storage: store });
    }
    const board = loadLeaderboard('normal', { storage: store });
    expect(board).toHaveLength(10);
    expect(board[0].score).toBe(150);
    expect(board[9].score).toBe(60);
  });

  it('scopes daily board to today', () => {
    submitScore(
      'daily',
      { score: 100, gates: 1, maxStreak: 1, runTime: 5, dailyKey: '2026-01-01' },
      { storage: store, todayKey: '2026-01-01' },
    );
    submitScore(
      'daily',
      { score: 999, gates: 9, maxStreak: 9, runTime: 9, dailyKey: '2026-01-02' },
      { storage: store, todayKey: '2026-01-02' },
    );
    const today = loadLeaderboard('daily', { storage: store, todayKey: '2026-01-01' });
    expect(today).toHaveLength(1);
    expect(today[0].score).toBe(100);
  });

  it('marks isNewBest only when beating previous', () => {
    submitScore('zen', { score: 200 }, { storage: store });
    const again = submitScore('zen', { score: 150 }, { storage: store });
    expect(again.isNewBest).toBe(false);
    const better = submitScore('zen', { score: 250 }, { storage: store });
    expect(better.isNewBest).toBe(true);
  });
});

describe('buildShareText', () => {
  it('includes score and mode label', () => {
    const text = buildShareText(
      { score: 1234, gates: 8, maxStreak: 4, runTime: 65 },
      { mode: 'normal' },
    );
    expect(text).toContain('Neon Rift Runner');
    expect(text).toContain('Normal Run');
    expect(text).toMatch(/1.?234/);
    expect(text).toContain('1:05');
  });
});

describe('rng', () => {
  it('hashes strings deterministically', () => {
    expect(hashString('2026-04-08')).toBe(hashString('2026-04-08'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('produces stable sequences for same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('daily rng differs by date', () => {
    const a = createDailyRng('2026-01-01');
    const b = createDailyRng('2026-01-02');
    expect(a()).not.toBe(b());
  });
});

describe('STORAGE_KEYS', () => {
  it('uses namespaced keys', () => {
    expect(STORAGE_KEYS.settings).toContain('neon-rift');
    expect(STORAGE_KEYS.normal).toContain('scores');
  });
});

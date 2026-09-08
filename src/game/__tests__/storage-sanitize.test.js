import { describe, expect, it } from 'vitest';
import { loadLeaderboard, sanitizeScoreEntry, submitScore } from '../storage.js';

function memStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _raw: () => map,
  };
}

const XSS = '<img src=x onerror=alert(document.domain)>';

describe('sanitizeScoreEntry', () => {
  it('coerces every numeric field to a number', () => {
    const entry = sanitizeScoreEntry({ score: '120', gates: XSS, maxStreak: {}, runTime: 'abc' });
    expect(entry.score).toBe(120);
    expect(entry.gates).toBe(0);
    expect(entry.maxStreak).toBe(0);
    expect(entry.runTime).toBe(0);
  });

  it('drops entries with no usable score', () => {
    expect(sanitizeScoreEntry({ score: 'not a number' })).toBeNull();
    expect(sanitizeScoreEntry(null)).toBeNull();
    expect(sanitizeScoreEntry('nope')).toBeNull();
    expect(sanitizeScoreEntry([])).toBeNull();
    expect(sanitizeScoreEntry({ score: NaN })).toBeNull();
  });

  it('keeps only known difficulties', () => {
    expect(sanitizeScoreEntry({ score: 1, difficulty: 'hard' }).difficulty).toBe('hard');
    expect(sanitizeScoreEntry({ score: 1, difficulty: XSS }).difficulty).toBeUndefined();
  });

  it('keeps only well-formed daily keys', () => {
    expect(sanitizeScoreEntry({ score: 1, dailyKey: '2026-09-08' }).dailyKey).toBe('2026-09-08');
    expect(sanitizeScoreEntry({ score: 1, dailyKey: XSS }).dailyKey).toBeUndefined();
  });

  it('bounds the timestamp string', () => {
    expect(sanitizeScoreEntry({ score: 1, at: 'x'.repeat(500) }).at).toHaveLength(40);
    expect(sanitizeScoreEntry({ score: 1, at: { toString: () => XSS } }).at).toBe('');
  });

  it('floors and clamps counts', () => {
    const entry = sanitizeScoreEntry({ score: 1, gates: 7.9, maxStreak: -4, runTime: -2 });
    expect(entry.gates).toBe(7);
    expect(entry.maxStreak).toBe(0);
    expect(entry.runTime).toBe(0);
  });
});

describe('loadLeaderboard hardening', () => {
  it('neutralises a poisoned entry written by anything sharing the origin', () => {
    // localStorage is origin-scoped, so every project published under the same
    // GitHub Pages account can write this key.
    const storage = memStore({
      'neon-rift:scores:normal': JSON.stringify([
        { score: 999, gates: XSS, runTime: 12, maxStreak: 3, at: 'x' },
      ]),
    });
    const board = loadLeaderboard('normal', { storage });
    expect(board).toHaveLength(1);
    expect(board[0].gates).toBe(0);
    expect(typeof board[0].gates).toBe('number');
    // Whatever the renderer interpolates can no longer be markup.
    expect(String(board[0].gates)).not.toContain('<');
  });

  it('drops junk rows instead of rendering them', () => {
    const storage = memStore({
      'neon-rift:scores:normal': JSON.stringify([
        { score: 10, gates: 2, runTime: 5 },
        'not an object',
        null,
        { gates: 9 },
      ]),
    });
    expect(loadLeaderboard('normal', { storage })).toHaveLength(1);
  });

  it('survives a non-array payload', () => {
    const storage = memStore({ 'neon-rift:scores:normal': JSON.stringify({ evil: true }) });
    expect(loadLeaderboard('normal', { storage })).toEqual([]);
  });

  it('still filters the daily board by key after sanitising', () => {
    const storage = memStore({
      'neon-rift:scores:daily': JSON.stringify([
        { score: 5, dailyKey: '2026-09-08' },
        { score: 9, dailyKey: '2026-09-07' },
        { score: 7, dailyKey: XSS },
      ]),
    });
    const board = loadLeaderboard('daily', { todayKey: '2026-09-08', storage });
    expect(board).toHaveLength(1);
    expect(board[0].score).toBe(5);
  });

  it('keeps sorting and the top-10 cap', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ score: i, gates: i, runTime: i }));
    const storage = memStore({ 'neon-rift:scores:normal': JSON.stringify(rows) });
    const board = loadLeaderboard('normal', { storage });
    expect(board).toHaveLength(10);
    expect(board[0].score).toBe(14);
  });
});

describe('submitScore hardening', () => {
  it('never persists a non-numeric gates value', () => {
    const storage = memStore();
    submitScore('normal', { score: 10, gates: XSS, runTime: 1, at: 'x' }, { storage });
    const board = loadLeaderboard('normal', { storage });
    expect(board[0].gates).toBe(0);
    expect(storage._raw().get('neon-rift:scores:normal')).not.toContain('onerror');
  });

  it('still records a legitimate run', () => {
    const storage = memStore();
    const { board, rank } = submitScore(
      'normal',
      { score: 4200, gates: 18, maxStreak: 6, runTime: 92.5, at: '2026-09-08T00:00:00.000Z' },
      { storage },
    );
    expect(rank).toBe(1);
    expect(board[0]).toMatchObject({ score: 4200, gates: 18, maxStreak: 6, runTime: 92.5 });
  });
});

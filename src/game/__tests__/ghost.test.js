import { describe, expect, it } from 'vitest';
import {
  createGhostRecorder,
  deserializeGhost,
  GHOST_MAX_SAMPLES,
  GHOST_SAMPLE_INTERVAL,
  makeSample,
  sampleAtTime,
  serializeGhost,
  tickGhostRecorder,
} from '../ghost.js';
import { ghostModeKey, loadGhost, saveGhost, STORAGE_KEYS } from '../storage.js';

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

describe('makeSample / serialize', () => {
  it('rounds sample values', () => {
    const s = makeSample(1.23456, -2.98765, 3.14159);
    expect(s.t).toBeCloseTo(1.235, 3);
    expect(s.x).toBeCloseTo(-2.988, 3);
    expect(s.y).toBeCloseTo(3.142, 3);
  });

  it('serializes and deserializes path', () => {
    const samples = [
      makeSample(0, 0, 2.6),
      makeSample(0.1, 0.5, 2.7),
      makeSample(0.2, 1, 2.8),
    ];
    const raw = serializeGhost(samples);
    expect(typeof raw).toBe('string');
    const back = deserializeGhost(raw);
    expect(back).toHaveLength(3);
    expect(back[1].x).toBeCloseTo(0.5);
  });

  it('rejects invalid payloads', () => {
    expect(deserializeGhost(null)).toEqual([]);
    expect(deserializeGhost('not-json')).toEqual([]);
    expect(deserializeGhost('{"a":1}')).toEqual([]);
    expect(deserializeGhost([{ t: 1, x: 'nope', y: 2 }])).toEqual([]);
  });

  it('caps serialized length', () => {
    const huge = Array.from({ length: GHOST_MAX_SAMPLES + 50 }, (_, i) =>
      makeSample(i * 0.1, i, 2),
    );
    const back = deserializeGhost(serializeGhost(huge));
    expect(back.length).toBe(GHOST_MAX_SAMPLES);
  });
});

describe('tickGhostRecorder', () => {
  it('samples every interval', () => {
    const rec = createGhostRecorder();
    tickGhostRecorder(rec, { x: 0, y: 2 }, 0, GHOST_SAMPLE_INTERVAL - 0.01);
    expect(rec.samples).toHaveLength(0);
    tickGhostRecorder(rec, { x: 1, y: 2.5 }, 0.1, 0.02);
    expect(rec.samples).toHaveLength(1);
    expect(rec.samples[0].x).toBe(1);
  });
});

describe('sampleAtTime', () => {
  const path = [
    makeSample(0, 0, 2),
    makeSample(1, 10, 4),
    makeSample(2, 20, 2),
  ];

  it('returns null for empty', () => {
    expect(sampleAtTime([], 1)).toBe(null);
  });

  it('clamps before first sample', () => {
    expect(sampleAtTime(path, -1)).toEqual({ x: 0, y: 2 });
  });

  it('lerps mid segment', () => {
    const mid = sampleAtTime(path, 0.5);
    expect(mid.x).toBeCloseTo(5);
    expect(mid.y).toBeCloseTo(3);
  });

  it('returns last near end then null after trail', () => {
    expect(sampleAtTime(path, 2)).toEqual({ x: 20, y: 2 });
    expect(sampleAtTime(path, 3)).toBe(null);
  });
});

describe('ghost storage', () => {
  it('keys modes for boards', () => {
    expect(ghostModeKey('normal')).toBe('normal');
    expect(ghostModeKey('normal:easy')).toBe('normal:easy');
    expect(ghostModeKey('zen')).toBe('zen');
  });

  it('saves and loads per mode', () => {
    const store = memoryStorage();
    const samples = [makeSample(0, 1, 2), makeSample(0.1, 2, 3)];
    saveGhost('normal:hard', samples, store);
    expect(loadGhost('normal:hard', store)).toHaveLength(2);
    expect(loadGhost('normal', store)).toEqual([]);
    expect(store.getItem(STORAGE_KEYS.ghost)).toContain('normal:hard');
  });
});

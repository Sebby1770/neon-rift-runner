import { describe, expect, it } from 'vitest';
import {
  baseTargetSpeed,
  clamp,
  DIFFICULTY_IDS,
  DIFFICULTY_PRESETS,
  doubleHazardChance,
  gapWallChance,
  gapWallWidth,
  gateRadiusScale,
  gateSpawnChance,
  gateSpawnInterval,
  hazardDamage,
  hazardSpawnInterval,
  isNearMiss,
  isValidDifficulty,
  pickupIntervalRange,
  resolveDifficulty,
  slicerSpeedFactor,
} from '../difficulty.js';
import { isGapWallHit, isGapWallNearMiss } from '../entities.js';

describe('clamp', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('difficulty presets', () => {
  it('exposes easy / normal / hard', () => {
    expect(DIFFICULTY_IDS).toEqual(['easy', 'normal', 'hard']);
    expect(isValidDifficulty('easy')).toBe(true);
    expect(isValidDifficulty('nightmare')).toBe(false);
  });

  it('resolves unknown to normal', () => {
    expect(resolveDifficulty('nope').id).toBe('normal');
    expect(resolveDifficulty('hard').label).toBe('Hard');
  });

  it('easy is more forgiving than hard', () => {
    const easy = DIFFICULTY_PRESETS.easy;
    const hard = DIFFICULTY_PRESETS.hard;
    expect(easy.hazardIntervalMul).toBeGreaterThan(hard.hazardIntervalMul);
    expect(easy.gateSizeMul).toBeGreaterThan(hard.gateSizeMul);
    expect(easy.hazardDamageMul).toBeLessThan(hard.hazardDamageMul);
    expect(easy.nearMissPad).toBeGreaterThan(hard.nearMissPad);
  });

  it('scales spawn intervals by preset', () => {
    const baseGate = gateSpawnInterval(0, 'normal');
    expect(gateSpawnInterval(0, 'easy')).toBeGreaterThan(baseGate);
    expect(gateSpawnInterval(0, 'hard')).toBeLessThan(baseGate);

    const baseHaz = hazardSpawnInterval(10, 'normal');
    expect(hazardSpawnInterval(10, 'easy')).toBeGreaterThan(baseHaz);
    expect(hazardSpawnInterval(10, 'hard')).toBeLessThan(baseHaz);
  });

  it('scales gate size and near-miss window', () => {
    expect(gateRadiusScale(0, 'easy')).toBeGreaterThan(gateRadiusScale(0, 'normal'));
    expect(gateRadiusScale(0, 'hard')).toBeLessThan(gateRadiusScale(0, 'normal'));

    const radius = 1;
    const ship = 0.58;
    const hit = radius + ship;
    // Far edge of normal skim may miss on hard
    const farSkim = hit + 0.9;
    expect(isNearMiss(farSkim, radius, ship, 'normal')).toBe(true);
    expect(isNearMiss(farSkim, radius, ship, 'hard')).toBe(false);
    // Easy still catches near edge of hard band
    expect(isNearMiss(hit + 0.5, radius, ship, 'easy')).toBe(true);
  });

  it('scales hazard damage', () => {
    expect(hazardDamage('easy', 24)).toBeLessThan(24);
    expect(hazardDamage('normal', 24)).toBe(24);
    expect(hazardDamage('hard', 24)).toBeGreaterThan(24);
  });
});

describe('baseTargetSpeed', () => {
  it('starts slower in zen', () => {
    expect(baseTargetSpeed(true, 0)).toBe(23);
    expect(baseTargetSpeed(false, 0)).toBe(28);
  });

  it('ramps up over time but caps', () => {
    const early = baseTargetSpeed(false, 10);
    const late = baseTargetSpeed(false, 200);
    expect(early).toBeGreaterThan(28);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(28 + 18);
  });
});

describe('spawn intervals', () => {
  it('gates get denser over time', () => {
    expect(gateSpawnInterval(0)).toBeCloseTo(1.45);
    expect(gateSpawnInterval(100)).toBeLessThan(gateSpawnInterval(0));
    expect(gateSpawnInterval(1000)).toBeGreaterThanOrEqual(0.78);
  });

  it('hazards get denser over time', () => {
    expect(hazardSpawnInterval(0)).toBeCloseTo(1.12);
    expect(hazardSpawnInterval(80)).toBeLessThan(hazardSpawnInterval(0));
    expect(hazardSpawnInterval(1000)).toBeGreaterThanOrEqual(0.42);
  });

  it('gate spawn chance rises', () => {
    expect(gateSpawnChance(0)).toBeCloseTo(0.76);
    expect(gateSpawnChance(50)).toBeGreaterThan(gateSpawnChance(0));
    expect(gateSpawnChance(999)).toBeLessThanOrEqual(0.98);
  });
});

describe('gate radius / slicer', () => {
  it('shrinks gates slightly', () => {
    expect(gateRadiusScale(0)).toBe(1);
    expect(gateRadiusScale(50)).toBeLessThan(1);
    expect(gateRadiusScale(999)).toBeGreaterThanOrEqual(0.86);
  });

  it('speeds slicers up', () => {
    expect(slicerSpeedFactor(0)).toBe(1);
    expect(slicerSpeedFactor(40)).toBeGreaterThan(1);
    expect(slicerSpeedFactor(999)).toBeLessThanOrEqual(1.85);
  });
});

describe('double hazard / pickups', () => {
  it('unlocks double hazard later', () => {
    expect(doubleHazardChance(0)).toBe(0);
    expect(doubleHazardChance(50)).toBeGreaterThan(0);
    expect(doubleHazardChance(100)).toBeGreaterThan(doubleHazardChance(50));
  });

  it('tightens pickup intervals', () => {
    const [a0, a1] = pickupIntervalRange(0);
    const [b0, b1] = pickupIntervalRange(100);
    expect(b0).toBeLessThanOrEqual(a0);
    expect(b1).toBeLessThanOrEqual(a1);
    expect(a0).toBeLessThan(a1);
  });
});

describe('isNearMiss', () => {
  it('detects skim band outside collision', () => {
    const radius = 1;
    const ship = 0.58;
    const hit = radius + ship;
    expect(isNearMiss(hit - 0.01, radius, ship)).toBe(false);
    expect(isNearMiss(hit + 0.2, radius, ship)).toBe(true);
    expect(isNearMiss(hit + 2, radius, ship)).toBe(false);
  });
});

describe('gap wall difficulty', () => {
  it('increases spawn chance and narrows width over time', () => {
    expect(gapWallChance(100)).toBeGreaterThan(gapWallChance(0));
    expect(gapWallWidth(100)).toBeLessThan(gapWallWidth(0));
    expect(gapWallWidth(0)).toBeGreaterThanOrEqual(2);
  });

  it('easy has wider gaps and fewer walls than hard', () => {
    expect(gapWallWidth(20, 'easy')).toBeGreaterThan(gapWallWidth(20, 'hard'));
    expect(gapWallChance(40, 'easy')).toBeLessThan(gapWallChance(40, 'hard'));
  });
});

describe('gap wall collision', () => {
  function mockWall(gapX = 0, gapWidth = 2.2, y = 3) {
    return {
      position: { x: gapX, y, z: 0 },
      userData: {
        variant: 'gapwall',
        gapX,
        gapWidth,
        halfHeight: 0.9,
      },
    };
  }

  it('hits when outside the gap', () => {
    const wall = mockWall(0, 2.2, 3);
    expect(isGapWallHit({ x: 0, y: 3, z: 0 }, wall)).toBe(false);
    expect(isGapWallHit({ x: 3, y: 3, z: 0 }, wall)).toBe(true);
  });

  it('misses when above/below the wall band', () => {
    const wall = mockWall(0, 2.2, 3);
    expect(isGapWallHit({ x: 3, y: 6, z: 0 }, wall)).toBe(false);
  });

  it('near-miss near gap edge inside opening', () => {
    const wall = mockWall(0, 2.2, 3);
    // halfGap ~1.1; clearance at x=0.7 is 0.4 → skim; center is safe
    expect(isGapWallNearMiss({ x: 0.7, y: 3, z: 0 }, wall)).toBe(true);
    expect(isGapWallNearMiss({ x: 0, y: 3, z: 0 }, wall)).toBe(false);
    expect(isGapWallNearMiss({ x: 3, y: 3, z: 0 }, wall)).toBe(false);
  });
});

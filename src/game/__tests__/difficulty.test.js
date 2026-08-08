import { describe, expect, it } from 'vitest';
import {
  baseTargetSpeed,
  clamp,
  doubleHazardChance,
  gateRadiusScale,
  gateSpawnChance,
  gateSpawnInterval,
  hazardSpawnInterval,
  isNearMiss,
  pickupIntervalRange,
  slicerSpeedFactor,
} from '../difficulty.js';

describe('clamp', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
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
    expect(gateSpawnChance(999)).toBeLessThanOrEqual(0.94);
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

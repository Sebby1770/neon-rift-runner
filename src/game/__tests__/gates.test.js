import { describe, expect, it } from 'vitest';
import { crossedGatePlane, gatePlanarDistance, isGateCleared } from '../entities.js';
import { baseTargetSpeed } from '../difficulty.js';

const SPAWN_Z = -128;
const DESPAWN_Z = 12;

/**
 * The rule the game used before: a gate resolved only if one of its sampled
 * positions happened to land inside a fixed z-window.
 */
function windowRuleResolves(startZ, speed, delta) {
  let z = startZ;
  while (z <= DESPAWN_Z) {
    if (z >= -1.2 && z <= 1.1) return 1;
    z += speed * delta;
  }
  return 0;
}

function crossingRuleResolves(startZ, speed, delta) {
  let z = startZ;
  let resolved = 0;
  while (z <= DESPAWN_Z) {
    const previousZ = z;
    z += speed * delta;
    if (crossedGatePlane(previousZ, z)) resolved += 1;
  }
  return resolved;
}

/**
 * Gates spawn at assorted offsets and forward speed drifts continuously, so a
 * gate's sampled positions land at an effectively arbitrary phase relative to
 * the scoring window. Sweeping that phase measures how often each rule resolves
 * the gate at all.
 */
function dropRate(rule, speed, delta, samples = 500) {
  let dropped = 0;
  for (let i = 0; i < samples; i += 1) {
    const startZ = SPAWN_Z + (i / samples) * speed * delta;
    if (rule(startZ, speed, delta) !== 1) dropped += 1;
  }
  return dropped / samples;
}

/** Cruise + ramp + boost + overdrive, the fastest the ship ever travels. */
const TOP_SPEED = baseTargetSpeed(false, 600) + 17 + 20;

describe('crossedGatePlane', () => {
  it('detects a crossing regardless of step size', () => {
    expect(crossedGatePlane(-0.4, 0.3)).toBe(true);
    expect(crossedGatePlane(-4, 4)).toBe(true);
    expect(crossedGatePlane(-8, -2)).toBe(false);
    expect(crossedGatePlane(2, 6)).toBe(false);
  });

  it('treats landing exactly on the plane as a crossing', () => {
    expect(crossedGatePlane(-1, 0)).toBe(true);
    expect(crossedGatePlane(0, 1)).toBe(false);
  });

  it('resolves every gate exactly once at any speed, frame time and phase', () => {
    for (const speed of [28, 46, 63, TOP_SPEED]) {
      for (const delta of [1 / 120, 1 / 60, 1 / 30, 1 / 24, 0.05]) {
        expect(
          dropRate(crossingRuleResolves, speed, delta),
          `speed ${speed} delta ${delta}`,
        ).toBe(0);
      }
    }
  });

  it('witnesses the old window rule silently dropping gates on slow frames', () => {
    // A gate advances speed * delta per frame; once that exceeds the old
    // 2.3-unit window it can step clean over it, resolving as nothing — no
    // points, no miss penalty, no sound. At 60fps the step stayed inside the
    // window, which is why this never showed up in normal play.
    expect(dropRate(windowRuleResolves, TOP_SPEED, 0.05)).toBeGreaterThan(0.4);
    expect(dropRate(windowRuleResolves, TOP_SPEED, 1 / 30)).toBeGreaterThan(0.15);
    expect(dropRate(windowRuleResolves, TOP_SPEED, 1 / 60)).toBe(0);

    expect(dropRate(crossingRuleResolves, TOP_SPEED, 0.05)).toBe(0);
    expect(dropRate(crossingRuleResolves, TOP_SPEED, 1 / 30)).toBe(0);
  });
});

describe('gate clearance', () => {
  const gate = (x, y, hitRadius) => ({ position: { x, y }, userData: { hitRadius } });

  it('measures lateral offset only, ignoring how far past the ship the gate is', () => {
    expect(gatePlanarDistance({ x: 0, y: 3 }, gate(0, 3, 1))).toBe(0);
    expect(gatePlanarDistance({ x: 0, y: 0 }, gate(3, 4, 1))).toBe(5);
  });

  it('clears a centred gate and misses one the ship is outside', () => {
    expect(isGateCleared({ x: 0, y: 2.6 }, gate(0.2, 2.7, 1.4))).toBe(true);
    expect(isGateCleared({ x: 0, y: 2.6 }, gate(4.2, 2.7, 1.4))).toBe(false);
  });

  it('does not penalise the gate sitting further down the tunnel', () => {
    // Same lateral offset, wildly different z — both must resolve the same way.
    const shipPos = { x: 0.5, y: 3 };
    const near = { position: { x: 0.6, y: 3.1, z: -0.2 }, userData: { hitRadius: 1.3 } };
    const far = { position: { x: 0.6, y: 3.1, z: -3.9 }, userData: { hitRadius: 1.3 } };
    expect(isGateCleared(shipPos, near)).toBe(isGateCleared(shipPos, far));
    expect(isGateCleared(shipPos, far)).toBe(true);
  });

  it('treats a gate with no hit radius as missed rather than throwing', () => {
    expect(isGateCleared({ x: 0, y: 0 }, { position: { x: 0, y: 0 }, userData: {} })).toBe(false);
  });
});

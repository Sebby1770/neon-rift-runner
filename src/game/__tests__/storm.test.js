import { describe, expect, it } from 'vitest';
import {
  endStorm,
  maybeStartStorm,
  resetStormState,
  shouldStartStorm,
  startStorm,
  STORM_DURATION,
  STORM_GATE_INTERVAL,
  STORM_SCORE_MULTIPLIER,
  stormDoubleHazardBonus,
  stormHazardIntervalMul,
  stormScoreMultiplier,
  tickStorm,
} from '../storm.js';
import { createGameState, resetRunState, applyGateClear } from '../state.js';

function freshState(overrides = {}) {
  const s = createGameState();
  resetRunState(s, overrides);
  return s;
}

describe('resetStormState', () => {
  it('initializes storm fields', () => {
    const s = {};
    resetStormState(s);
    expect(s.stormActive).toBe(false);
    expect(s.stormTimer).toBe(0);
    expect(s.stormMultiplier).toBe(1);
    expect(s.nextStormGate).toBe(STORM_GATE_INTERVAL);
  });
});

describe('shouldStartStorm / startStorm', () => {
  it('does not start before gate threshold', () => {
    const s = freshState();
    s.gates = 10;
    expect(shouldStartStorm(s)).toBe(false);
  });

  it('starts at gate 25 and advances next threshold', () => {
    const s = freshState();
    s.gates = 25;
    expect(shouldStartStorm(s)).toBe(true);
    const msg = startStorm(s);
    expect(msg).toBe('RIFT STORM');
    expect(s.stormActive).toBe(true);
    expect(s.stormTimer).toBe(STORM_DURATION);
    expect(s.stormMultiplier).toBe(STORM_SCORE_MULTIPLIER);
    expect(s.nextStormGate).toBe(50);
    expect(shouldStartStorm(s)).toBe(false);
  });

  it('skips zen and practice', () => {
    const zen = freshState({ zen: true });
    zen.gates = 25;
    expect(shouldStartStorm(zen)).toBe(false);

    const practice = freshState({ practice: true });
    practice.gates = 25;
    expect(shouldStartStorm(practice)).toBe(false);
  });

  it('maybeStartStorm is a no-op when not ready', () => {
    const s = freshState();
    s.gates = 5;
    expect(maybeStartStorm(s)).toBe(null);
  });
});

describe('tickStorm / endStorm', () => {
  it('counts down and ends with callout', () => {
    const s = freshState();
    s.gates = 25;
    startStorm(s);
    expect(tickStorm(s, 3)).toBe(null);
    expect(s.stormTimer).toBeCloseTo(5);
    expect(s.stormActive).toBe(true);

    const end = tickStorm(s, 10);
    expect(end).toBe('Storm clear');
    expect(s.stormActive).toBe(false);
    expect(s.stormMultiplier).toBe(1);
  });

  it('endStorm clears fields', () => {
    const s = freshState();
    startStorm(s);
    expect(endStorm(s)).toBe('Storm clear');
    expect(s.stormActive).toBe(false);
    expect(s.stormTimer).toBe(0);
  });
});

describe('storm multipliers', () => {
  it('boosts score and densifies hazards while active', () => {
    const s = freshState();
    expect(stormScoreMultiplier(s)).toBe(1);
    expect(stormHazardIntervalMul(s)).toBe(1);
    expect(stormDoubleHazardBonus(s)).toBe(0);

    startStorm(s);
    expect(stormScoreMultiplier(s)).toBe(STORM_SCORE_MULTIPLIER);
    expect(stormHazardIntervalMul(s)).toBeLessThan(1);
    expect(stormDoubleHazardBonus(s)).toBeGreaterThan(0);
  });

  it('multiplies gate clear score during storm', () => {
    const s = freshState();
    // one gate without storm
    const ptsNormal = applyGateClear(s);
    // force storm and clear another
    startStorm(s);
    const ptsStorm = applyGateClear(s);
    expect(ptsStorm).toBeGreaterThan(ptsNormal);
  });
});

describe('second storm at 50 gates', () => {
  it('queues next storm after first ends', () => {
    const s = freshState();
    s.gates = 25;
    startStorm(s);
    endStorm(s);
    s.gates = 49;
    expect(shouldStartStorm(s)).toBe(false);
    s.gates = 50;
    expect(shouldStartStorm(s)).toBe(true);
  });
});

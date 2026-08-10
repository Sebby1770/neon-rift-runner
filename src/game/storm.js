/**
 * Rift Storm boss-lite event — pure helpers (testable, no DOM/Three).
 *
 * Triggers every STORM_GATE_INTERVAL gates for STORM_DURATION seconds:
 * denser hazards + score multiplier while active.
 */

export const STORM_DURATION = 8;
export const STORM_GATE_INTERVAL = 25;
export const STORM_SCORE_MULTIPLIER = 1.75;
/** Hazard spawn interval multiplier while storm is active (< 1 = denser). */
export const STORM_HAZARD_INTERVAL_MUL = 0.48;
export const STORM_DOUBLE_HAZARD_BONUS = 0.35;

/**
 * Attach / reset storm fields on a game state object.
 */
export function resetStormState(state) {
  state.stormActive = false;
  state.stormTimer = 0;
  state.stormMultiplier = 1;
  state.nextStormGate = STORM_GATE_INTERVAL;
  return state;
}

/**
 * Whether a storm may start for this mode (not zen/practice).
 */
export function stormAllowed(state) {
  return !state.zen && !state.practice;
}

/**
 * True when gates have reached the next storm threshold.
 */
export function shouldStartStorm(state) {
  if (!stormAllowed(state)) return false;
  if (state.stormActive) return false;
  const next = state.nextStormGate ?? STORM_GATE_INTERVAL;
  return state.gates >= next;
}

/**
 * Begin Rift Storm. Mutates state. Returns callout string.
 */
export function startStorm(state) {
  state.stormActive = true;
  state.stormTimer = STORM_DURATION;
  state.stormMultiplier = STORM_SCORE_MULTIPLIER;
  const next = state.nextStormGate ?? STORM_GATE_INTERVAL;
  state.nextStormGate = next + STORM_GATE_INTERVAL;
  return 'RIFT STORM';
}

/**
 * End Rift Storm. Mutates state. Returns callout string.
 */
export function endStorm(state) {
  state.stormActive = false;
  state.stormTimer = 0;
  state.stormMultiplier = 1;
  return 'Storm clear';
}

/**
 * Tick storm timer. Returns end callout string if storm just ended, else null.
 */
export function tickStorm(state, delta) {
  if (!state.stormActive) return null;
  state.stormTimer = Math.max(0, (state.stormTimer || 0) - delta);
  if (state.stormTimer <= 0) {
    return endStorm(state);
  }
  return null;
}

/**
 * Maybe start a storm if gate threshold met. Returns start callout or null.
 */
export function maybeStartStorm(state) {
  if (!shouldStartStorm(state)) return null;
  return startStorm(state);
}

/** Score multiplier while storm is active (else 1). */
export function stormScoreMultiplier(state) {
  if (!state.stormActive) return 1;
  return state.stormMultiplier || STORM_SCORE_MULTIPLIER;
}

/** Hazard interval scale while storm is active. */
export function stormHazardIntervalMul(state) {
  return state.stormActive ? STORM_HAZARD_INTERVAL_MUL : 1;
}

/** Extra double-hazard chance while storm is active. */
export function stormDoubleHazardBonus(state) {
  return state.stormActive ? STORM_DOUBLE_HAZARD_BONUS : 0;
}

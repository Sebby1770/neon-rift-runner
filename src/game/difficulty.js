/**
 * Progressive difficulty curves — pure functions of runTime / flags.
 */

/** Base forward speed before boost/overdrive. */
export function baseTargetSpeed(zen, runTime) {
  const cruise = zen ? 23 : 28;
  // Soft ramp: fast early gains, then slower climb — more interesting than linear
  const ramp = Math.min(18, runTime * 0.42 + Math.sqrt(Math.max(0, runTime)) * 0.55);
  return cruise + ramp;
}

/** Seconds between gate spawns. */
export function gateSpawnInterval(runTime) {
  return clamp(1.45 - runTime * 0.015, 0.78, 1.45);
}

/** Seconds between hazard spawns (normal mode). */
export function hazardSpawnInterval(runTime) {
  // Density rises: interval shrinks, floor is aggressive but fair
  return clamp(1.12 - runTime * 0.012 - Math.min(0.2, runTime * 0.004), 0.42, 1.12);
}

/** Chance to actually spawn a gate when timer fires (higher later = denser). */
export function gateSpawnChance(runTime) {
  return clamp(0.76 + runTime * 0.004, 0.76, 0.94);
}

/** Scale factor for gate ring radius (slight shrink over time). */
export function gateRadiusScale(runTime) {
  // 1.0 at start → ~0.86 after long runs
  return clamp(1 - runTime * 0.0045, 0.86, 1);
}

/** Multiplier on slicer sway amplitude / phase speed. */
export function slicerSpeedFactor(runTime) {
  return 1 + Math.min(0.85, runTime * 0.018);
}

/** Extra hazard chance burst after certain runtime thresholds. */
export function doubleHazardChance(runTime) {
  if (runTime < 45) return 0;
  if (runTime < 90) return 0.12;
  return 0.22;
}

/** Pickup spawn interval range [min, max]. */
export function pickupIntervalRange(runTime) {
  const tighten = Math.min(0.8, runTime * 0.006);
  return [Math.max(1.8, 2.5 - tighten), Math.max(2.8, 4.6 - tighten * 1.2)];
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Near-miss distance band: between hit radius and outer skim radius.
 * Returns true if distance is a near-miss (outside collision, inside skim).
 */
export function isNearMiss(distance, hazardRadius, shipRadius = 0.58) {
  const hit = hazardRadius + shipRadius;
  const skim = hazardRadius + shipRadius + 0.95;
  return distance > hit && distance < skim;
}

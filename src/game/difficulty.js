/**
 * Progressive difficulty curves + Easy / Normal / Hard presets.
 * Pure functions of runTime / flags / preset id (no DOM/Three).
 */

export const DIFFICULTY_IDS = ['easy', 'normal', 'hard'];

/**
 * Preset scales applied on top of progressive curves.
 * - *IntervalMul > 1 → less frequent spawns
 * - gateSizeMul > 1 → larger rings
 * - nearMissPad > 1 → wider skim band
 * - hazardDamageMul → multiplies hull damage on hit
 */
export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    label: 'Easy',
    gateIntervalMul: 1.18,
    hazardIntervalMul: 1.45,
    gateChanceMul: 0.92,
    doubleHazardMul: 0.45,
    gapWallChanceMul: 0.55,
    gateSizeMul: 1.16,
    nearMissPad: 1.35,
    hazardDamageMul: 0.65,
    slicerSpeedMul: 0.85,
    gapWidthMul: 1.18,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    gateIntervalMul: 1,
    hazardIntervalMul: 1,
    gateChanceMul: 1,
    doubleHazardMul: 1,
    gapWallChanceMul: 1,
    gateSizeMul: 1,
    nearMissPad: 1,
    hazardDamageMul: 1,
    slicerSpeedMul: 1,
    gapWidthMul: 1,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    gateIntervalMul: 0.86,
    hazardIntervalMul: 0.7,
    gateChanceMul: 1.06,
    doubleHazardMul: 1.45,
    gapWallChanceMul: 1.4,
    gateSizeMul: 0.88,
    nearMissPad: 0.72,
    hazardDamageMul: 1.4,
    slicerSpeedMul: 1.22,
    gapWidthMul: 0.86,
  },
};

export function resolveDifficulty(id = 'normal') {
  return DIFFICULTY_PRESETS[id] || DIFFICULTY_PRESETS.normal;
}

export function isValidDifficulty(id) {
  return DIFFICULTY_IDS.includes(id);
}

/** Base forward speed before boost/overdrive. */
export function baseTargetSpeed(zen, runTime) {
  const cruise = zen ? 23 : 28;
  // Soft ramp: fast early gains, then slower climb — more interesting than linear
  const ramp = Math.min(18, runTime * 0.42 + Math.sqrt(Math.max(0, runTime)) * 0.55);
  return cruise + ramp;
}

/** Seconds between gate spawns. */
export function gateSpawnInterval(runTime, difficulty = 'normal') {
  const preset = resolveDifficulty(difficulty);
  return clamp(1.45 - runTime * 0.015, 0.78, 1.45) * preset.gateIntervalMul;
}

/** Seconds between hazard spawns (normal mode). */
export function hazardSpawnInterval(runTime, difficulty = 'normal') {
  // Density rises: interval shrinks, floor is aggressive but fair
  const base = clamp(1.12 - runTime * 0.012 - Math.min(0.2, runTime * 0.004), 0.42, 1.12);
  return base * resolveDifficulty(difficulty).hazardIntervalMul;
}

/** Chance to actually spawn a gate when timer fires (higher later = denser). */
export function gateSpawnChance(runTime, difficulty = 'normal') {
  const base = clamp(0.76 + runTime * 0.004, 0.76, 0.94);
  return clamp(base * resolveDifficulty(difficulty).gateChanceMul, 0.5, 0.98);
}

/** Scale factor for gate ring radius (slight shrink over time + preset). */
export function gateRadiusScale(runTime, difficulty = 'normal') {
  // 1.0 at start → ~0.86 after long runs
  const progressive = clamp(1 - runTime * 0.0045, 0.86, 1);
  return progressive * resolveDifficulty(difficulty).gateSizeMul;
}

/** Multiplier on slicer sway amplitude / phase speed. */
export function slicerSpeedFactor(runTime, difficulty = 'normal') {
  return (1 + Math.min(0.85, runTime * 0.018)) * resolveDifficulty(difficulty).slicerSpeedMul;
}

/** Extra hazard chance burst after certain runtime thresholds. */
export function doubleHazardChance(runTime, difficulty = 'normal') {
  let base = 0;
  if (runTime < 45) base = 0;
  else if (runTime < 90) base = 0.12;
  else base = 0.22;
  return clamp(base * resolveDifficulty(difficulty).doubleHazardMul, 0, 0.55);
}

/** Chance a hazard spawn is a gap wall (scales with time). */
export function gapWallChance(runTime, difficulty = 'normal') {
  const base = clamp(0.06 + runTime * 0.0035, 0.06, 0.32);
  return clamp(base * resolveDifficulty(difficulty).gapWallChanceMul, 0.02, 0.5);
}

/** Gap wall opening width (world units) — tightens slowly. */
export function gapWallWidth(runTime, difficulty = 'normal') {
  const base = clamp(2.45 - runTime * 0.008, 1.55, 2.45);
  return base * resolveDifficulty(difficulty).gapWidthMul;
}

/** Hull damage applied on hazard hit. */
export function hazardDamage(difficulty = 'normal', base = 24) {
  return Math.round(base * resolveDifficulty(difficulty).hazardDamageMul);
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
 * `difficulty` widens/narrows the outer skim pad.
 */
export function isNearMiss(distance, hazardRadius, shipRadius = 0.58, difficulty = 'normal') {
  const pad = resolveDifficulty(difficulty).nearMissPad;
  const hit = hazardRadius + shipRadius;
  const skim = hazardRadius + shipRadius + 0.95 * pad;
  return distance > hit && distance < skim;
}

/**
 * Lightweight ghost best-path recording / playback helpers (pure, testable).
 */

export const GHOST_SAMPLE_INTERVAL = 0.1;
/** Cap samples (~2 minutes at 10 Hz). */
export const GHOST_MAX_SAMPLES = 1200;

/**
 * Create a recorder for the current run.
 */
export function createGhostRecorder() {
  return {
    samples: [],
    timer: 0,
  };
}

/**
 * Sample ship position every GHOST_SAMPLE_INTERVAL seconds.
 * `ship` is { x, y }; runTime is seconds into the run.
 */
export function tickGhostRecorder(recorder, ship, runTime, delta) {
  if (!recorder || !ship) return recorder;
  recorder.timer = (recorder.timer || 0) + delta;
  if (recorder.timer < GHOST_SAMPLE_INTERVAL) return recorder;
  recorder.timer = 0;
  if (recorder.samples.length >= GHOST_MAX_SAMPLES) return recorder;
  recorder.samples.push(makeSample(runTime, ship.x, ship.y));
  return recorder;
}

export function makeSample(t, x, y) {
  return {
    t: round3(t),
    x: round3(x),
    y: round3(y),
  };
}

function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

/**
 * Serialize samples to a compact JSON string.
 */
export function serializeGhost(samples) {
  if (!Array.isArray(samples)) return '[]';
  const clean = samples
    .filter(
      (s) =>
        s &&
        typeof s.t === 'number' &&
        typeof s.x === 'number' &&
        typeof s.y === 'number' &&
        Number.isFinite(s.t) &&
        Number.isFinite(s.x) &&
        Number.isFinite(s.y),
    )
    .slice(0, GHOST_MAX_SAMPLES)
    .map((s) => makeSample(s.t, s.x, s.y));
  return JSON.stringify(clean);
}

/**
 * Deserialize ghost samples from JSON string or array.
 */
export function deserializeGhost(raw) {
  if (raw == null) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s.t === 'number' &&
          typeof s.x === 'number' &&
          typeof s.y === 'number' &&
          Number.isFinite(s.t) &&
          Number.isFinite(s.x) &&
          Number.isFinite(s.y),
      )
      .slice(0, GHOST_MAX_SAMPLES)
      .map((s) => makeSample(s.t, s.x, s.y));
  } catch {
    return [];
  }
}

/**
 * Interpolated position at runTime, or null if no samples / past end.
 */
export function sampleAtTime(samples, runTime) {
  if (!samples || !samples.length) return null;
  if (runTime < samples[0].t) {
    return { x: samples[0].x, y: samples[0].y };
  }
  const last = samples[samples.length - 1];
  if (runTime > last.t + GHOST_SAMPLE_INTERVAL * 2) return null;
  if (runTime >= last.t) return { x: last.x, y: last.y };

  // Linear scan is fine for capped sample counts; binary search for speed
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= runTime) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.t - a.t || 1;
  const u = clamp01((runTime - a.t) / span);
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
  };
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

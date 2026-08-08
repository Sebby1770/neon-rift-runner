/**
 * Seeded PRNG utilities for daily challenge runs.
 * Mulberry32 produces a deterministic sequence from a 32-bit seed.
 */

/** Hash a string (e.g. YYYY-MM-DD) into a 32-bit unsigned integer. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Create a mulberry32 PRNG from a numeric seed. Returns () => [0, 1). */
export function createRng(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build an RNG from a date key string (YYYY-MM-DD). */
export function createDailyRng(dateKey) {
  return createRng(hashString(`neon-rift-daily:${dateKey}`));
}

/**
 * Active random source. Defaults to Math.random.
 * Call setRandomSource(fn) during daily runs; resetRandomSource() after.
 */
let activeRandom = Math.random.bind(Math);

export function random() {
  return activeRandom();
}

export function setRandomSource(fn) {
  activeRandom = typeof fn === 'function' ? fn : Math.random.bind(Math);
}

export function resetRandomSource() {
  activeRandom = Math.random.bind(Math);
}

export function randFloat(min, max) {
  return min + random() * (max - min);
}

export function randFloatSpread(range) {
  return range * (0.5 - random());
}

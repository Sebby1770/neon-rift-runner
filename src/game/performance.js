/**
 * Adaptive quality governor.
 *
 * The renderer ran at a fixed pixel ratio with bloom and full particle counts
 * whatever the device could manage, and `animate()` clamps delta at 0.05s — so a
 * machine that cannot hold the frame rate does not drop detail, it drops into
 * slow motion, and the run gets harder rather than cheaper to draw.
 *
 * This watches real frame times and steps quality down when the device is
 * sustainably behind, then back up when it has headroom. Pure: no DOM, no
 * Three.js, time and frame samples are passed in.
 */

/** Ordered best to worst. */
export const QUALITY_TIERS = ['high', 'medium', 'low'];

export const TIER_SETTINGS = {
  high: { maxPixelRatio: 2, bloom: true, particleScale: 1, streakScale: 1 },
  medium: { maxPixelRatio: 1.5, bloom: true, particleScale: 0.6, streakScale: 0.7 },
  low: { maxPixelRatio: 1, bloom: false, particleScale: 0.3, streakScale: 0.4 },
};

export const DEFAULT_GOVERNOR_OPTIONS = {
  /** Frames per decision. ~0.75s at 60fps: long enough to ignore one bad frame. */
  sampleSize: 45,
  /** Median frame time above this is "sustainably behind" (~45fps). */
  downgradeMs: 22,
  /** Median frame time below this means there is headroom to spare (~71fps). */
  upgradeMs: 14,
  /** Quiet period after any change, so a tier switch can settle before judging. */
  cooldownMs: 4000,
  /** An upgrade undone this quickly counts as a failed probe. */
  probationMs: 8000,
  /** Each failed probe doubles the wait before trying to upgrade again. */
  maxUpgradeCooldownMs: 120000,
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function tierSettings(tier) {
  return TIER_SETTINGS[tier] ?? TIER_SETTINGS.high;
}

/**
 * @param {object} [options]
 * @param {'high'|'medium'|'low'} [options.tier] starting tier
 */
export function createQualityGovernor(options = {}) {
  const config = { ...DEFAULT_GOVERNOR_OPTIONS, ...options };
  let index = Math.max(0, QUALITY_TIERS.indexOf(options.tier ?? 'high'));
  let samples = [];
  let lastChangeAt = -Infinity;
  let lastUpgradeAt = -Infinity;
  let upgradeCooldownMs = config.cooldownMs;

  function reset() {
    samples = [];
  }

  return {
    get tier() {
      return QUALITY_TIERS[index];
    },
    get settings() {
      return tierSettings(QUALITY_TIERS[index]);
    },
    /** Frame times currently held, for tests and the debug meter. */
    get sampleCount() {
      return samples.length;
    },

    /**
     * Feeds one frame. Returns the tier and whether it just changed.
     * @param {number} frameMs wall-clock duration of the frame
     * @param {number} nowMs monotonic timestamp
     */
    record(frameMs, nowMs) {
      const tier = QUALITY_TIERS[index];

      // Ignore absurd samples: a tab regaining focus reports one enormous frame
      // that says nothing about how fast the device is.
      if (Number.isFinite(frameMs) && frameMs > 0 && frameMs < 1000) {
        samples.push(frameMs);
        if (samples.length > config.sampleSize) samples.shift();
      }

      if (samples.length < config.sampleSize) return { tier, changed: false };
      if (nowMs - lastChangeAt < config.cooldownMs) return { tier, changed: false };

      const typical = median(samples);

      if (typical > config.downgradeMs && index < QUALITY_TIERS.length - 1) {
        // If this undoes a recent upgrade, that tier is out of reach for now —
        // back off before probing again so quality cannot oscillate.
        if (nowMs - lastUpgradeAt < config.probationMs) {
          upgradeCooldownMs = Math.min(upgradeCooldownMs * 2, config.maxUpgradeCooldownMs);
        }
        index += 1;
        lastChangeAt = nowMs;
        reset();
        return { tier: QUALITY_TIERS[index], changed: true };
      }

      if (typical < config.upgradeMs && index > 0) {
        if (nowMs - lastChangeAt < upgradeCooldownMs) return { tier, changed: false };
        index -= 1;
        lastChangeAt = nowMs;
        lastUpgradeAt = nowMs;
        reset();
        return { tier: QUALITY_TIERS[index], changed: true };
      }

      return { tier, changed: false };
    },

    /** Pins a tier (a user turning adaptive quality off). */
    setTier(tier) {
      const next = QUALITY_TIERS.indexOf(tier);
      if (next === -1) return false;
      index = next;
      reset();
      return true;
    },
  };
}

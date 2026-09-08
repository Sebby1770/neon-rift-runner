import { describe, expect, it } from 'vitest';
import {
  createQualityGovernor,
  DEFAULT_GOVERNOR_OPTIONS,
  QUALITY_TIERS,
  TIER_SETTINGS,
  tierSettings,
} from '../performance.js';

const { sampleSize, cooldownMs } = DEFAULT_GOVERNOR_OPTIONS;

/** Feeds `frames` frames of `frameMs` each, advancing a clock as it goes. */
function feed(governor, frameMs, frames, startMs = 0) {
  let now = startMs;
  let last = { tier: governor.tier, changed: false };
  for (let i = 0; i < frames; i += 1) {
    now += frameMs;
    const result = governor.record(frameMs, now);
    if (result.changed) last = result;
  }
  return { ...last, now };
}

describe('tier settings', () => {
  it('degrades monotonically across tiers', () => {
    const ordered = QUALITY_TIERS.map((tier) => TIER_SETTINGS[tier]);
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i].maxPixelRatio).toBeLessThanOrEqual(ordered[i - 1].maxPixelRatio);
      expect(ordered[i].particleScale).toBeLessThanOrEqual(ordered[i - 1].particleScale);
      expect(ordered[i].streakScale).toBeLessThanOrEqual(ordered[i - 1].streakScale);
    }
  });

  it('falls back to high for an unknown tier', () => {
    expect(tierSettings('nonsense')).toBe(TIER_SETTINGS.high);
  });
});

describe('createQualityGovernor', () => {
  it('starts at high and holds there on a healthy 60fps device', () => {
    const governor = createQualityGovernor();
    feed(governor, 16.7, sampleSize * 10);
    expect(governor.tier).toBe('high');
  });

  it('does not decide anything before it has a full window', () => {
    const governor = createQualityGovernor();
    const result = feed(governor, 40, sampleSize - 1);
    expect(result.changed).toBe(false);
    expect(governor.tier).toBe('high');
  });

  it('steps down when the device is sustainably behind', () => {
    const governor = createQualityGovernor();
    feed(governor, 30, sampleSize); // ~33fps
    expect(governor.tier).toBe('medium');
  });

  it('walks all the way down when things stay bad', () => {
    const governor = createQualityGovernor();
    let now = 0;
    for (let step = 0; step < 6; step += 1) {
      const result = feed(governor, 45, sampleSize, now);
      now = result.now + cooldownMs;
    }
    expect(governor.tier).toBe('low');
  });

  it('never goes below the worst tier', () => {
    const governor = createQualityGovernor({ tier: 'low' });
    let now = 0;
    for (let step = 0; step < 4; step += 1) {
      const result = feed(governor, 90, sampleSize, now);
      now = result.now + cooldownMs;
    }
    expect(governor.tier).toBe('low');
  });

  it('ignores a single catastrophic frame', () => {
    const governor = createQualityGovernor();
    let now = 0;
    for (let i = 0; i < sampleSize - 1; i += 1) {
      now += 16.7;
      governor.record(16.7, now);
    }
    now += 400;
    governor.record(400, now); // one long stall, e.g. a GC pause
    expect(governor.tier).toBe('high');
  });

  it('discards implausible frame times outright', () => {
    const governor = createQualityGovernor();
    // A tab regaining focus reports one enormous frame; it says nothing about
    // how fast the device is.
    for (let i = 0; i < sampleSize * 2; i += 1) {
      governor.record(5000, i * 5000);
    }
    expect(governor.sampleCount).toBe(0);
    expect(governor.tier).toBe('high');
  });

  it('respects the cooldown between changes', () => {
    const governor = createQualityGovernor();
    const first = feed(governor, 30, sampleSize);
    expect(first.changed).toBe(true);

    // Immediately bad again, but still inside the cooldown.
    const second = feed(governor, 30, sampleSize, first.now);
    expect(second.changed).toBe(false);
    expect(governor.tier).toBe('medium');
  });

  it('recovers upward once the device has headroom', () => {
    const governor = createQualityGovernor();
    const down = feed(governor, 30, sampleSize);
    expect(governor.tier).toBe('medium');

    const up = feed(governor, 10, sampleSize * 4, down.now + cooldownMs);
    expect(up.changed).toBe(true);
    expect(governor.tier).toBe('high');
  });

  it('stays put in the band between the two thresholds', () => {
    const governor = createQualityGovernor({ tier: 'medium' });
    // 18ms sits above the upgrade threshold and below the downgrade one.
    feed(governor, 18, sampleSize * 8);
    expect(governor.tier).toBe('medium');
  });

  it('backs off probing after an upgrade is immediately undone', () => {
    const governor = createQualityGovernor();
    let now = feed(governor, 30, sampleSize).now + cooldownMs;

    // Probe up on a brief calm patch, then fall straight back — a failed probe.
    now = feed(governor, 10, sampleSize, now).now;
    expect(governor.tier).toBe('high');
    now = feed(governor, 30, sampleSize, now + cooldownMs).now;
    expect(governor.tier).toBe('medium');

    // The next calm patch must not immediately promote again.
    const retry = feed(governor, 10, sampleSize, now + cooldownMs);
    expect(retry.changed).toBe(false);
    expect(governor.tier).toBe('medium');
  });

  it('lets a pinned tier be set directly', () => {
    const governor = createQualityGovernor();
    expect(governor.setTier('low')).toBe(true);
    expect(governor.tier).toBe('low');
    expect(governor.settings.bloom).toBe(false);
    expect(governor.setTier('ultra')).toBe(false);
    expect(governor.tier).toBe('low');
  });

  it('exposes the settings for the current tier', () => {
    const governor = createQualityGovernor({ tier: 'medium' });
    expect(governor.settings).toEqual(TIER_SETTINGS.medium);
  });
});

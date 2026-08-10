import { describe, expect, it } from 'vitest';
import {
  createKeys,
  gamepadStartEdge,
  handleKeyEvent,
  mergeInput,
  pollGamepadSnapshot,
} from '../input.js';

describe('createKeys / keyboard', () => {
  it('tracks movement keys', () => {
    const keys = createKeys();
    handleKeyEvent(keys, { key: 'a', preventDefault() {} }, true);
    expect(keys.left).toBe(true);
    handleKeyEvent(keys, { key: 'a', preventDefault() {} }, false);
    expect(keys.left).toBe(false);
  });
});

describe('pollGamepadSnapshot', () => {
  it('returns empty when no pads', () => {
    const snap = pollGamepadSnapshot(() => []);
    expect(snap.connected).toBe(false);
    expect(snap.left).toBe(false);
  });

  it('reads stick, d-pad, boost, start', () => {
    const fake = {
      axes: [-0.9, 0.1, 0, 0],
      buttons: [
        { pressed: true }, // A
        {},
        {},
        {},
        {},
        {},
        {},
        { pressed: false, value: 0 },
        {},
        { pressed: true }, // Start
        {},
        {},
        { pressed: false },
        { pressed: false },
        { pressed: false },
        { pressed: true }, // d-right
      ],
    };
    const snap = pollGamepadSnapshot(() => [fake]);
    expect(snap.connected).toBe(true);
    expect(snap.left).toBe(true); // stick
    expect(snap.right).toBe(true); // d-pad
    expect(snap.boost).toBe(true);
    expect(snap.start).toBe(true);
  });
});

describe('mergeInput', () => {
  it('ORs keyboard and pad', () => {
    const keys = createKeys();
    keys.up = true;
    const pad = {
      connected: true,
      left: true,
      right: false,
      up: false,
      down: false,
      boost: true,
      start: false,
    };
    const m = mergeInput(keys, pad);
    expect(m.up).toBe(true);
    expect(m.left).toBe(true);
    expect(m.boost).toBe(true);
  });
});

describe('gamepadStartEdge', () => {
  it('detects rising edge only', () => {
    expect(gamepadStartEdge({ start: true }, false).pressedEdge).toBe(true);
    expect(gamepadStartEdge({ start: true }, true).pressedEdge).toBe(false);
    expect(gamepadStartEdge({ start: false }, true).pressedEdge).toBe(false);
  });
});

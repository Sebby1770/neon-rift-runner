/**
 * Keyboard / touch / pointer / gamepad input state.
 */

export function createKeys() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };
}

export function handleKeyEvent(keys, event, isDown, handlers = {}) {
  const key = event.key.toLowerCase();
  const before = { ...keys };

  if (key === 'arrowleft' || key === 'a') keys.left = isDown;
  if (key === 'arrowright' || key === 'd') keys.right = isDown;
  if (key === 'arrowup' || key === 'w') keys.up = isDown;
  if (key === 'arrowdown' || key === 's') keys.down = isDown;
  if (key === ' ' || key === 'shift') keys.boost = isDown;

  if (key === 'escape' && isDown && typeof handlers.onEscape === 'function') {
    handlers.onEscape();
  }

  const changed = Object.keys(keys).some((name) => keys[name] !== before[name]);
  if (changed) event.preventDefault();
  return changed;
}

export function bindHoldButton(button, keys) {
  const action = button.dataset.hold;
  if (!action || !(action in keys)) return;

  const setHeld = (held) => {
    keys[action] = held;
    button.classList.toggle('is-held', held);
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setHeld(true);
  });
  button.addEventListener('pointerup', () => setHeld(false));
  button.addEventListener('pointercancel', () => setHeld(false));
  button.addEventListener('lostpointercapture', () => setHeld(false));
}

export function bindAllHoldButtons(root, keys) {
  root.querySelectorAll('[data-hold]').forEach((button) => bindHoldButton(button, keys));
}

// ---------------------------------------------------------------------------
// Gamepad (Gamepad API — no extra deps)
// Standard mapping: axes 0/1 stick, buttons 12–15 D-pad, 0 = A, 7 = RT, 9 = Start
// ---------------------------------------------------------------------------

const STICK_DEADZONE = 0.28;

/**
 * Read the first connected gamepad into a pure snapshot.
 * Safe when Gamepad API is missing (returns all false).
 */
export function pollGamepadSnapshot(getGamepads = defaultGetGamepads) {
  const empty = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    start: false,
    connected: false,
  };

  let list;
  try {
    list = getGamepads ? getGamepads() : null;
  } catch {
    return empty;
  }
  if (!list) return empty;

  let pad = null;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]) {
      pad = list[i];
      break;
    }
  }
  if (!pad) return empty;

  const axes = pad.axes || [];
  const buttons = pad.buttons || [];
  const lx = axes[0] || 0;
  const ly = axes[1] || 0;

  const dLeft = !!buttons[14]?.pressed;
  const dRight = !!buttons[15]?.pressed;
  const dUp = !!buttons[12]?.pressed;
  const dDown = !!buttons[13]?.pressed;

  // A (0) or RT (7) for boost
  const aBtn = !!buttons[0]?.pressed;
  const rt = !!buttons[7]?.pressed || (typeof buttons[7]?.value === 'number' && buttons[7].value > 0.35);
  // Start (9) — some pads use 9 or 8
  const start = !!buttons[9]?.pressed || !!buttons[8]?.pressed;

  return {
    left: dLeft || lx < -STICK_DEADZONE,
    right: dRight || lx > STICK_DEADZONE,
    up: dUp || ly < -STICK_DEADZONE,
    down: dDown || ly > STICK_DEADZONE,
    boost: aBtn || rt,
    start,
    connected: true,
  };
}

function defaultGetGamepads() {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return null;
  }
  return navigator.getGamepads();
}

/**
 * Merge keyboard/touch keys with a gamepad snapshot (OR semantics).
 */
export function mergeInput(keys, pad) {
  if (!pad || !pad.connected) {
    return {
      left: !!keys.left,
      right: !!keys.right,
      up: !!keys.up,
      down: !!keys.down,
      boost: !!keys.boost,
    };
  }
  return {
    left: !!keys.left || !!pad.left,
    right: !!keys.right || !!pad.right,
    up: !!keys.up || !!pad.up,
    down: !!keys.down || !!pad.down,
    boost: !!keys.boost || !!pad.boost,
  };
}

/**
 * Edge-detect Start button for pause toggle.
 * Returns { pressedEdge, prevStart } — call each frame with previous start state.
 */
export function gamepadStartEdge(pad, prevStart) {
  const start = !!(pad && pad.start);
  return {
    pressedEdge: start && !prevStart,
    prevStart: start,
  };
}

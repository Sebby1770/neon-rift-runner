/**
 * Keyboard / touch / pointer input state.
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

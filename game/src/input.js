// Hands and pointer. Held keys give a flight direction on two axes; one-shot presses (start,
// pause, restart, mute) are queued as bit flags and taken exactly once by the loop, so a press
// between frames is neither lost nor doubled. The pointer's position is translated into
// playfield coordinates, so the pod can also be steered by mouse: move and it follows.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

/** How long, in ms, a pointer position still counts as "the player is steering by mouse". */
const POINTER_FRESH_MS = 5000;

export function createInput(target) {
  const held = { left: false, right: false, up: false, down: false };
  let actions = 0;
  const pointer = { x: FIELD.width / 2, y: FIELD.height * 0.62, at: -Infinity };

  function notePointer(event) {
    const rect = target.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    if (scale <= 0) return;
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    pointer.x = Math.min(FIELD.width, Math.max(0, (event.clientX - rect.left - offsetX) / scale));
    pointer.y = Math.min(FIELD.height, Math.max(0, (event.clientY - rect.top - offsetY) / scale));
    pointer.at = performance.now();
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
  });
  // A key let go while the tab is hidden never sends keyup: drop everything on blur.
  window.addEventListener('blur', () => {
    held.left = false;
    held.right = false;
    held.up = false;
    held.down = false;
  });
  target.addEventListener('pointermove', notePointer);
  target.addEventListener('pointerdown', (event) => {
    notePointer(event);
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The held keys as a direction: each axis -1, 0 or 1 (both keys on an axis cancel out). */
    moveVector() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** The last pointer position in playfield coordinates, if it was seen recently. */
    pointerIfFresh() {
      return performance.now() - pointer.at <= POINTER_FRESH_MS ? pointer : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

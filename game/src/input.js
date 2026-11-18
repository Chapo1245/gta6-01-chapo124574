// Keyboard and touch input. Held keys give steering and throttle; one-shot
// presses (enter car, punch, radio, mission, pause) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost
// and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RADIO = 16;
export const ACTION_MISSION = 32;

const FORWARD = new Set(['ArrowUp', 'KeyW']);
const BACK = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const HANDBRAKE = new Set(['Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const RADIO = new Set(['KeyR']);
const MISSION = new Set(['KeyM']);

export function createInput() {
  let forward = false;
  let back = false;
  let left = false;
  let right = false;
  let run = false;
  let handbrake = false;
  let actions = 0;
  const touch = { forward: false, back: false, left: false, right: false };

  function onKey(event, down) {
    if (FORWARD.has(event.code)) forward = down;
    else if (BACK.has(event.code)) back = down;
    else if (LEFT.has(event.code)) left = down;
    else if (RIGHT.has(event.code)) right = down;
    else if (RUN.has(event.code)) run = down;
    else if (HANDBRAKE.has(event.code)) handbrake = down;
    else if (down && !event.repeat) {
      if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
      else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
      else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
      else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
      else if (RADIO.has(event.code)) actions |= ACTION_RADIO;
      else if (MISSION.has(event.code)) actions |= ACTION_MISSION;
      else return;
    } else return;
    event.preventDefault();
  }

  window.addEventListener('keydown', (event) => onKey(event, true));
  window.addEventListener('keyup', (event) => onKey(event, false));
  window.addEventListener('blur', () => {
    forward = back = left = right = run = handbrake = false;
  });

  // Touch buttons (data-touch attributes in the HUD) drive the same state.
  for (const button of document.querySelectorAll('[data-touch]')) {
    const name = button.dataset.touch;
    const press = (event) => {
      event.preventDefault();
      if (name === 'enter') actions |= ACTION_ENTER;
      else if (name === 'punch') actions |= ACTION_PUNCH;
      else if (name === 'radio') actions |= ACTION_RADIO;
      else if (name === 'pause') actions |= ACTION_PAUSE;
      else if (name === 'confirm') actions |= ACTION_CONFIRM;
      else touch[name] = true;
    };
    const release = (event) => {
      event.preventDefault();
      if (name in touch) touch[name] = false;
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
  }

  return {
    forward() {
      return forward || touch.forward;
    },
    back() {
      return back || touch.back;
    },
    steer() {
      const l = left || touch.left;
      const r = right || touch.right;
      return (r ? 1 : 0) - (l ? 1 : 0);
    },
    run() {
      return run;
    },
    handbrake() {
      return handbrake;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

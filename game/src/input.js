// input.js — keyboard + mouse state for Sunvale Heat. One job: raw input only.
const keys = new Set();
let mouseDX = 0, mouseDY = 0, mouseDown = false, mouseClicked = false;
let pointerLocked = false;
const pressHandlers = new Map(); // code -> [fn]

export const Input = {
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        keys.add(e.code);
        const list = pressHandlers.get(e.code);
        if (list) for (const fn of list) fn();
      }
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => keys.clear());
    addEventListener('mousemove', (e) => {
      if (pointerLocked) { mouseDX += e.movementX; mouseDY += e.movementY; }
    });
    // only clicks on the game canvas count as shooting — UI buttons must not fire the gun
    addEventListener('mousedown', (e) => {
      if (e.button === 0 && e.target === canvas) { mouseDown = true; mouseClicked = true; }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('click', () => {
      if (!pointerLocked && document.pointerLockElement !== canvas) {
        try { canvas.requestPointerLock(); } catch (_) { /* pointer lock unavailable */ }
      }
    });
  },
  isDown(code) { return keys.has(code); },
  axis() { // -1..1 strafe/forward from WASD + arrows
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    return { f, s };
  },
  mouseDelta() { const d = { x: mouseDX, y: mouseDY }; mouseDX = 0; mouseDY = 0; return d; },
  isMouseDown() { return mouseDown; },
  consumeClick() { const c = mouseClicked; mouseClicked = false; return c; },
  clearClick() { mouseClicked = false; mouseDown = false; },
  onPress(code, fn) {
    if (!pressHandlers.has(code)) pressHandlers.set(code, []);
    pressHandlers.get(code).push(fn);
  },
  isLocked() { return pointerLocked; },
};

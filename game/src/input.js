// Azura Bay — keyboard + touch input. Held keys are read every frame;
// one-shot presses (interact, punch, pause, radio) are queued as flags
// and taken once, so a press between frames is never lost or doubled.
window.AZURA = window.AZURA || {};

const AzuraInput = {
  create() {
    const keys = {};
    const pressed = {};
    const touch = { forward: false, back: false, left: false, right: false };

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      keys[event.code] = true;
      pressed[event.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      keys[event.code] = false;
    });
    window.addEventListener('blur', () => {
      Object.keys(keys).forEach((k) => { keys[k] = false; });
    });

    // Touch buttons (shown on touch devices by CSS).
    const bindTouch = (id, name) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); touch[name] = true; };
      const off = (e) => { e.preventDefault(); touch[name] = false; };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
    };
    bindTouch('tUp', 'forward');
    bindTouch('tDown', 'back');
    bindTouch('tLeft', 'left');
    bindTouch('tRight', 'right');
    const bindTap = (id, code) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); pressed[code] = true; });
    };
    bindTap('tAction', 'KeyE');
    bindTap('tPunch', 'KeyF');

    return {
      keys, pressed, touch,
      // -1/0/1 steering, forward/back booleans, handbrake, sprint.
      read() {
        const left = keys.ArrowLeft || keys.KeyA || touch.left;
        const right = keys.ArrowRight || keys.KeyD || touch.right;
        const forward = keys.ArrowUp || keys.KeyW || touch.forward;
        const back = keys.ArrowDown || keys.KeyS || touch.back;
        return {
          steer: (right ? 1 : 0) - (left ? 1 : 0),
          forward: !!forward,
          back: !!back,
          handbrake: !!keys.Space,
          sprint: !!keys.ShiftLeft || !!keys.ShiftRight,
          // On-foot movement, camera-relative (camera sits behind heading).
          moveX: (right ? 1 : 0) - (left ? 1 : 0),
          moveZ: (forward ? 1 : 0) - (back ? 1 : 0),
        };
      },
      // Take and clear one-shot presses since the last call.
      takePressed() {
        const taken = { ...pressed };
        Object.keys(pressed).forEach((k) => { pressed[k] = false; });
        return taken;
      },
    };
  },
};

AZURA.input = AzuraInput;

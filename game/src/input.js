// Sunvale Heat — keyboard + mouse input (fresh code, round 2).
// WASD move, Shift run, Space jump, E enter/exit car, F punch, LMB/K shoot,
// R reload, P/Esc pause, M mute. Mouse drag orbits the camera; clicking the
// canvas requests pointer lock when playing.
var Input = {
  init: function (canvas) {
    window.addEventListener("keydown", function (e) {
      SV.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) >= 0) e.preventDefault();
      if (e.code === "KeyP" || e.code === "Escape") Game.togglePause();
      if (e.code === "KeyM") { SV.muted = !SV.muted; if (SV.audio) SV.audio.setMuted(SV.muted); }
      if (e.code === "KeyE") Game.tryEnterExitCar();
      if (e.code === "KeyF") Combat.punch();
      if (e.code === "KeyR") Combat.reload();
    });
    window.addEventListener("keyup", function (e) { SV.keys[e.code] = false; });
    window.addEventListener("blur", function () { SV.keys = {}; });

    var dragging = false, lx = 0, ly = 0;
    canvas.addEventListener("mousedown", function (e) {
      if (SV.mode !== "play") return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      if (!SV.pointerLocked && canvas.requestPointerLock) canvas.requestPointerLock();
    });
    window.addEventListener("mouseup", function () { dragging = false; });
    window.addEventListener("mousemove", function (e) {
      if (SV.mode !== "play") return;
      var dx = 0, dy = 0;
      if (SV.pointerLocked) { dx = e.movementX || 0; dy = e.movementY || 0; }
      else if (dragging) { dx = e.clientX - lx; dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; }
      else return;
      SV.camYaw -= dx * 0.0042;
      SV.camPitch = clamp(SV.camPitch + dy * 0.0032, 0.06, 1.15);
    });
    document.addEventListener("pointerlockchange", function () {
      SV.pointerLocked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener("click", function () {
      if (SV.mode === "play") Combat.shoot();
    });
  },

  // -1..1 movement axes relative to camera yaw.
  moveAxes: function () {
    var k = SV.keys, f = 0, s = 0;
    if (k["KeyW"] || k["ArrowUp"]) f += 1;
    if (k["KeyS"] || k["ArrowDown"]) f -= 1;
    if (k["KeyD"] || k["ArrowRight"]) s += 1;
    if (k["KeyA"] || k["ArrowLeft"]) s -= 1;
    return { f: f, s: s };
  },

  isDown: function (code) { return !!SV.keys[code]; }
};

// input.js — keyboard + mouse state for Sunvale Heat.
// WASD/arrows move & drive, mouse drag orbits the camera, click shoots, E/F/R/P/M/H actions.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var keys = {};
  var pressed = {}; // edge-triggered: true for one frame after keydown
  var mouseDown = false, mouseClicked = false;
  var dragDX = 0, dragDY = 0, dragging = false, lastX = 0, lastY = 0;

  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (var k in keys) keys[k] = false; });

  var canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousedown', function (e) {
    mouseDown = true; dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) mouseClicked = true;
    SV.audio.unlock();
  });
  window.addEventListener('mouseup', function () { mouseDown = false; dragging = false; });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    dragDX += e.clientX - lastX;
    dragDY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function axis() {
    var x = 0, z = 0;
    if (keys.KeyW || keys.ArrowUp) z -= 1;
    if (keys.KeyS || keys.ArrowDown) z += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    return { x: x, z: z };
  }
  function endFrame() {
    pressed = {};
    mouseClicked = false;
    dragDX = 0; dragDY = 0;
  }
  SV.input = {
    keys: keys,
    axis: axis,
    wasPressed: function (code) { return !!pressed[code]; },
    isDown: function (code) { return !!keys[code]; },
    run: function () { return !!(keys.ShiftLeft || keys.ShiftRight); },
    mouseClicked: function () { return mouseClicked; },
    mouseDown: function () { return mouseDown; },
    drag: function () { return { dx: dragDX, dy: dragDY }; },
    endFrame: endFrame
  };
})();

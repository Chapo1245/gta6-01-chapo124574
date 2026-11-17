// util.js — small shared helpers for Sunvale Heat (no dependencies).
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function dist2D(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
  function angleLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  // Procedural window texture for building facades: warm plaster + lit windows.
  function buildingTexture(baseColor, litRatio) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = baseColor; g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (var y = 0; y < 256; y += 32) g.fillRect(0, y, 128, 3);
    for (var row = 0; row < 7; row++) {
      for (var col = 0; col < 4; col++) {
        var lit = Math.random() < litRatio;
        g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd98a' : '#bfe6ff') : 'rgba(20,26,40,0.85)';
        g.fillRect(10 + col * 30, 14 + row * 34, 20, 22);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Soft radial sprite texture used for particles, glows and muzzle flashes.
  function glowTexture() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,220,150,0.7)');
    grad.addColorStop(1, 'rgba(255,180,80,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  SV.util = { clamp: clamp, lerp: lerp, rand: rand, randInt: randInt, pick: pick, dist2D: dist2D, angleLerp: angleLerp, fmtMoney: fmtMoney, buildingTexture: buildingTexture, glowTexture: glowTexture };
})();

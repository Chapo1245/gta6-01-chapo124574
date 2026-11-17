// hud.js — DOM HUD, minimap canvas, toasts, overlays and damage flash.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var els = {};
  var toastTimer = null;
  var flashTimer = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    els = {
      cash: $('cash'), healthBar: $('health-bar'), rep: $('rep-line'),
      stars: $('stars'), clock: $('clock'), dateLine: $('date-line'),
      objTitle: $('objective-title'), objText: $('objective-text'), objDist: $('objective-dist'),
      minimap: $('minimap'), speedNum: $('speed-num'), gear: $('gear-line'),
      ammoNum: $('ammo-num'), toast: $('toast'), crosshair: $('crosshair'),
      wantedFlash: $('wanted-flash'), missionList: $('mission-list')
    };
    // mission list on the start screen
    var html = '<b>STORY — FIVE JOBS FOR MARA VOSS</b><br>';
    SV.missions.list.forEach(function (m, i) {
      html += '<span class="locked">' + (i + 1) + '. ' + m.name + '</span><br>';
    });
    html += '<span class="locked">Then: free roam, Sunvale is yours.</span>';
    els.missionList.innerHTML = html;
  }

  function showHud(show) {
    var ids = ['hud-top-left', 'hud-top-right', 'objective', 'minimap-wrap', 'speedo', 'controls-hint'];
    ids.forEach(function (id) { $(id).classList.toggle('hidden', !show); });
  }
  function setObjective(title, text, sub) {
    els.objTitle.textContent = title;
    els.objText.textContent = text;
    if (sub) els.objDist.textContent = sub;
  }
  function setObjectiveDist(s) { els.objDist.textContent = s; }

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.style.opacity = '0'; }, ms || 3200);
  }
  function flashWanted() {
    els.wantedFlash.style.display = 'block';
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { els.wantedFlash.style.display = 'none'; }, 2600);
  }
  function flashDamage() {
    document.body.style.boxShadow = 'inset 0 0 120px rgba(255,0,0,0.55)';
    setTimeout(function () { document.body.style.boxShadow = 'none'; }, 180);
  }

  function update(dt) {
    els.cash.textContent = U.fmtMoney(SV.cash || 0);
    els.healthBar.style.width = Math.max(0, SV.health || 0) + '%';
    els.rep.textContent = 'REP ' + (SV.rep || 0);
    var w = SV.police ? SV.police.wanted : 0;
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < w ? '★' : '<span class="dim">★</span>';
    els.stars.innerHTML = stars;
    var mins = Math.floor((SV.clockMinutes || 1080) % 1440);
    var hh = Math.floor(mins / 60), mm = mins % 60;
    els.clock.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    els.dateLine.textContent = 'SUNVALE · DAY ' + (SV.day || 1);
    var car = SV.player ? SV.player.currentCar() : null;
    var speed = car ? Math.abs(car.speed) * 2.2 : 0;
    els.speedNum.textContent = Math.round(speed);
    els.gear.textContent = car ? (car.speed > 0.5 ? 'DRIVE' : car.speed < -0.5 ? 'REVERSE' : 'PARK') : 'ON FOOT';
    els.ammoNum.textContent = SV.combat ? (SV.combat.ammo + ' / ' + SV.combat.reserve) : '—';
    els.crosshair.style.display = (!car && SV.state === 'playing') ? 'block' : 'none';
    drawMinimap();
  }

  // Top-down minimap: roads, beach, landmarks, cars, police, peds, mission beacon.
  function drawMinimap() {
    var g = els.minimap.getContext('2d');
    var W = 210, H = 210;
    var half = SV.city.worldHalf + 30;
    function mx(x) { return (x + half) / (half * 2) * W; }
    function mz(z) { return (z + half) / (half * 2) * H; }
    g.fillStyle = '#1a2e1a'; g.fillRect(0, 0, W, H);
    // beach + ocean
    g.fillStyle = '#e8d29a'; g.fillRect(0, mz(SV.city.beachZ), W, H - mz(SV.city.beachZ));
    g.fillStyle = '#1e6fa8'; g.fillRect(0, mz(SV.city.beachZ + 60), W, H - mz(SV.city.beachZ + 60));
    // roads
    g.strokeStyle = '#3a3f48'; g.lineWidth = 4;
    SV.city.roadLines.forEach(function (l) {
      g.beginPath();
      if (l.axis === 'x') { g.moveTo(0, mz(l.at)); g.lineTo(W, mz(l.at)); }
      else { g.moveTo(mx(l.at), 0); g.lineTo(mx(l.at), H); }
      g.stroke();
    });
    // buildings as blocks
    g.fillStyle = '#5a6270';
    SV.city.colliders.forEach(function (c) {
      g.fillRect(mx(c.minX), mz(c.minZ), Math.max(1, mx(c.maxX) - mx(c.minX)), Math.max(1, mz(c.maxZ) - mz(c.minZ)));
    });
    // landmarks
    g.font = 'bold 9px Arial'; g.textAlign = 'left';
    var lm = SV.city.landmarks;
    function mark(p, color, label) {
      g.fillStyle = color;
      g.beginPath(); g.arc(mx(p.x), mz(p.z), 4, 0, 6.29); g.fill();
      g.fillStyle = '#fff'; g.fillText(label, mx(p.x) + 6, mz(p.z) + 3);
    }
    mark(lm.garage, '#ff7a2e', 'GARAGE');
    mark(lm.bank, '#2e6fb0', 'BANK');
    mark(lm.warehouse, '#5a7a5a', 'DOCKS');
    mark(lm.hospital, '#ffffff', 'HOSP');
    // mission beacon
    var m = SV.missions ? SV.missions.current() : null;
    if (m && SV.missions.state === 'run') {
      var t = m.target();
      var pulse = 5 + Math.sin(performance.now() / 200) * 2;
      g.fillStyle = '#ffd94a';
      g.beginPath(); g.arc(mx(t.x), mz(t.z), pulse, 0, 6.29); g.fill();
      g.strokeStyle = '#ffd94a'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(mx(t.x), mz(t.z), pulse + 4, 0, 6.29); g.stroke();
    }
    // traffic + police
    SV.vehicles.allCars().forEach(function (c) {
      if (c.driver === 'player') return;
      g.fillStyle = c.kind === 'police' ? '#ff4444' : '#d8d8d8';
      g.fillRect(mx(c.x) - 1.5, mz(c.z) - 1.5, 3, 3);
    });
    // player arrow (rotates with facing)
    var p = SV.player.position();
    var a = SV.player.facing();
    g.save();
    g.translate(mx(p.x), mz(p.z));
    g.rotate(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI);
    g.fillStyle = '#7dff9a';
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
    g.restore();
    // view cone border
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  SV.hud = {
    init: init, showHud: showHud, update: update, toast: toast,
    flashWanted: flashWanted, flashDamage: flashDamage,
    setObjective: setObjective, setObjectiveDist: setObjectiveDist
  };
})();

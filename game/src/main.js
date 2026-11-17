// main.js — Sunvale Heat bootstrap, game loop and state machine.
// URL staging for screenshots: ?scene=chase|street|mission&autostart=1
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;

  SV.state = 'menu';
  SV.cash = 0;
  SV.rep = 0;
  SV.health = 100;
  SV.day = 1;
  SV.clockMinutes = 1080; // 18:00 golden hour
  SV.startedAt = Date.now();

  var scene, camera, renderer, clock;
  var saveTimer = 0;
  var frameCount = 0;
  var params = new URLSearchParams(window.location.search);
  var sceneParam = params.get('scene') || '';
  var autostart = params.get('autostart') === '1';

  function boot() {
    var canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(26, 12, 90);
    clock = new THREE.Clock();

    SV.cityBuild(scene);
    SV.police.init(scene);
    SV.combat.init(scene);
    SV.missions.init(scene);
    SV.vehicles.spawnTraffic(scene, 12);
    SV.vehicles.spawnParked(scene, 14);
    SV.peds.spawn(scene, 16);
    SV.player.init(scene, camera, 26, 60);
    SV.hud.init();

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    bindButtons();
    document.getElementById('loading').style.display = 'none';
    refreshMenu();
    if (autostart) startGame(false);
    if (sceneParam === 'menu') { /* stay on the start screen */ }
    animate();
  }

  function refreshMenu() {
    var save = SV.save.read();
    var btn = document.getElementById('btn-continue');
    if (save) {
      btn.classList.remove('hidden');
      document.getElementById('continue-label').textContent =
        U.fmtMoney(save.cash) + ' · MISSION ' + (save.missionIndex + 1) + ' · DAY ' + (save.day || 1);
    } else {
      btn.classList.add('hidden');
    }
    // mark completed missions on the start screen list
    if (save && save.missionIndex > 0) {
      var rows = document.querySelectorAll('#mission-list span');
      for (var i = 0; i < rows.length && i < save.missionIndex; i++) {
        rows[i].className = 'done';
        rows[i].textContent = '✓ ' + rows[i].textContent;
      }
      if (rows[save.missionIndex]) rows[save.missionIndex].className = 'next';
    }
  }

  function bindButtons() {
    document.getElementById('btn-start').addEventListener('click', function () { startGame(true); });
    document.getElementById('btn-continue').addEventListener('click', function () { startGame(false); });
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-save-quit').addEventListener('click', function () {
      SV.save.write();
      showScreen('start-screen');
      SV.state = 'menu';
      SV.hud.showHud(false);
      refreshMenu();
    });
    document.getElementById('btn-busted').addEventListener('click', function () {
      showScreen(null);
      respawnAfterArrest();
    });
    document.getElementById('btn-wasted').addEventListener('click', function () {
      showScreen(null);
      respawnAfterHospital();
    });
    document.getElementById('btn-freeroam').addEventListener('click', function () {
      showScreen(null);
      SV.state = 'playing';
      SV.hud.showHud(true);
      SV.hud.setObjective('FREE ROAM', 'Story complete. Sunvale is yours — steal, race, explore.', '');
    });
    document.getElementById('btn-restart-story').addEventListener('click', function () {
      SV.save.clear();
      SV.cash = 0; SV.rep = 0;
      SV.missions.index = 0;
      startGame(true);
    });
  }

  function showScreen(id) {
    ['start-screen', 'pause-screen', 'busted-screen', 'wasted-screen', 'complete-screen'].forEach(function (s) {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    });
  }

  function startGame(fresh) {
    SV.audio.unlock();
    var save = fresh ? null : SV.save.read();
    if (save) {
      SV.cash = save.cash || 0;
      SV.rep = save.rep || 0;
      SV.health = save.health || 100;
      SV.day = save.day || 1;
      SV.player.setPosition(save.x || 26, save.z || 60);
      SV.missions.index = save.missionIndex || 0;
    } else {
      SV.cash = 0; SV.rep = 0; SV.health = 100; SV.day = 1;
      SV.player.setPosition(26, 60);
      SV.missions.index = 0;
    }
    SV.police.clearWanted();
    showScreen(null);
    SV.hud.showHud(true);
    SV.state = 'playing';
    // staged scenes start at a mission that shows the most systems at once
    if (sceneParam === 'chase') SV.missions.index = 2;       // Heat Check: 2★ chase
    if (sceneParam === 'mission') SV.missions.index = 3;     // Warehouse Bust: shootout
    if (SV.missions.index < SV.missions.list.length) SV.missions.startNext();
    else SV.hud.setObjective('FREE ROAM', 'Story complete. Sunvale is yours.', '');
    if (sceneParam === 'chase' || sceneParam === 'street' || sceneParam === 'mission') {
      SV.player.stageForShot(sceneParam);
    }
    SV.save.write();
  }

  function pauseGame() {
    if (SV.state !== 'playing') return;
    SV.state = 'paused';
    showScreen('pause-screen');
    document.getElementById('pause-stats').textContent =
      'Cash ' + U.fmtMoney(SV.cash) + ' · Missions ' + SV.missions.doneCount() + '/5 · Day ' + SV.day +
      ' · Wanted ' + SV.police.wanted + '★';
    SV.save.write();
  }
  function resumeGame() {
    if (SV.state !== 'paused') return;
    SV.state = 'playing';
    showScreen(null);
  }

  function respawnAfterArrest() {
    var fine = Math.min(SV.cash, 400);
    SV.cash -= fine;
    SV.health = 100;
    SV.player.setPosition(SV.city.landmarks.hospital.x, SV.city.landmarks.hospital.z + 26);
    SV.state = 'playing';
    SV.hud.showHud(true);
    SV.hud.toast('Bail paid: -' + U.fmtMoney(fine) + '. Stay clean, Jace.');
    SV.save.write();
  }
  function respawnAfterHospital() {
    var bill = Math.min(SV.cash, 300);
    SV.cash -= bill;
    SV.health = 100;
    SV.player.setPosition(SV.city.landmarks.hospital.x, SV.city.landmarks.hospital.z + 26);
    SV.state = 'playing';
    SV.hud.showHud(true);
    SV.hud.toast('Hospital bill: -' + U.fmtMoney(bill));
    SV.save.write();
  }

  function busted() {
    if (SV.state !== 'playing') return;
    SV.state = 'busted';
    SV.police.clearWanted();
    SV.audio.missionFail();
    showScreen('busted-screen');
    SV.hud.showHud(false);
  }
  function wasted() {
    if (SV.state !== 'playing') return;
    SV.state = 'wasted';
    SV.police.clearWanted();
    SV.audio.missionFail();
    showScreen('wasted-screen');
    SV.hud.showHud(false);
  }
  function storyComplete() {
    SV.state = 'complete';
    document.getElementById('complete-text').textContent =
      'Five jobs. One clean getaway. Jace paid Mara Voss every cent and drove into the sunset with ' +
      U.fmtMoney(SV.cash) + ' in his pocket. Sunvale is yours now — free roam forever.';
    showScreen('complete-screen');
    SV.hud.showHud(false);
    SV.save.write();
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    frameCount++;
    if (frameCount === 90) window.__shotReady = true;
    if (SV.state === 'playing') {
      SV.clockMinutes += dt * 0.6;
      if (SV.clockMinutes >= 1440) { SV.clockMinutes -= 1440; SV.day++; }
      var p = SV.player.position();
      SV.player.update(dt);
      SV.vehicles.updateTraffic(dt);
      SV.peds.update(dt, p, SV.police.wanted > 0 ? p : null);
      SV.police.update(dt, SV.player.position(), !!SV.player.currentCar(), 0);
      SV.combat.update(dt);
      SV.missions.update(dt, SV.player.position());
      SV.hud.update(dt);
      // audio beds
      SV.audio.siren(SV.police.wanted > 0);
      // global keys
      if (SV.input.wasPressed('KeyP') || SV.input.wasPressed('Escape')) pauseGame();
      if (SV.input.wasPressed('KeyM')) {
        if (SV.missions.failState()) SV.missions.tryRestart();
        else {
          var m = SV.missions.current();
          SV.hud.toast(m ? m.title + ' — ' + m.brief : 'Story complete — free roam!');
        }
      }
      if (SV.input.wasPressed('KeyN')) SV.audio.setMuted(!(SV._muted = !SV._muted));
      saveTimer += dt;
      if (saveTimer > 20) { saveTimer = 0; SV.save.write(); }
    } else if (SV.state === 'menu') {
      // slow attract-mode orbit over the city behind the start screen
      var t = performance.now() / 1000;
      camera.position.set(120 * Math.cos(t * 0.05), 55, 120 * Math.sin(t * 0.05));
      camera.lookAt(0, 0, 40);
      SV.vehicles.updateTraffic(dt);
      SV.peds.update(dt, { x: 9999, z: 9999 }, null);
    } else if (SV.state === 'paused') {
      // frozen
    }
    SV.input.endFrame();
    renderer.render(scene, camera);
  }

  SV.main = { busted: busted, wasted: wasted, storyComplete: storyComplete, startGame: startGame };
  window.__SV = SV;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

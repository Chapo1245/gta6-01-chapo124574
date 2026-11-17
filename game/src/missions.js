// missions.js — five story missions for Jace Rivera, with waypoints, timers and guards.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var sceneRef = null;
  var guards = [];
  var beacon = null;
  var beaconRing = null;

  var MISSIONS = [
    {
      id: 'first-wheels', title: 'MISSION 1 — FIRST WHEELS', name: 'First Wheels',
      brief: 'Mara Voss wants wheels. Steal any car (E) and bring it to Mara\'s Garage.',
      objective: 'Steal a car and drive it to Mara\'s Garage',
      target: function () { return SV.city.landmarks.garage; },
      reward: 500,
      onStart: function () { SV.hud.toast('Mara: "Get me a ride, Jace. Any ride."'); },
      check: function (st) {
        var car = SV.player.currentCar();
        if (car && U.dist2D(car.x, car.z, SV.city.landmarks.garage.x, SV.city.landmarks.garage.z) < 22) return 'done';
        return 'run';
      }
    },
    {
      id: 'sunset-run', title: 'MISSION 2 — SUNSET RUN', name: 'Sunset Run',
      brief: 'A package for the docks. Drive to the beach pier before the timer runs out — 100 seconds.',
      objective: 'Deliver the package to the Pier in 100 seconds',
      target: function () { return SV.city.landmarks.pier; },
      reward: 900, timeLimit: 100,
      onStart: function () { SV.hud.toast('Mara: "Pier. Sunset. Don\'t be late."'); },
      check: function (st) {
        var p = SV.player.position();
        if (U.dist2D(p.x, p.z, SV.city.landmarks.pier.x, SV.city.landmarks.pier.z) < 12) return 'done';
        if (st.elapsed > 100) return 'fail';
        return 'run';
      }
    },
    {
      id: 'heat-check', title: 'MISSION 3 — HEAT CHECK', name: 'Heat Check',
      brief: 'The PD is onto you. Reach 2 wanted stars, then lose them completely.',
      objective: 'Reach 2★ wanted, then lose the police',
      target: function () { return { x: 26, z: 26 }; },
      reward: 1200,
      onStart: function () { SV.police.addWanted(2, 'Mara set you up'); SV.hud.toast('Mara: "Shake them, Jace. All of them."'); },
      check: function (st) {
        if (st.elapsed > 5 && SV.police.wanted === 0 && st.sawHeat) return 'done';
        if (SV.police.wanted >= 2) st.sawHeat = true;
        if (st.elapsed > 150) return 'fail';
        return 'run';
      }
    },
    {
      id: 'warehouse-bust', title: 'MISSION 4 — WAREHOUSE BUST', name: 'Warehouse Bust',
      brief: 'Dock 9 is guarded. Take out the 4 guards (click to shoot), grab the crate, bring it to Mara.',
      objective: 'Clear the Dock 9 guards, then grab the crate',
      target: function () { return SV.city.landmarks.warehouse; },
      reward: 2000,
      onStart: function () {
        spawnGuards(SV.city.landmarks.warehouse.x, SV.city.landmarks.warehouse.z, 4);
        SV.hud.toast('Guards at Dock 9 — take them down.');
      },
      check: function (st) {
        var alive = guards.filter(function (g) { return g.alive; }).length;
        if (alive === 0 && !st.crateTaken) {
          var p = SV.player.position();
          if (U.dist2D(p.x, p.z, SV.city.landmarks.warehouse.x, SV.city.landmarks.warehouse.z) < 20) {
            st.crateTaken = true;
            SV.audio.pickup();
            SV.hud.toast('Crate secured! Take it to Mara\'s Garage.');
          }
        }
        if (st.crateTaken) {
          var car = SV.player.currentCar();
          var p2 = SV.player.position();
          if (U.dist2D(p2.x, p2.z, SV.city.landmarks.garage.x, SV.city.landmarks.garage.z) < 22) return 'done';
        }
        if (st.elapsed > 300) return 'fail';
        return 'run';
      }
    },
    {
      id: 'big-score', title: 'MISSION 5 — THE BIG SCORE', name: 'The Big Score',
      brief: 'One last job: hit Sunvale Bank, grab the cash, lose a 3-star wanted level, deliver to Mara. Then you\'re free.',
      objective: 'Rob Sunvale Bank, escape 3★ heat, deliver to Mara',
      target: function () { return SV.city.landmarks.bank; },
      reward: 5000,
      onStart: function () { SV.hud.toast('Mara: "The bank. Then we\'re even, Jace."'); },
      check: function (st) {
        var p = SV.player.position();
        if (!st.robbed && U.dist2D(p.x, p.z, SV.city.landmarks.bank.x, SV.city.landmarks.bank.z) < 18) {
          st.robbed = true;
          SV.police.addWanted(3, 'Bank robbery!');
          SV.cash += 2500;
          SV.audio.cashSound();
          SV.hud.toast('Cash grabbed! Now lose the cops, then reach Mara.');
        }
        if (st.robbed && st.sawHeat && SV.police.wanted === 0 &&
            U.dist2D(p.x, p.z, SV.city.landmarks.garage.x, SV.city.landmarks.garage.z) < 22) return 'done';
        if (SV.police.wanted >= 3) st.sawHeat = true;
        if (st.elapsed > 300) return 'fail';
        return 'run';
      }
    }
  ];

  var index = 0;        // current mission index (0..4), 5 = story complete
  var state = 'idle';   // idle | run | done | fail
  var st = {};          // per-mission scratch state
  var elapsed = 0;

  function init(scene) {
    sceneRef = scene;
    var geo = new THREE.CylinderGeometry(3, 3, 46, 20, 1, true);
    var mat = new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    beacon = new THREE.Mesh(geo, mat);
    beacon.visible = false;
    scene.add(beacon);
    var ringGeo = new THREE.RingGeometry(4, 6, 32);
    beaconRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.visible = false;
    scene.add(beaconRing);
  }

  function current() { return MISSIONS[index] || null; }
  function doneCount() { return Math.min(index, MISSIONS.length); }
  function isComplete() { return index >= MISSIONS.length; }

  function startMission(i) {
    index = i;
    state = 'run';
    st = { elapsed: 0, sawHeat: false, crateTaken: false, robbed: false };
    elapsed = 0;
    var m = current();
    if (m) {
      m.onStart();
      SV.hud.setObjective(m.title, m.objective, m.brief);
      moveBeacon();
    }
  }
  function startNext() { startMission(index); }
  function restartCurrent() { startMission(index); }

  function moveBeacon() {
    var m = current();
    if (!m || state !== 'run') { beacon.visible = false; beaconRing.visible = false; return; }
    var t = m.target();
    beacon.position.set(t.x, 23, t.z);
    beaconRing.position.set(t.x, 0.15, t.z);
    beacon.visible = true; beaconRing.visible = true;
  }

  function spawnGuards(x, z, n) {
    clearGuards();
    for (var i = 0; i < n; i++) {
      var g = new THREE.Group();
      var dark = new THREE.MeshLambertMaterial({ color: 0x3a2a2a });
      var skin = new THREE.MeshLambertMaterial({ color: 0xd8a878 });
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.42), dark);
      body.position.y = 1.15; g.add(body);
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
      head.position.y = 1.85; g.add(head);
      var gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      gun.position.set(0.4, 1.2, -0.4); g.add(gun);
      var gx = x + U.rand(-16, 16), gz = z + U.rand(-16, 16);
      if (SV.city.hitsBuilding(gx, gz, 2)) { gx = x + 18; gz = z + 18; }
      g.position.set(gx, 0, gz);
      sceneRef.add(g);
      guards.push({ group: g, x: gx, z: gz, angle: U.rand(0, 6.28), hp: 50, alive: true, shootCd: U.rand(1, 2), phase: U.rand(0, 6) });
    }
  }
  function clearGuards() {
    for (var i = 0; i < guards.length; i++) sceneRef.remove(guards[i].group);
    guards = [];
  }
  function nearestGuard(x, z, maxDist) {
    var best = null, bd = maxDist;
    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      if (!g.alive) continue;
      var d = U.dist2D(x, z, g.x, g.z);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }
  function damageGuard(g, dmg) {
    g.hp -= dmg;
    if (g.hp <= 0 && g.alive) {
      g.alive = false;
      g.group.rotation.x = -Math.PI / 2;
      g.group.position.y = 0.4;
      SV.cash += 50;
      SV.hud.toast('Guard down — $50');
      SV.audio.pickup();
    }
  }

  function update(dt, playerPos) {
    if (state !== 'run') return;
    var m = current();
    if (!m) return;
    st.elapsed += dt;
    elapsed = st.elapsed;
    // guards patrol and shoot at the player
    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      if (!g.alive) continue;
      var d = U.dist2D(g.x, g.z, playerPos.x, playerPos.z);
      g.shootCd -= dt;
      if (d < 30 && g.shootCd <= 0) {
        g.shootCd = U.rand(1.2, 2.2);
        SV.combat.damagePlayer(U.rand(5, 10));
        SV.hud.toast('Guard fired at you!');
      }
      if (d < 26) {
        var a = Math.atan2(playerPos.x - g.x, playerPos.z - g.z);
        g.angle = U.angleLerp(g.angle, a, Math.min(1, dt * 4));
        g.group.rotation.y = g.angle;
      }
    }
    var result = m.check(st);
    if (result === 'done') {
      state = 'done';
      SV.cash += m.reward;
      SV.rep = (SV.rep || 0) + 10;
      SV.audio.missionDone();
      SV.hud.toast('MISSION COMPLETE — +' + U.fmtMoney(m.reward));
      SV.hud.setObjective('MISSION COMPLETE', m.name + ' done. +' + U.fmtMoney(m.reward), 'Talk to Mara for the next job.');
      beacon.visible = false; beaconRing.visible = false;
      clearGuards();
      index++;
      SV.save.write();
      if (index >= MISSIONS.length) {
        SV.main.storyComplete();
      } else {
        setTimeout(function () { if (SV.state === 'playing') startMission(index); }, 3500);
      }
    } else if (result === 'fail') {
      state = 'fail';
      SV.audio.missionFail();
      SV.hud.toast('MISSION FAILED — try again (M)');
      beacon.visible = false; beaconRing.visible = false;
      clearGuards();
    }
    // HUD distance to target
    var t = m.target();
    var dd = U.dist2D(playerPos.x, playerPos.z, t.x, t.z);
    var m2 = current();
    if (m2) SV.hud.setObjectiveDist(Math.round(dd) + 'm to target' + (m.timeLimit ? ' · ' + Math.max(0, Math.ceil(m.timeLimit - st.elapsed)) + 's left' : ''));
  }

  function failState() { return state === 'fail'; }
  function tryRestart() { if (state === 'fail') startMission(index); }

  SV.missions = {
    init: init, update: update, startNext: startNext, restartCurrent: restartCurrent,
    tryRestart: tryRestart, current: current, doneCount: doneCount, isComplete: isComplete,
    get index() { return index; },
    set index(v) { index = v; },
    get state() { return state; },
    get guards() { return guards; }, nearestGuard: nearestGuard, damageGuard: damageGuard,
    list: MISSIONS
  };
})();

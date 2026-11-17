// police.js — wanted stars, Sunvale PD pursuit (cars + foot officers), bust logic.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var officers = [];
  var sceneRef = null;
  var wanted = 0;
  var heat = 0;            // 0..100, fills while police see the player
  var decayTimer = 0;
  var bustTimer = 0;
  var spawnTimer = 0;
  var maxPoliceCars = 0;

  function addWanted(stars, reason) {
    if (wanted >= 5) return;
    wanted = Math.min(5, wanted + stars);
    heat = Math.min(100, heat + 25 * stars);
    if (reason) SV.hud.toast('★ WANTED ' + wanted + ' — ' + reason);
    SV.hud.flashWanted();
    if (wanted >= 2) SV.audio.sirenWhoop();
    updateMaxPolice();
  }
  function updateMaxPolice() {
    maxPoliceCars = wanted === 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : 6;
  }
  function clearWanted() {
    wanted = 0; heat = 0; bustTimer = 0;
    updateMaxPolice();
    // despawn all police
    var cars = SV.vehicles.police.slice();
    for (var i = 0; i < cars.length; i++) SV.vehicles.removePoliceCar(cars[i]);
    for (var j = 0; j < officers.length; j++) sceneRef.remove(officers[j].group);
    officers = [];
  }

  function makeOfficerModel() {
    var g = new THREE.Group();
    var navy = new THREE.MeshLambertMaterial({ color: 0x1a2a5a });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.42), navy);
    body.position.y = 1.15; g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
    head.position.y = 1.85; g.add(head);
    var hat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), new THREE.MeshLambertMaterial({ color: 0x0a1430 }));
    hat.position.y = 2.1; g.add(hat);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), navy);
    legL.position.set(-0.18, 0.35, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    g.userData.legs = [legL, legR];
    return g;
  }

  function init(scene) { sceneRef = scene; }

  function spawnOfficerNear(x, z) {
    var model = makeOfficerModel();
    var a = U.rand(0, Math.PI * 2);
    var px = x + Math.cos(a) * U.rand(12, 20), pz = z + Math.sin(a) * U.rand(12, 20);
    model.position.set(px, 0, pz);
    sceneRef.add(model);
    officers.push({ group: model, x: px, z: pz, angle: 0, hp: 60, phase: U.rand(0, 6), shootCd: 0 });
  }

  // Called every frame while playing.
  function update(dt, playerPos, inCar, playerSpeed) {
    if (wanted <= 0) return;
    decayTimer += dt;
    // Wanted decays slowly when no police is near.
    var nearestPolice = 999;
    for (var i = 0; i < SV.vehicles.police.length; i++) {
      nearestPolice = Math.min(nearestPolice, U.dist2D(playerPos.x, playerPos.z, SV.vehicles.police[i].x, SV.vehicles.police[i].z));
    }
    for (var j = 0; j < officers.length; j++) {
      nearestPolice = Math.min(nearestPolice, U.dist2D(playerPos.x, playerPos.z, officers[j].x, officers[j].z));
    }
    if (nearestPolice > 70 && decayTimer > 18) {
      wanted = Math.max(0, wanted - 1);
      decayTimer = 0;
      updateMaxPolice();
      SV.hud.toast(wanted === 0 ? 'You lost the cops. Heat off.' : 'Wanted level dropped to ' + wanted + ' ★');
      if (wanted === 0) clearWanted();
    }
    if (wanted === 0) return;

    // spawn police cars up to the wanted cap
    spawnTimer -= dt;
    if (spawnTimer <= 0 && SV.vehicles.police.length < maxPoliceCars) {
      var a = U.rand(0, Math.PI * 2);
      var r = U.rand(45, 70);
      var p = SV.city.randomRoadPoint();
      var sx = U.clamp(playerPos.x + Math.cos(a) * r, -240, 240);
      var sz = U.clamp(playerPos.z + Math.sin(a) * r, -240, 260);
      var car = SV.vehicles.spawnPoliceCar(sx, sz);
      car.cruise = 20;
      spawnTimer = 2.5;
    }
    // foot officers appear when the player is on foot and wanted >= 2
    if (!inCar && wanted >= 2 && officers.length < wanted && Math.random() < dt * 0.25) {
      spawnOfficerNear(playerPos.x, playerPos.z);
    }

    // police cars chase and ram
    for (var k = SV.vehicles.police.length - 1; k >= 0; k--) {
      var pc = SV.vehicles.police[k];
      var dx = playerPos.x - pc.x, dz = playerPos.z - pc.z;
      var d = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
      var targetAngle = Math.atan2(-dx, -dz);
      pc.angle = U.angleLerp(pc.angle, targetAngle, Math.min(1, dt * 2.2));
      var targetSpeed = d > 60 ? pc.maxSpeed : pc.maxSpeed * 0.9;
      pc.speed = U.lerp(pc.speed, targetSpeed, Math.min(1, dt * 1.5));
      pc.x += -Math.sin(pc.angle) * pc.speed * dt;
      pc.z += -Math.cos(pc.angle) * pc.speed * dt;
      var fixed = SV.city.collideCircle(pc.x, pc.z, 2.4);
      if (fixed.x !== pc.x || fixed.z !== pc.z) { pc.speed *= 0.3; pc.x = fixed.x; pc.z = fixed.z; }
      SV.vehicles.syncCar(pc, dt);
      // ramming the player
      if (d < 3.2) {
        if (inCar) {
          SV.combat.damagePlayerCar(8 * dt * 10);
          pc.speed *= 0.5;
        } else {
          SV.combat.damagePlayer(14 * dt);
          pc.speed *= 0.4;
        }
      }
      // too far away for too long: despawn and respawn closer
      if (d > 130) SV.vehicles.removePoliceCar(pc);
    }

    // foot officers chase on foot and punch/shoot at close range
    for (var m = officers.length - 1; m >= 0; m--) {
      var off = officers[m];
      var odx = playerPos.x - off.x, odz = playerPos.z - off.z;
      var od = Math.max(0.1, Math.sqrt(odx * odx + odz * odz));
      off.angle = U.angleLerp(off.angle, Math.atan2(odx, odz), Math.min(1, dt * 5));
      var ospeed = od > 3 ? 5.2 : 0;
      off.x += Math.sin(off.angle) * ospeed * dt;
      off.z += Math.cos(off.angle) * ospeed * dt;
      off.phase += dt * ospeed * 3;
      var sw = Math.sin(off.phase) * 0.5;
      off.group.userData.legs[0].rotation.x = sw;
      off.group.userData.legs[1].rotation.x = -sw;
      off.group.position.set(off.x, 0, off.z);
      off.group.rotation.y = off.angle;
      off.shootCd -= dt;
      if (od < 16 && off.shootCd <= 0 && !inCar) {
        off.shootCd = 1.6;
        SV.combat.damagePlayer(U.rand(6, 12));
        SV.hud.toast('Officer fired at you!');
      }
      // bust: officer touches the player on foot
      if (!inCar && od < 1.6) {
        bustTimer += dt;
        if (bustTimer > 1.2) { SV.main.busted(); return; }
      } else if (!inCar && od < 4) {
        bustTimer += dt * 0.5;
      } else {
        bustTimer = Math.max(0, bustTimer - dt);
      }
      if (od > 110) {
        sceneRef.remove(off.group);
        officers.splice(m, 1);
      }
    }
  }

  function nearestOfficer(x, z, maxDist) {
    var best = null, bd = maxDist;
    for (var i = 0; i < officers.length; i++) {
      var o = officers[i];
      var d = U.dist2D(x, z, o.x, o.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function damageOfficer(off, dmg) {
    off.hp -= dmg;
    if (off.hp <= 0) {
      sceneRef.remove(off.group);
      var i = officers.indexOf(off);
      if (i >= 0) officers.splice(i, 1);
      addWanted(1, 'Officer down');
      return true;
    }
    return false;
  }

  SV.police = {
    init: init, update: update, addWanted: addWanted, clearWanted: clearWanted,
    get wanted() { return wanted; },
    set wanted(v) { wanted = v; updateMaxPolice(); },
    nearestOfficer: nearestOfficer, damageOfficer: damageOfficer,
    officers: officers
  };
})();

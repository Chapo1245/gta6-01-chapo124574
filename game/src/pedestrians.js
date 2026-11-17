// pedestrians.js — sidewalk walkers who stroll, chat, and flee from danger.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var peds = [];
  var sceneRef = null;
  var SHIRT_COLORS = [0xe85a5a, 0x5a8ae8, 0x5ac85a, 0xe8c85a, 0xc85ae8, 0x5ad8e8, 0xe8e8e8, 0x8a5a3a];
  var SKIN = [0xe8b88a, 0xc98a5a, 0x8a5a38, 0xf0c8a0];

  function makePedModel() {
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: U.pick(SHIRT_COLORS) });
    var skin = new THREE.MeshLambertMaterial({ color: U.pick(SKIN) });
    var pants = new THREE.MeshLambertMaterial({ color: U.pick([0x2a3a5a, 0x3a3a3a, 0x5a4a3a]) });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
    body.position.y = 1.15; g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
    head.position.y = 1.85; g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), pants);
    legL.position.set(-0.18, 0.35, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), shirt);
    armL.position.set(-0.48, 1.15, 0); g.add(armL);
    var armR = armL.clone(); armR.position.x = 0.48; g.add(armR);
    g.userData.legs = [legL, legR];
    g.userData.arms = [armL, armR];
    return g;
  }

  function spawnPeds(scene, count) {
    sceneRef = scene;
    for (var i = 0; i < count; i++) {
      var p = SV.city.randomSidewalkPoint();
      if (SV.city.hitsBuilding(p.x, p.z, 2)) continue;
      var model = makePedModel();
      model.position.set(p.x, 0, p.z);
      scene.add(model);
      var target = SV.city.randomSidewalkPoint();
      peds.push({
        group: model, x: p.x, z: p.z, angle: U.rand(0, Math.PI * 2),
        tx: target.x, tz: target.z, speed: U.rand(1.2, 2.2),
        state: 'walk', // walk | flee | down
        hp: 100, panic: 0, walkPhase: U.rand(0, 6)
      });
    }
  }

  function updatePeds(dt, playerPos, dangerPos) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (p.state === 'down') continue;
      var dangerD = dangerPos ? U.dist2D(p.x, p.z, dangerPos.x, dangerPos.z) : 999;
      if (dangerD < 14) p.panic = 1;
      p.panic = Math.max(0, p.panic - dt * 0.08);
      var speed = p.speed * (p.panic > 0 ? 3.2 : 1);
      if (p.panic > 0) {
        // run away from the danger
        var dx = p.x - dangerPos.x, dz = p.z - dangerPos.z;
        var d = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
        p.tx = p.x + dx / d * 30; p.tz = p.z + dz / d * 30;
      }
      var dx2 = p.tx - p.x, dz2 = p.tz - p.z;
      var dist = Math.sqrt(dx2 * dx2 + dz2 * dz2);
      if (dist < 2) {
        var t = SV.city.randomSidewalkPoint();
        p.tx = t.x; p.tz = t.z;
      } else {
        var targetAngle = Math.atan2(dx2, dz2);
        p.angle = U.angleLerp(p.angle, targetAngle, Math.min(1, dt * 5));
        p.x += Math.sin(p.angle) * speed * dt;
        p.z += Math.cos(p.angle) * speed * dt;
        var fixed = SV.city.collideCircle(p.x, p.z, 0.6);
        p.x = fixed.x; p.z = fixed.z;
        p.walkPhase += dt * speed * 3;
        var swing = Math.sin(p.walkPhase) * 0.5;
        p.group.userData.legs[0].rotation.x = swing;
        p.group.userData.legs[1].rotation.x = -swing;
        p.group.userData.arms[0].rotation.x = -swing * 0.7;
        p.group.userData.arms[1].rotation.x = swing * 0.7;
      }
      p.group.position.set(p.x, 0, p.z);
      p.group.rotation.y = p.angle;
    }
  }

  // A pedestrian is hit: falls down, drops a little cash, raises wanted level.
  function hitPed(ped, damage) {
    ped.hp -= damage;
    if (ped.hp <= 0 && ped.state !== 'down') {
      ped.state = 'down';
      ped.group.rotation.x = -Math.PI / 2;
      ped.group.position.y = 0.4;
      SV.police.addWanted(1, 'Pedestrian down');
      SV.cash += 25;
      SV.hud.toast('Pedestrian dropped $25');
      SV.audio.pickup();
      return true;
    }
    ped.panic = 1;
    return false;
  }
  function nearestPed(x, z, maxDist) {
    var best = null, bd = maxDist;
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (p.state === 'down') continue;
      var d = U.dist2D(x, z, p.x, p.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  SV.peds = { spawn: spawnPeds, update: updatePeds, hit: hitPed, nearest: nearestPed, list: peds };
})();

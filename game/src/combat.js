// combat.js — shooting, melee, car damage, explosions and player health.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var sceneRef = null;
  var raycaster = null;
  var particles = [];
  var shootCd = 0, punchCd = 0;
  var ammo = 12, magSize = 12, reserve = 60;
  var muzzleTimer = 0;

  function init(scene) {
    sceneRef = scene;
    raycaster = new THREE.Raycaster();
  }

  function spawnParticles(pos, color, count, speed, life) {
    var geo = new THREE.BufferGeometry();
    var verts = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      verts[i * 3] = pos.x; verts[i * 3 + 1] = pos.y; verts[i * 3 + 2] = pos.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    var mat = new THREE.PointsMaterial({ color: color, size: 0.9, map: U.glowTexture(), transparent: true, opacity: 0.95, depthWrite: false });
    var pts = new THREE.Points(geo, mat);
    sceneRef.add(pts);
    var vels = [];
    for (var j = 0; j < count; j++) {
      vels.push({ x: U.rand(-1, 1) * speed, y: U.rand(0.2, 1) * speed, z: U.rand(-1, 1) * speed });
    }
    particles.push({ pts: pts, vels: vels, life: life, age: 0 });
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      var pos = p.pts.geometry.attributes.position;
      for (var j = 0; j < p.vels.length; j++) {
        pos.array[j * 3] += p.vels[j].x * dt;
        pos.array[j * 3 + 1] += p.vels[j].y * dt;
        pos.array[j * 3 + 2] += p.vels[j].z * dt;
        p.vels[j].y -= 6 * dt;
      }
      pos.needsUpdate = true;
      p.pts.material.opacity = Math.max(0, 0.95 * (1 - p.age / p.life));
      if (p.age >= p.life) {
        sceneRef.remove(p.pts);
        p.pts.geometry.dispose();
        particles.splice(i, 1);
      }
    }
  }

  // Hitscan shot from the camera through the crosshair.
  function shoot(camera, fromCar) {
    if (shootCd > 0) return;
    if (ammo <= 0) {
      if (reserve > 0) reload();
      else SV.hud.toast('Out of ammo — find the gun shop at the plaza');
      return;
    }
    shootCd = 0.28;
    ammo--;
    muzzleTimer = 0.06;
    SV.audio.gunshot();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = 90;
    var targets = [];
    var pedGroups = [], offGroups = [], guardGroups = [];
    SV.peds.list.forEach(function (p) { if (p.state !== 'down') pedGroups.push(p.group); });
    SV.police.officers.forEach(function (o) { offGroups.push(o.group); });
    if (SV.missions) SV.missions.guards.forEach(function (g) { if (g.alive) guardGroups.push(g.group); });
    var carGroups = [];
    SV.vehicles.allCars().forEach(function (c) { if (c.driver !== 'player') carGroups.push(c.group); });
    var all = pedGroups.concat(offGroups, guardGroups, carGroups);
    var hits = raycaster.intersectObjects(all, true);
    var hitPoint = null;
    if (hits.length > 0) {
      var h = hits[0];
      hitPoint = h.point.clone();
      var obj = h.object;
      var root = obj;
      while (root.parent && root.parent !== sceneRef) root = root.parent;
      var done = false;
      // pedestrian?
      for (var i = 0; i < SV.peds.list.length && !done; i++) {
        if (SV.peds.list[i].group === root) { SV.peds.hit(SV.peds.list[i], 100); done = true; }
      }
      // officer?
      for (var j = 0; j < SV.police.officers.length && !done; j++) {
        if (SV.police.officers[j].group === root) { SV.police.damageOfficer(SV.police.officers[j], 60); done = true; }
      }
      // mission guard?
      if (SV.missions) {
        for (var k = 0; k < SV.missions.guards.length && !done; k++) {
          var g = SV.missions.guards[k];
          if (g.alive && g.group === root) { SV.missions.damageGuard(g, 50); done = true; }
        }
      }
      // car?
      for (var m = 0; m < SV.vehicles.allCars().length && !done; m++) {
        var c = SV.vehicles.allCars()[m];
        if (c.group === root) {
          c.hp -= 25;
          spawnParticles(hitPoint, 0xffd94a, 6, 4, 0.4);
          if (c.hp <= 0) explodeCar(c);
          done = true;
        }
      }
      if (!done) spawnParticles(hitPoint, 0xcccccc, 5, 3, 0.35);
    } else {
      hitPoint = raycaster.ray.at(80, new THREE.Vector3());
    }
    // tracer line from the player to the hit point
    var from = SV.player.position();
    drawTracer(new THREE.Vector3(from.x, 1.5, from.z), hitPoint);
    SV.police.addWanted(1, 'Shots fired');
  }

  var tracer = null, tracerTimer = 0;
  function drawTracer(from, to) {
    if (tracer) sceneRef.remove(tracer);
    var geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    sceneRef.add(tracer);
    tracerTimer = 0.07;
  }

  function punch() {
    if (punchCd > 0) return;
    punchCd = 0.45;
    SV.audio.punch();
    var p = SV.player.position();
    var facing = SV.player.facing();
    var fx = p.x + Math.sin(facing) * 2.2, fz = p.z + Math.cos(facing) * 2.2;
    var ped = SV.peds.nearest(fx, fz, 2.4);
    if (ped) { SV.peds.hit(ped, 55); return; }
    var off = SV.police.nearestOfficer(fx, fz, 2.4);
    if (off) { SV.police.damageOfficer(off, 40); return; }
    if (SV.missions) {
      var g = SV.missions.nearestGuard(fx, fz, 2.4);
      if (g) SV.missions.damageGuard(g, 45);
    }
  }

  function reload() {
    if (reserve <= 0 || ammo === magSize) return;
    var need = magSize - ammo;
    var take = Math.min(need, reserve);
    ammo += take; reserve -= take;
    SV.hud.toast('Reloaded — ' + ammo + '/' + reserve);
  }

  function explodeCar(car) {
    var pos = new THREE.Vector3(car.x, 1.2, car.z);
    spawnParticles(pos, 0xff7a2e, 40, 12, 1.1);
    spawnParticles(pos, 0x333333, 25, 7, 1.6);
    SV.audio.explosion();
    var p = SV.player.position();
    if (U.dist2D(car.x, car.z, p.x, p.z) < 8) damagePlayer(35);
    car.hp = 100;
    // wrecked car becomes a parked husk
    car.driver = 'parked';
    car.speed = 0;
    if (SV.vehicles.police.indexOf(car) >= 0) SV.vehicles.removePoliceCar(car);
    else {
      var i = SV.vehicles.traffic.indexOf(car);
      if (i >= 0) { SV.vehicles.traffic.splice(i, 1); SV.vehicles.parked.push(car); }
    }
    SV.police.addWanted(1, 'Car exploded');
  }

  function carCrash(car) {
    spawnParticles(new THREE.Vector3(car.x, 1, car.z), 0xffd94a, 10, 5, 0.5);
    SV.audio.doorSlam();
    if (car.driver === 'player') {
      damagePlayerCar(6);
      if (Math.random() < 0.25) SV.police.addWanted(1, 'Reckless driving');
    }
  }

  function damagePlayer(amount) {
    SV.health = Math.max(0, (SV.health || 100) - amount);
    SV.hud.flashDamage();
    if (SV.health <= 0) SV.main.wasted();
  }
  function damagePlayerCar(amount) {
    var car = SV.player.currentCar();
    if (!car) return;
    car.hp -= amount;
    if (car.hp <= 0) explodeCar(car);
  }

  function update(dt) {
    shootCd = Math.max(0, shootCd - dt);
    punchCd = Math.max(0, punchCd - dt);
    muzzleTimer = Math.max(0, muzzleTimer - dt);
    if (tracer) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) { sceneRef.remove(tracer); tracer = null; }
    }
    updateParticles(dt);
    // slow health regen out of combat
    if (SV.health > 0 && SV.health < 100 && SV.police.wanted === 0) {
      SV.health = Math.min(100, SV.health + dt * 2);
    }
  }

  SV.combat = {
    init: init, update: update, shoot: shoot, punch: punch, reload: reload,
    explodeCar: explodeCar, carCrash: carCrash,
    damagePlayer: damagePlayer, damagePlayerCar: damagePlayerCar,
    get ammo() { return ammo; },
    get reserve() { return reserve; },
    addAmmo: function (n) { reserve += n; },
    get muzzle() { return muzzleTimer > 0; }
  };
})();

// vehicles.js — car models, traffic AI and arcade driving physics for Sunvale Heat.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;

  var CAR_COLORS = [0xd43a2e, 0x2e6fb0, 0xe8c832, 0x3a9a5a, 0x8a5ab0, 0xe8e8e8, 0x222831, 0xff7a2e, 0x5ab0c8];
  var trafficCars = [];
  var parkedCars = [];
  var policeCars = [];
  var sceneRef = null;
  var glowTex = null;

  function makeCarModel(color, kind) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x1a2028 });
    var isTruck = kind === 'truck';
    var isSports = kind === 'sports';
    var bodyLen = isTruck ? 5.6 : 4.4;
    var bodyH = isSports ? 0.55 : 0.8;
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.9, bodyH, bodyLen), bodyMat);
    body.position.y = isSports ? 0.55 : 0.75;
    g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, isTruck ? 1.4 : 2.0), darkMat);
    cabin.position.set(0, body.position.y + bodyH / 2 + 0.32, isTruck ? -0.9 : -0.2);
    g.add(cabin);
    if (isTruck) {
      var bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.2), new THREE.MeshLambertMaterial({ color: 0x6a6a6a }));
      bed.position.set(0, 1.05, 1.3);
      g.add(bed);
    }
    var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    var wheelPos = [[-0.95, -1.45], [0.95, -1.45], [-0.95, 1.45], [0.95, 1.45]];
    var wheels = [];
    for (var i = 0; i < 4; i++) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wheelPos[i][0], 0.42, wheelPos[i][1]);
      g.add(w);
      wheels.push(w);
    }
    var headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    var tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    hl.position.set(-0.6, 0.8, -bodyLen / 2 - 0.02); g.add(hl);
    var hr = hl.clone(); hr.position.x = 0.6; g.add(hr);
    var tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    tl.position.set(-0.6, 0.8, bodyLen / 2 + 0.02); g.add(tl);
    var tr = tl.clone(); tr.position.x = 0.6; g.add(tr);
    if (kind === 'taxi') {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd94a }));
      sign.position.set(0, 1.75, -0.2); g.add(sign);
    }
    if (kind === 'police') {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      bar.position.set(0, 1.75, -0.2); g.add(bar);
      g.userData.lightBar = bar;
      g.userData.lightMat = bar.material;
    }
    g.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
    return { group: g, wheels: wheels, bodyLen: bodyLen };
  }

  function makeCar(kind, x, z, angle) {
    var color = kind === 'police' ? 0x111418 : kind === 'taxi' ? 0xffd21e : U.pick(CAR_COLORS);
    var model = makeCarModel(color, kind);
    model.group.position.set(x, 0, z);
    model.group.rotation.y = angle || 0;
    sceneRef.add(model.group);
    var car = {
      group: model.group, wheels: model.wheels, kind: kind || 'sedan', color: color,
      x: x, z: z, angle: angle || 0, speed: 0, hp: 100,
      maxSpeed: kind === 'sports' ? 34 : kind === 'truck' ? 22 : 27,
      accel: kind === 'sports' ? 16 : 12,
      driver: null, // 'player' | 'traffic' | 'parked' | 'police'
      axis: 'x', dir: 1, line: 0, // traffic state
      stuck: 0, smoke: null
    };
    return car;
  }

  function spawnTraffic(scene, count) {
    sceneRef = scene;
    glowTex = U.glowTexture();
    for (var i = 0; i < count; i++) {
      var kind = U.pick(['sedan', 'sedan', 'taxi', 'truck', 'sports', 'sedan']);
      var p = SV.city.randomRoadPoint();
      var axis = Math.random() < 0.5 ? 'x' : 'z';
      var line = axis === 'x' ? p.z : p.x;
      // snap to a road line
      var lines = SV.city.roadLines.filter(function (l) { return l.axis === axis; });
      line = U.pick(lines).at;
      var car = makeCar(kind, axis === 'x' ? p.x : line, axis === 'x' ? line : p.z, axis === 'x' ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
      car.driver = 'traffic';
      car.axis = axis;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      car.angle = car.axis === 'x' ? (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (car.dir > 0 ? Math.PI : 0);
      car.group.rotation.y = car.angle;
      car.line = line;
      car.cruise = U.rand(8, 13);
      trafficCars.push(car);
    }
  }

  function spawnParked(scene, count) {
    for (var i = 0; i < count; i++) {
      var p = SV.city.randomRoadPoint();
      var axis = Math.random() < 0.5 ? 'x' : 'z';
      var lines = SV.city.roadLines.filter(function (l) { return l.axis === axis; });
      var line = U.pick(lines).at;
      var off = U.pick([-8.5, 8.5]);
      var x = axis === 'x' ? p.x : line + off;
      var z = axis === 'x' ? line + off : p.z;
      if (SV.city.hitsBuilding(x, z, 3)) continue;
      var car = makeCar(U.pick(['sedan', 'sedan', 'sports', 'truck']), x, z, axis === 'x' ? 0 : Math.PI / 2);
      car.driver = 'parked';
      parkedCars.push(car);
    }
  }

  function spawnPoliceCar(x, z) {
    var car = makeCar('police', x, z, 0);
    car.driver = 'police';
    car.maxSpeed = 31;
    policeCars.push(car);
    return car;
  }
  function removePoliceCar(car) {
    sceneRef.remove(car.group);
    var i = policeCars.indexOf(car);
    if (i >= 0) policeCars.splice(i, 1);
  }

  function allCars() { return trafficCars.concat(parkedCars, policeCars); }

  function nearestCar(x, z, maxDist, includeParked) {
    var best = null, bestD = maxDist;
    var list = trafficCars.concat(policeCars);
    if (includeParked !== false) list = list.concat(parkedCars);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.driver === 'player') continue;
      var d = U.dist2D(x, z, c.x, c.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // --- traffic AI -------------------------------------------------------------
  function updateTraffic(dt) {
    for (var i = 0; i < trafficCars.length; i++) {
      var c = trafficCars[i];
      // slow down if a car is close ahead
      var ahead = 0;
      for (var j = 0; j < trafficCars.length; j++) {
        if (i === j) continue;
        var o = trafficCars[j];
        var dx = o.x - c.x, dz = o.z - c.z;
        var fwd = c.axis === 'x' ? dx * c.dir : dz * c.dir;
        var side = c.axis === 'x' ? Math.abs(dz) : Math.abs(dx);
        if (fwd > 0 && fwd < 9 && side < 3) ahead = Math.max(ahead, 1 - fwd / 9);
      }
      var target = c.cruise * (1 - ahead * 0.9);
      c.speed = U.lerp(c.speed, target, Math.min(1, dt * 2));
      var step = c.speed * c.dir * dt;
      if (c.axis === 'x') c.x += step; else c.z += step;
      // at an intersection, sometimes turn
      var nearLine = nearestRoadLine(c.axis === 'x' ? c.z : c.x);
      var along = c.axis === 'x' ? c.x : c.z;
      var frac = ((along % 52) + 52) % 52;
      if (frac < 1.2 || frac > 50.8) {
        if (Math.random() < 0.012) {
          c.axis = c.axis === 'x' ? 'z' : 'x';
          c.dir = Math.random() < 0.5 ? 1 : -1;
          c.line = nearLine;
        }
      }
      // wrap around the world edge
      var W = SV.city.worldHalf;
      if (c.x > W + 10) c.x = -W - 10;
      if (c.x < -W - 10) c.x = W + 10;
      if (c.z > W + 10) c.z = -W - 10;
      if (c.z < -W - 10) c.z = W + 10;
      c.angle = U.angleLerp(c.angle, c.axis === 'x' ? (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.dir > 0 ? Math.PI : 0), Math.min(1, dt * 4));
      syncCar(c, dt);
    }
  }
  function nearestRoadLine(v) {
    var best = 0, bd = 1e9;
    for (var i = -5; i <= 5; i++) {
      var d = Math.abs(v - i * 52);
      if (d < bd) { bd = d; best = i * 52; }
    }
    return best;
  }

  // --- player driving ----------------------------------------------------------
  // Returns new speed; handles accel, steering, building + car collisions.
  function driveCar(car, input, dt) {
    var accelIn = -input.z; // W = forward (-z in input space)
    var steerIn = input.x;
    var handbrake = SV.input.isDown('Space');
    if (accelIn > 0) car.speed += car.accel * dt * (SV.input.run() ? 1.35 : 1);
    else if (accelIn < 0) car.speed -= car.accel * 0.9 * dt;
    else car.speed = U.lerp(car.speed, 0, Math.min(1, dt * 0.8));
    if (handbrake) car.speed = U.lerp(car.speed, 0, Math.min(1, dt * 4));
    car.speed = U.clamp(car.speed, -car.maxSpeed * 0.45, car.maxSpeed);
    var steer = steerIn * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8) * (handbrake ? 1.6 : 1);
    car.angle += steer * 1.9 * dt * (car.speed >= 0 ? 1 : -1) * -1;
    // model front is local -Z, so world forward is (-sin, -cos) of the angle
    var fx = -Math.sin(car.angle), fz = -Math.cos(car.angle);
    car.x += fx * car.speed * dt;
    car.z += fz * car.speed * dt;
    // building collision
    var fixed = SV.city.collideCircle(car.x, car.z, 2.4);
    if (fixed.x !== car.x || fixed.z !== car.z) {
      if (Math.abs(car.speed) > 6) { SV.combat.carCrash(car); }
      car.speed *= 0.4;
      car.x = fixed.x; car.z = fixed.z;
    }
    var cl = SV.city.clampToWorld(car.x, car.z);
    car.x = cl.x; car.z = cl.z;
    // car-vs-car bumps
    var others = allCars();
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (o === car || o.driver === 'player') continue;
      var d = U.dist2D(car.x, car.z, o.x, o.z);
      if (d < 3.4 && d > 0.01) {
        var push = (3.4 - d) / 2;
        var nx = (car.x - o.x) / d, nz = (car.z - o.z) / d;
        car.x += nx * push; car.z += nz * push;
        if (o.driver === 'traffic' || o.driver === 'parked') { o.x -= nx * push; o.z -= nz * push; }
        if (Math.abs(car.speed) > 8) {
          SV.combat.carCrash(car);
          if (o.driver === 'traffic') o.speed = Math.max(0, o.speed - 4);
        }
        car.speed *= 0.75;
      }
    }
    syncCar(car, dt);
    return car.speed;
  }

  function syncCar(car, dt) {
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.angle;
    // wheel spin
    var spin = (car.speed || 0) * (dt || 0.016) / 0.42;
    for (var i = 0; i < car.wheels.length; i++) car.wheels[i].rotation.x += spin;
    // police light bar flash
    if (car.kind === 'police' && car.group.userData.lightMat) {
      var on = Math.floor(performance.now() / 280) % 2 === 0;
      car.group.userData.lightMat.color.setHex(on ? 0xff2222 : 0x2244ff);
    }
  }

  SV.vehicles = {
    spawnTraffic: spawnTraffic, spawnParked: spawnParked, spawnPoliceCar: spawnPoliceCar,
    removePoliceCar: removePoliceCar, nearestCar: nearestCar, allCars: allCars,
    updateTraffic: updateTraffic, driveCar: driveCar, syncCar: syncCar,
    traffic: trafficCars, parked: parkedCars, police: policeCars
  };
})();

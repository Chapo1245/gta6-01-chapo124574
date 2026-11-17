// Sunvale Heat — vehicles: traffic AI, parked cars, driving (fresh code, round 2).
// Arcade driving: accelerate/brake, steering that tightens with speed,
// handbrake drift, boost, collisions with buildings/cars/peds, damage and
// explosions. Traffic follows the street grid; parked cars are stealable.
var Vehicles = {
  palette: [0xc0392b, 0x2e6db4, 0x27ae60, 0xe67e22, 0x8e44ad, 0x95a5a6, 0x1a1a1a, 0xecf0f1, 0x16a085, 0xd35400],
  taxiColor: 0xf7c600,

  makeCar: function (color, kind) {
    var group = new THREE.Group();
    var body = boxMesh(2.1, 0.62, 4.4, color, 0, 0.55, 0);
    var cabin = boxMesh(1.8, 0.6, 2.2, 0x222a33, 0, 1.12, -0.25);
    var nose = boxMesh(1.9, 0.4, 0.6, color, 0, 0.5, 2.2);
    group.add(body, cabin, nose);
    var wheels = [];
    var wg = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
    var wm = new THREE.MeshLambertMaterial({ color: 0x111111 });
    var spots = [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]];
    for (var i = 0; i < 4; i++) {
      var w = new THREE.Mesh(wg, wm);
      w.rotation.z = Math.PI / 2;
      w.position.set(spots[i][0], 0.38, spots[i][1]);
      group.add(w);
      wheels.push(w);
    }
    // Headlights + taillights.
    for (var s = -1; s <= 1; s += 2) {
      var h = boxMesh(0.34, 0.18, 0.1, 0xfff6c8, s * 0.7, 0.62, 2.51);
      group.add(h);
      var t = boxMesh(0.34, 0.18, 0.1, 0xff2a22, s * 0.7, 0.62, -2.21);
      group.add(t);
    }
    var sh = new THREE.Mesh(
      new THREE.CircleGeometry(1.9, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.scale.set(1, 2.1, 1);
    sh.position.y = 0.04;
    group.add(sh);
    var car = {
      group: group, wheels: wheels, kind: kind || "traffic",
      pos: group.position, yaw: 0, speed: 0, steer: 0,
      color: color, hp: 100, dead: false, route: null,
      boost: 100, brakeLight: false
    };
    return car;
  },

  spawn: function (scene) {
    // Parked cars along curbs (stealable).
    var parkedSpots = [];
    for (var k = 0; k < 14; k++) {
      var street = randi(-4, 4) * GRID;
      var along = rand(-190, 190);
      var horiz = Math.random() < 0.5;
      var x = horiz ? along : street + 9.5;
      var z = horiz ? street + 9.5 : along;
      if (insideBuilding(x, z, 3)) continue;
      parkedSpots.push({ x: x, z: z, yaw: horiz ? 0 : Math.PI / 2 });
    }
    for (var i = 0; i < parkedSpots.length; i++) {
      var s = parkedSpots[i];
      var taxi = i === 0; // first parked car is the yellow taxi
      var car = this.makeCar(taxi ? this.taxiColor : pick(this.palette), "parked");
      car.pos.set(s.x, 0, s.z);
      car.yaw = s.yaw + (Math.random() < 0.5 ? 0 : Math.PI);
      car.group.rotation.y = car.yaw;
      if (taxi) {
        var sign = boxMesh(0.9, 0.28, 0.5, 0x222222, 0, 1.55, -0.25);
        car.group.add(sign);
        car.isTaxi = true;
      }
      scene.add(car.group);
      SV.cars.push(car);
    }
    // Traffic: 12 AI cars on the grid.
    for (var t = 0; t < 12; t++) {
      var tc = this.makeCar(pick(this.palette), "traffic");
      var ts = randi(-4, 4) * GRID;
      var horiz2 = Math.random() < 0.5;
      tc.pos.set(horiz2 ? rand(-190, 190) : ts, 0, horiz2 ? ts : rand(-190, 190));
      tc.yaw = horiz2 ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
      tc.group.rotation.y = tc.yaw;
      tc.speed = rand(6, 11);
      tc.route = { horiz: horiz2, line: ts, dir: Math.random() < 0.5 ? 1 : -1 };
      scene.add(tc.group);
      SV.cars.push(tc);
    }
  },

  nearestParked: function (maxDist) {
    var p = SV.player.pos, best = null, bd = maxDist;
    for (var i = 0; i < SV.cars.length; i++) {
      var c = SV.cars[i];
      if (c.kind !== "parked" || c.dead) continue;
      var d = dist2(p.x, p.z, c.pos.x, c.pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },

  enterCar: function (car) {
    car.kind = "player";
    SV.car = car;
    SV.player.group.visible = false;
    SV.stats.carsStolen++;
    SV.hud.toast(car.isTaxi ? "Taxi stolen — nice wheels, Jace" : "Car stolen — drive, Jace!");
    if (SV.audio) SV.audio.pickup();
    if (SV.mission) Missions.onEvent("stealCar");
  },

  exitCar: function () {
    var car = SV.car;
    if (!car) return;
    car.kind = "parked";
    car.speed = 0;
    SV.car = null;
    var p = SV.player;
    p.group.visible = true;
    p.pos.set(car.pos.x + Math.sin(car.yaw + Math.PI / 2) * 2.4, 0, car.pos.z + Math.cos(car.yaw + Math.PI / 2) * 2.4);
    p.vel.set(0, 0, 0);
    SV.camYaw = car.yaw;
  },

  explode: function (car) {
    if (car.dead) return;
    car.dead = true;
    car.hp = 0;
    Combat.explosionAt(car.pos.x, car.pos.z, 9);
    car.group.rotation.z = 0.35;
    car.group.position.y = 0.4;
    for (var i = 0; i < car.group.children.length; i++) {
      var ch = car.group.children[i];
      if (ch.material && ch.material.color) ch.material.color.setHex(0x1a1a1a);
    }
    if (SV.car === car) {
      SV.car = null;
      SV.player.group.visible = true;
      SV.player.pos.set(car.pos.x + 3, 0, car.pos.z + 3);
      Player.hurt(35);
    }
    Police.addHeat(0.35, "explosion");
  },

  update: function (dt) {
    for (var i = 0; i < SV.cars.length; i++) {
      var c = SV.cars[i];
      if (c.dead) continue;
      if (c.kind === "player") this.updatePlayerCar(c, dt);
      else if (c.kind === "traffic") this.updateTraffic(c, dt);
      else if (c.kind === "police") Police.updateCar(c, dt);
      c.group.position.copy(c.pos);
      c.group.rotation.y = c.yaw;
      // Wheel spin.
      for (var w = 0; w < c.wheels.length; w++) c.wheels[w].rotation.x += c.speed * dt * 1.4;
    }
  },

  updatePlayerCar: function (c, dt) {
    var k = SV.keys;
    var throttle = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    var steerIn = (k["KeyA"] || k["ArrowLeft"] ? 1 : 0) - (k["KeyD"] || k["ArrowRight"] ? 1 : 0);
    var handbrake = !!(k["Space"]);
    var boost = (k["ShiftLeft"] || k["ShiftRight"]) && c.boost > 0 && throttle > 0;
    var maxSpeed = boost ? 34 : 24;
    var accel = 16 * (boost ? 1.5 : 1);
    if (throttle > 0) c.speed += accel * dt;
    else if (throttle < 0) c.speed -= (c.speed > 0.5 ? 22 : 9) * dt;
    else c.speed -= Math.sign(c.speed) * 6 * dt;
    if (handbrake) c.speed -= Math.sign(c.speed) * 14 * dt;
    c.speed = clamp(c.speed, -9, maxSpeed);
    if (Math.abs(c.speed) < 0.05) c.speed = 0;
    var steerTarget = steerIn * 0.55 * (1 - clamp(Math.abs(c.speed) / 40, 0, 0.55));
    c.steer = lerp(c.steer, steerTarget, 1 - Math.pow(0.001, dt));
    c.yaw += c.steer * (c.speed / 7) * dt * (handbrake ? 1.5 : 1);
    if (boost) c.boost = Math.max(0, c.boost - 26 * dt);
    else c.boost = Math.min(100, c.boost + 6 * dt);
    // Integrate + collisions.
    var nx = c.pos.x + Math.sin(c.yaw) * c.speed * dt;
    var nz = c.pos.z + Math.cos(c.yaw) * c.speed * dt;
    var res = resolveBuildingCollision(nx, nz, 2.1);
    if (res.x !== nx || res.z !== nz) {
      if (Math.abs(c.speed) > 8) { c.hp -= 6; if (SV.audio) SV.audio.noise(0.15, 0.3, 900); }
      c.speed *= 0.45;
    }
    c.pos.x = clamp(res.x, -City.bounds, City.bounds);
    c.pos.z = clamp(res.z, -City.bounds, City.bounds + 40);
    // Car-car bumps.
    for (var j = 0; j < SV.cars.length; j++) {
      var o = SV.cars[j];
      if (o === c || o.dead) continue;
      var d = dist2(c.pos.x, c.pos.z, o.pos.x, o.pos.z);
      if (d < 3.4 && d > 0.01) {
        var push = (3.4 - d) / 2;
        var px = (c.pos.x - o.pos.x) / d, pz = (c.pos.z - o.pos.z) / d;
        c.pos.x += px * push; c.pos.z += pz * push;
        if (o.kind !== "player") { o.pos.x -= px * push; o.pos.z -= pz * push; }
        if (Math.abs(c.speed) > 10) { c.hp -= 4; o.hp -= 4; if (SV.audio) SV.audio.noise(0.12, 0.25, 800); }
        if (o.hp <= 0) this.explode(o);
      }
    }
    // Peds hit by the car.
    for (var p = 0; p < SV.peds.length; p++) {
      var ped = SV.peds[p];
      if (ped.state === "down") continue;
      if (dist2(c.pos.x, c.pos.z, ped.pos.x, ped.pos.z) < 2.2 && Math.abs(c.speed) > 2) {
        Pedestrians.knockDown(ped, c);
      }
    }
    if (c.hp <= 0) this.explode(c);
    if (SV.audio) SV.audio.engine(clamp(Math.abs(c.speed) / 34, 0, 1), true);
  },

  updateTraffic: function (c, dt) {
    var r = c.route;
    // Slow down if a car is right ahead.
    var slow = false;
    for (var i = 0; i < SV.cars.length; i++) {
      var o = SV.cars[i];
      if (o === c || o.dead) continue;
      var dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z;
      var ahead = dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw);
      var side = Math.abs(dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw));
      if (ahead > 0 && ahead < 9 && side < 2.6) { slow = true; break; }
    }
    var target = 0;
    c.speed = lerp(c.speed, slow ? 0 : 9, 1 - Math.pow(0.05, dt));
    // Drive along the route line; at the edge, turn onto a cross street.
    var along = r.horiz ? c.pos.x : c.pos.z;
    var edge = along * r.dir > 200;
    if (edge) {
      r.horiz = !r.horiz;
      r.line = nearestStreet(r.horiz ? c.pos.z : c.pos.x);
      r.dir = Math.random() < 0.5 ? 1 : -1;
    }
    var wantYaw = r.horiz ? (r.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (r.dir > 0 ? 0 : Math.PI);
    c.yaw = angLerp(c.yaw, wantYaw, 1 - Math.pow(0.01, dt));
    // Stick to the route line.
    if (r.horiz) c.pos.z = lerp(c.pos.z, r.line, 1 - Math.pow(0.01, dt));
    else c.pos.x = lerp(c.pos.x, r.line, 1 - Math.pow(0.01, dt));
    c.pos.x += Math.sin(c.yaw) * c.speed * dt;
    c.pos.z += Math.cos(c.yaw) * c.speed * dt;
    var res = resolveBuildingCollision(c.pos.x, c.pos.z, 2.0);
    c.pos.x = res.x; c.pos.z = res.z;
  }
};

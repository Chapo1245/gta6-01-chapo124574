// Sunvale Heat — wanted level + police (fresh code, round 2).
// Heat 0..1 maps to 0..5 stars. Crimes add heat; it drains when no officer
// can see the player. Police cars chase and ram; foot officers chase and
// arrest (busted). Sirens flash + wail while any unit is active.
var Police = {
  cars: [],
  sirenLight: null,

  init: function (scene) {
    // Shared red/blue strobe light that follows the nearest police car.
    this.sirenLight = new THREE.PointLight(0xff2222, 0, 40);
    scene.add(this.sirenLight);
  },

  addHeat: function (amount, why) {
    SV.wantedHeat = clamp(SV.wantedHeat + amount, 0, 1);
    var stars = Math.ceil(SV.wantedHeat * 5);
    if (stars > SV.wanted) {
      SV.wanted = stars;
      SV.hud.toast("Wanted level " + SV.wanted + " — Sunvale PD is on you!");
      if (SV.audio) SV.audio.sirenBlip();
    }
    SV.lastCrimeAt = SV.time;
    if (SV.mission) Missions.onEvent("heat", { stars: SV.wanted, why: why });
  },

  // Called every frame: spawn/despawn units, decay heat, sirens.
  update: function (dt) {
    var wantCars = SV.wanted >= 1 ? Math.min(SV.wanted, 3) : 0;
    // Spawn police cars at the city edge.
    while (this.cars.length < wantCars) {
      var car = Vehicles.makeCar(0x1a1d24, "police");
      var ang = rand(0, TAU);
      car.pos.set(Math.cos(ang) * 190, 0, Math.sin(ang) * 190);
      car.yaw = Math.atan2(-car.pos.x, -car.pos.z);
      car.group.rotation.y = car.yaw;
      car.speed = 0;
      // Light bar.
      var bar = boxMesh(1.1, 0.22, 0.5, 0xdddddd, 0, 1.5, -0.25);
      car.group.add(bar);
      var red = boxMesh(0.5, 0.26, 0.52, 0xff2222, -0.28, 1.5, -0.25);
      var blue = boxMesh(0.5, 0.26, 0.52, 0x2266ff, 0.28, 1.5, -0.25);
      car.group.add(red, blue);
      car.redLamp = red; car.blueLamp = blue;
      SV.scene.add(car.group);
      SV.cars.push(car);
      this.cars.push(car);
    }
    // Despawn extras when heat falls.
    while (this.cars.length > wantCars) {
      var gone = this.cars.pop();
      gone.dead = true;
      SV.scene.remove(gone.group);
      var idx = SV.cars.indexOf(gone);
      if (idx >= 0) SV.cars.splice(idx, 1);
    }
    // Heat decay: only when no police unit can see the player.
    var seen = this.canAnySeePlayer();
    if (!seen && SV.time - SV.lastCrimeAt > 6) {
      SV.wantedHeat = Math.max(0, SV.wantedHeat - dt * 0.03);
      var stars = Math.ceil(SV.wantedHeat * 5);
      if (stars < SV.wanted) SV.wanted = stars;
    }
    // Foot officers when wanted and player is on foot.
    var wantOfficers = (SV.wanted >= 2 && !SV.car) ? Math.min(SV.wanted - 1, 3) : 0;
    while (SV.officers.length < wantOfficers) this.spawnOfficer();
    while (SV.officers.length > wantOfficers) {
      var o = SV.officers.pop();
      SV.scene.remove(o.group);
    }
    for (var i = 0; i < SV.officers.length; i++) this.updateOfficer(SV.officers[i], dt);
    // Siren audio + strobe.
    var active = this.cars.length > 0 || SV.officers.length > 0;
    if (SV.audio) SV.audio.siren(active);
    if (active && this.cars.length > 0) {
      var c0 = this.cars[0];
      this.sirenLight.position.set(c0.pos.x, 3, c0.pos.z);
      var phase = Math.floor(SV.time * 6) % 2 === 0;
      this.sirenLight.color.setHex(phase ? 0xff2222 : 0x2266ff);
      this.sirenLight.intensity = 2.2;
      for (var j = 0; j < this.cars.length; j++) {
        var pc = this.cars[j];
        if (pc.redLamp) pc.redLamp.material = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: phase ? 0xff2222 : 0x220000 });
        if (pc.blueLamp) pc.blueLamp.material = new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: phase ? 0x000022 : 0x2266ff });
      }
    } else {
      this.sirenLight.intensity = 0;
    }
  },

  canAnySeePlayer: function () {
    var px = SV.car ? SV.car.pos.x : SV.player.pos.x;
    var pz = SV.car ? SV.car.pos.z : SV.player.pos.z;
    for (var i = 0; i < this.cars.length; i++) {
      if (dist2(px, pz, this.cars[i].pos.x, this.cars[i].pos.z) < 55) return true;
    }
    for (var j = 0; j < SV.officers.length; j++) {
      if (dist2(px, pz, SV.officers[j].pos.x, SV.officers[j].pos.z) < 30) return true;
    }
    return false;
  },

  spawnOfficer: function () {
    var group = new THREE.Group();
    var legs = boxMesh(0.55, 0.8, 0.36, 0x1a1d24, 0, 0.4, 0);
    var torso = boxMesh(0.7, 0.9, 0.42, 0x22345e, 0, 1.25, 0);
    var badge = boxMesh(0.2, 0.2, 0.05, 0xffd76e, -0.18, 1.45, 0.22);
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a })
    );
    head.position.set(0, 1.95, 0);
    var hat = cylMesh(0.32, 0.32, 0.14, 0x1a1d24, 0, 2.2, 0, 10);
    group.add(legs, torso, badge, head, hat);
    var p = SV.player.pos;
    var ang = rand(0, TAU);
    group.position.set(p.x + Math.cos(ang) * 26, 0, p.z + Math.sin(ang) * 26);
    SV.scene.add(group);
    SV.officers.push({ group: group, pos: group.position, yaw: 0, speed: 6.4, arrestT: 0 });
  },

  updateOfficer: function (o, dt) {
    var p = SV.player;
    if (SV.car) { o.arrestT = 0; return; }
    var d = dist2(o.pos.x, o.pos.z, p.pos.x, p.pos.z);
    var want = Math.atan2(p.pos.x - o.pos.x, p.pos.z - o.pos.z);
    o.yaw = angLerp(o.yaw, want, 1 - Math.pow(0.01, dt));
    var sp = d > 14 ? 7.2 : 6.0;
    o.pos.x += Math.sin(o.yaw) * sp * dt;
    o.pos.z += Math.cos(o.yaw) * sp * dt;
    var res = resolveBuildingCollision(o.pos.x, o.pos.z, 0.5);
    o.pos.x = res.x; o.pos.z = res.z;
    o.group.rotation.y = o.yaw;
    if (d < 2.1) {
      o.arrestT += dt;
      if (o.arrestT > 1.4) Game.busted();
    } else o.arrestT = Math.max(0, o.arrestT - dt * 2);
  },

  // Police car pursuit: steer toward the player, ram to slow them.
  updateCar: function (c, dt) {
    var tx = SV.car ? SV.car.pos.x : SV.player.pos.x;
    var tz = SV.car ? SV.car.pos.z : SV.player.pos.z;
    var d = dist2(c.pos.x, c.pos.z, tx, tz);
    var want = Math.atan2(tx - c.pos.x, tz - c.pos.z);
    var diff = angDiff(c.yaw, want);
    c.yaw += clamp(diff, -1.6 * dt, 1.6 * dt);
    var target = d > 26 ? 22 : (d > 10 ? 17 : 12);
    c.speed = lerp(c.speed, target, 1 - Math.pow(0.05, dt));
    c.pos.x += Math.sin(c.yaw) * c.speed * dt;
    c.pos.z += Math.cos(c.yaw) * c.speed * dt;
    var res = resolveBuildingCollision(c.pos.x, c.pos.z, 2.1);
    c.pos.x = res.x; c.pos.z = res.z;
    // Ram the player's car.
    if (SV.car && d < 3.6) {
      var px = (SV.car.pos.x - c.pos.x) / (d || 1), pz = (SV.car.pos.z - c.pos.z) / (d || 1);
      SV.car.pos.x += px * 1.2; SV.car.pos.z += pz * 1.2;
      SV.car.speed *= 0.82;
      SV.car.hp -= 2.5 * dt * 10;
      if (SV.car.hp <= 0) Vehicles.explode(SV.car);
      if (Math.random() < dt * 2) { if (SV.audio) SV.audio.noise(0.1, 0.25, 800); }
    }
    // Ram the player on foot.
    if (!SV.car && d < 2.4) {
      Player.hurt(12 * dt * 10);
      var p = SV.player;
      p.pos.x += Math.sin(c.yaw) * 3; p.pos.z += Math.cos(c.yaw) * 3;
    }
  }
};

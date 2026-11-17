// Sunvale Heat — combat: pistol, punch, explosions, guards (fresh code, round 2).
// Hitscan pistol with tracer + muzzle flash, melee punch arc, radial
// explosions with particles, and armed warehouse guards who shoot back.
var Combat = {
  shootCooldown: 0,
  reloadT: 0,
  tracers: [],
  flashes: [],
  particles: [],

  shoot: function () {
    if (SV.mode !== "play" || SV.car) return; // drive-by shooting is not in this build
    var p = SV.player;
    if (this.shootCooldown > 0 || this.reloadT > 0) return;
    if (p.ammo <= 0) { this.reload(); return; }
    p.ammo--;
    SV.stats.shots++;
    this.shootCooldown = 0.22;
    p.shootT = 0.18;
    if (SV.audio) SV.audio.shot();
    // Ray from the camera through the screen centre.
    var origin = SV.camera.position.clone();
    var dir = new THREE.Vector3();
    SV.camera.getWorldDirection(dir);
    var best = null, bestD = 90;
    var targets = [];
    for (var i = 0; i < SV.peds.length; i++) { var pd = SV.peds[i]; if (pd.state !== "down") targets.push({ x: pd.pos.x, y: 1.2, z: pd.pos.z, r: 1.1, hp: 34, ref: pd, kind: "ped" }); }
    for (var g = 0; g < SV.guards.length; g++) { var gd = SV.guards[g]; if (gd.hp > 0) targets.push({ x: gd.pos.x, y: 1.2, z: gd.pos.z, r: 1.1, hp: gd.hp, ref: gd, kind: "guard" }); }
    for (var o = 0; o < SV.officers.length; o++) { var of = SV.officers[o]; targets.push({ x: of.pos.x, y: 1.2, z: of.pos.z, r: 1.1, hp: 50, ref: of, kind: "officer" }); }
    for (var c = 0; c < SV.cars.length; c++) { var car = SV.cars[c]; if (!car.dead) targets.push({ x: car.pos.x, y: 0.9, z: car.pos.z, r: 2.6, hp: car.hp, ref: car, kind: "car" }); }
    for (var t = 0; t < targets.length; t++) {
      var tg = targets[t];
      var vx = tg.x - origin.x, vy = tg.y - origin.y, vz = tg.z - origin.z;
      var along = vx * dir.x + vy * dir.y + vz * dir.z;
      if (along < 1 || along > bestD) continue;
      var cx = origin.x + dir.x * along, cy = origin.y + dir.y * along, cz = origin.z + dir.z * along;
      var dd = Math.sqrt((cx - tg.x) * (cx - tg.x) + (cy - tg.y) * (cy - tg.y) + (cz - tg.z) * (cz - tg.z));
      if (dd < tg.r) { best = tg; bestD = along; }
    }
    var end = origin.clone().add(dir.clone().multiplyScalar(best ? bestD : 90));
    this.addTracer(origin, end);
    this.addFlash(end);
    if (best) {
      SV.stats.hits++;
      if (best.kind === "ped") {
        Pedestrians.knockDown(best.ref, null);
      } else if (best.kind === "guard") {
        best.ref.hp -= 34;
        if (best.ref.hp <= 0) {
          best.ref.group.rotation.x = -Math.PI / 2;
          best.ref.group.position.y = 0.4;
          Missions.onEvent("guardDown");
        }
        Police.addHeat(0.12, "shooting");
      } else if (best.kind === "officer") {
        best.ref.hp = (best.ref.hp || 50) - 34;
        if (best.ref.hp <= 0) {
          var idx = SV.officers.indexOf(best.ref);
          if (idx >= 0) SV.officers.splice(idx, 1);
          SV.scene.remove(best.ref.group);
          Police.addHeat(0.5, "officer down");
        } else Police.addHeat(0.2, "shooting");
      } else if (best.kind === "car") {
        best.ref.hp -= 12;
        if (best.ref.hp <= 0) Vehicles.explode(best.ref);
        else Police.addHeat(0.06, "shooting");
      }
      Pedestrians.scare(end.x, end.z, 30);
    } else {
      Pedestrians.scare(p.pos.x, p.pos.z, 18);
    }
  },

  punch: function () {
    if (SV.mode !== "play" || SV.car) return;
    var p = SV.player;
    if (p.punchT > 0) return;
    p.punchT = 0.32;
    if (SV.audio) SV.audio.punch();
    var hit = false;
    for (var i = 0; i < SV.peds.length; i++) {
      var pd = SV.peds[i];
      if (pd.state === "down") continue;
      if (dist2(p.pos.x, p.pos.z, pd.pos.x, pd.pos.z) < 2.2) {
        Pedestrians.knockDown(pd, null);
        hit = true;
      }
    }
    for (var g = 0; g < SV.guards.length; g++) {
      var gd = SV.guards[g];
      if (gd.hp > 0 && dist2(p.pos.x, p.pos.z, gd.pos.x, gd.pos.z) < 2.2) {
        gd.hp -= 20;
        if (gd.hp <= 0) { gd.group.rotation.x = -Math.PI / 2; gd.group.position.y = 0.4; Missions.onEvent("guardDown"); }
        hit = true;
      }
    }
    if (hit) Police.addHeat(0.1, "assault");
  },

  reload: function () {
    if (SV.mode !== "play" || SV.car) return;
    if (this.reloadT > 0 || SV.player.ammo === 12) return;
    this.reloadT = 1.0;
    if (SV.audio) SV.audio.click();
  },

  addTracer: function (a, b) {
    var geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    SV.scene.add(line);
    this.tracers.push({ line: line, life: 0.09 });
  },

  addFlash: function (pos) {
    var light = new THREE.PointLight(0xffe9a8, 3, 12);
    light.position.copy(pos);
    SV.scene.add(light);
    this.flashes.push({ light: light, life: 0.07 });
  },

  explosionAt: function (x, z, radius) {
    var pos = new THREE.Vector3(x, 1.2, z);
    var ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.95 })
    );
    ball.position.copy(pos);
    SV.scene.add(ball);
    this.particles.push({ mesh: ball, life: 0.55, max: 0.55, grow: 14 });
    var light = new THREE.PointLight(0xff8020, 6, 34);
    light.position.set(x, 3, z);
    SV.scene.add(light);
    this.flashes.push({ light: light, life: 0.4 });
    if (SV.audio) SV.audio.explosion();
    Pedestrians.scare(x, z, 40);
    for (var i = 0; i < SV.cars.length; i++) {
      var c = SV.cars[i];
      if (!c.dead && dist2(x, z, c.pos.x, c.pos.z) < radius + 2) {
        c.hp -= 60;
        if (c.hp <= 0 && c !== SV.car) Vehicles.explode(c);
        else if (c.hp <= 0) Vehicles.explode(c);
      }
    }
    for (var p = 0; p < SV.peds.length; p++) {
      var pd = SV.peds[p];
      if (pd.state !== "down" && dist2(x, z, pd.pos.x, pd.pos.z) < radius) Pedestrians.knockDown(pd, null);
    }
    for (var g = 0; g < SV.guards.length; g++) {
      var gd = SV.guards[g];
      if (gd.hp > 0 && dist2(x, z, gd.pos.x, gd.pos.z) < radius) {
        gd.hp = 0;
        gd.group.rotation.x = -Math.PI / 2;
        gd.group.position.y = 0.4;
        Missions.onEvent("guardDown");
      }
    }
    if (dist2(x, z, SV.player.pos.x, SV.player.pos.z) < radius * 0.7) Player.hurt(30);
  },

  spawnGuards: function (x, z, n) {
    this.clearGuards();
    for (var i = 0; i < n; i++) {
      var group = new THREE.Group();
      var legs = boxMesh(0.55, 0.8, 0.36, 0x3a3d42, 0, 0.4, 0);
      var torso = boxMesh(0.7, 0.9, 0.42, 0x4a2a2a, 0, 1.25, 0);
      var vest = boxMesh(0.74, 0.5, 0.46, 0x222222, 0, 1.3, 0);
      var head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xc98a5a })
      );
      head.position.set(0, 1.95, 0);
      var gun = boxMesh(0.14, 0.14, 0.9, 0x111111, 0.3, 1.35, 0.4);
      group.add(legs, torso, vest, head, gun);
      group.position.set(x + rand(-8, 8), 0, z + rand(-8, 8));
      SV.scene.add(group);
      SV.guards.push({ group: group, pos: group.position, yaw: 0, hp: 100, shootT: rand(1, 2.5) });
    }
  },

  clearGuards: function () {
    for (var i = 0; i < SV.guards.length; i++) SV.scene.remove(SV.guards[i].group);
    SV.guards = [];
  },

  updateGuards: function (dt) {
    var p = SV.player;
    for (var i = 0; i < SV.guards.length; i++) {
      var g = SV.guards[i];
      if (g.hp <= 0) continue;
      var d = dist2(g.pos.x, g.pos.z, p.pos.x, p.pos.z);
      var want = Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z);
      g.yaw = angLerp(g.yaw, want, 1 - Math.pow(0.01, dt));
      g.group.rotation.y = g.yaw;
      if (d < 34 && !SV.car) {
        g.shootT -= dt;
        if (g.shootT <= 0) {
          g.shootT = rand(0.9, 1.6);
          // Guard shot: tracer from guard toward the player, chance to hit.
          var from = new THREE.Vector3(g.pos.x, 1.4, g.pos.z);
          var to = new THREE.Vector3(p.pos.x, 1.2, p.pos.z);
          this.addTracer(from, to);
          if (SV.audio) SV.audio.shot();
          if (Math.random() < 0.3) Player.hurt(7);
        }
      }
    }
  },

  update: function (dt) {
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) SV.player.ammo = 12;
    }
    for (var i = this.tracers.length - 1; i >= 0; i--) {
      var tr = this.tracers[i];
      tr.life -= dt;
      tr.line.material.opacity = Math.max(0, tr.life / 0.09) * 0.9;
      if (tr.life <= 0) { SV.scene.remove(tr.line); this.tracers.splice(i, 1); }
    }
    for (var j = this.flashes.length - 1; j >= 0; j--) {
      var fl = this.flashes[j];
      fl.life -= dt;
      fl.light.intensity = Math.max(0, fl.life * 12);
      if (fl.life <= 0) { SV.scene.remove(fl.light); this.flashes.splice(j, 1); }
    }
    for (var k = this.particles.length - 1; k >= 0; k--) {
      var pt = this.particles[k];
      pt.life -= dt;
      var t = 1 - pt.life / pt.max;
      pt.mesh.scale.setScalar(1 + t * pt.grow);
      pt.mesh.material.opacity = Math.max(0, 0.95 * (1 - t));
      if (pt.life <= 0) { SV.scene.remove(pt.mesh); this.particles.splice(k, 1); }
    }
    this.updateGuards(dt);
  }
};

// Sunvale Heat — pedestrians (fresh code, round 2).
// 16 walkers on the sidewalks; they stroll between random corners, flee
// from gunshots, explosions and speeding cars, and can be knocked down.
var Pedestrians = {
  shirtColors: [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1],

  spawn: function (scene) {
    for (var i = 0; i < 16; i++) {
      var group = new THREE.Group();
      var shirt = pick(this.shirtColors);
      var legs = boxMesh(0.5, 0.7, 0.32, 0x2c3e50, 0, 0.35, 0);
      var torso = boxMesh(0.62, 0.75, 0.36, shirt, 0, 1.08, 0);
      var head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshLambertMaterial({ color: pick([0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0]) })
      );
      head.position.set(0, 1.68, 0);
      var sh = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 10),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.02;
      group.add(legs, torso, head, sh);
      var x = randi(-4, 4) * GRID + rand(-16, 16);
      var z = randi(-4, 4) * GRID + rand(-16, 16);
      if (insideBuilding(x, z, 2)) { x = nearestStreet(x); z = nearestStreet(z); }
      group.position.set(x, 0, z);
      scene.add(group);
      SV.peds.push({
        group: group, pos: group.position, yaw: rand(0, TAU),
        speed: rand(1.2, 2.2), state: "walk", // walk | flee | down
        tx: x, tz: z, fear: 0, downT: 0, phase: rand(0, TAU)
      });
    }
  },

  scare: function (x, z, radius) {
    for (var i = 0; i < SV.peds.length; i++) {
      var p = SV.peds[i];
      if (p.state === "down") continue;
      if (dist2(x, z, p.pos.x, p.pos.z) < radius) {
        p.state = "flee";
        p.fear = 1;
        // Flee direction: away from the scare point.
        var dx = p.pos.x - x, dz = p.pos.z - z, d = Math.sqrt(dx * dx + dz * dz) || 1;
        p.tx = p.pos.x + (dx / d) * rand(30, 60);
        p.tz = p.pos.z + (dz / d) * rand(30, 60);
      }
    }
  },

  knockDown: function (ped, car) {
    if (ped.state === "down") return;
    ped.state = "down";
    ped.downT = 0;
    ped.group.rotation.x = -Math.PI / 2;
    ped.group.position.y = 0.4;
    SV.stats.pedsHit++;
    Police.addHeat(0.5, "pedestrian");
    if (SV.audio) SV.audio.noise(0.2, 0.4, 700);
    Pedestrians.scare(ped.pos.x, ped.pos.z, 25);
  },

  update: function (dt) {
    for (var i = 0; i < SV.peds.length; i++) {
      var p = SV.peds[i];
      if (p.state === "down") {
        p.downT += dt;
        if (p.downT > 6) {
          p.state = "walk";
          p.group.rotation.x = 0;
          p.group.position.y = 0;
          p.tx = p.pos.x + rand(-40, 40);
          p.tz = p.pos.z + rand(-40, 40);
        }
        continue;
      }
      var d = dist2(p.pos.x, p.pos.z, p.tx, p.tz);
      if (d < 2) {
        // Pick a new corner to walk to (sidewalk-ish: near a street line).
        p.tx = randi(-4, 4) * GRID + rand(-16, 16);
        p.tz = randi(-4, 4) * GRID + rand(-16, 16);
        if (p.state === "flee") { p.state = "walk"; p.fear = 0; }
      }
      var want = Math.atan2(p.tx - p.pos.x, p.tz - p.pos.z);
      p.yaw = angLerp(p.yaw, want, 1 - Math.pow(0.01, dt));
      var sp = p.state === "flee" ? 6.5 : p.speed;
      p.pos.x += Math.sin(p.yaw) * sp * dt;
      p.pos.z += Math.cos(p.yaw) * sp * dt;
      var res = resolveBuildingCollision(p.pos.x, p.pos.z, 0.5);
      p.pos.x = clamp(res.x, -City.bounds, City.bounds);
      p.pos.z = clamp(res.z, -City.bounds, City.bounds + 40);
      p.group.rotation.y = p.yaw;
      p.phase += sp * dt * 2.2;
      p.group.children[1].rotation.x = Math.sin(p.phase) * 0.18;
    }
  }
};

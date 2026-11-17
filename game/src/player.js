// Sunvale Heat — on-foot character (fresh code, round 2).
// Third-person walker: WASD relative to camera, Shift run, Space jump,
// punch (F), pistol (click/K), E to enter/exit cars. Simple gravity +
// building collision; health regen when no crime happened recently.
var Player = {
  build: function (scene) {
    var group = new THREE.Group();
    // Jace: teal jacket, dark jeans, cap.
    var legs = boxMesh(0.62, 0.85, 0.4, 0x2a3242, 0, 0.42, 0);
    var torso = boxMesh(0.78, 0.95, 0.46, 0x1f8a8a, 0, 1.32, 0);
    var armL = boxMesh(0.22, 0.8, 0.24, 0x1f8a8a, -0.52, 1.3, 0);
    var armR = boxMesh(0.22, 0.8, 0.24, 0x1f8a8a, 0.52, 1.3, 0);
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a })
    );
    head.position.set(0, 2.05, 0);
    var cap = cylMesh(0.34, 0.34, 0.12, 0xd83a2e, 0, 2.3, 0, 12);
    var brim = boxMesh(0.5, 0.06, 0.34, 0xd83a2e, 0, 2.26, 0.3);
    group.add(legs, torso, armL, armR, head, cap, brim);
    // Blob shadow.
    var sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.03;
    group.add(sh);
    group.position.set(0, 0, 26);
    scene.add(group);
    SV.player = {
      group: group, torso: torso, armR: armR,
      pos: group.position, vel: new THREE.Vector3(),
      yaw: 0, speed: 0, grounded: true, vy: 0,
      walkPhase: 0, punchT: 0, shootT: 0, ammo: 12
    };
  },

  update: function (dt) {
    var p = SV.player;
    if (!p || SV.mode !== "play") return;
    var axes = Input.moveAxes();
    var run = Input.isDown("ShiftLeft") || Input.isDown("ShiftRight");
    var maxSpeed = run ? 9.5 : 5.2;
    // Movement relative to camera yaw.
    var cy = SV.camYaw;
    var fx = -Math.sin(cy), fz = -Math.cos(cy);
    var rx = -fz, rz = fx;
    var mx = fx * axes.f + rx * axes.s;
    var mz = fz * axes.f + rz * axes.s;
    var ml = Math.sqrt(mx * mx + mz * mz);
    if (ml > 0.01) {
      mx /= ml; mz /= ml;
      p.vel.x = lerp(p.vel.x, mx * maxSpeed, 1 - Math.pow(0.001, dt));
      p.vel.z = lerp(p.vel.z, mz * maxSpeed, 1 - Math.pow(0.001, dt));
      p.yaw = Math.atan2(mx, mz);
    } else {
      p.vel.x = lerp(p.vel.x, 0, 1 - Math.pow(0.0001, dt));
      p.vel.z = lerp(p.vel.z, 0, 1 - Math.pow(0.0001, dt));
    }
    // Jump + gravity.
    if (Input.isDown("Space") && p.grounded) { p.vy = 7.5; p.grounded = false; }
    p.vy -= 22 * dt;
    p.pos.y += p.vy * dt;
    if (p.pos.y <= 0) { p.pos.y = 0; p.vy = 0; p.grounded = true; }
    // Integrate + building collision.
    var nx = p.pos.x + p.vel.x * dt, nz = p.pos.z + p.vel.z * dt;
    var res = resolveBuildingCollision(nx, nz, 0.6);
    p.pos.x = clamp(res.x, -City.bounds, City.bounds);
    p.pos.z = clamp(res.z, -City.bounds, City.bounds + 40);
    p.speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    p.group.rotation.y = p.yaw;
    // Walk swing.
    p.walkPhase += p.speed * dt * 1.6;
    var swing = Math.sin(p.walkPhase) * clamp(p.speed / 9, 0, 1) * 0.45;
    p.torso.rotation.x = swing * 0.12;
    p.armR.rotation.x = p.punchT > 0 ? -1.4 : -swing;
    if (p.punchT > 0) p.punchT -= dt;
    if (p.shootT > 0) p.shootT -= dt;
    // Slow health regen when the heat is off.
    if (SV.wanted === 0 && SV.health < SV.maxHealth && SV.time - SV.lastCrimeAt > 12) {
      SV.health = Math.min(SV.maxHealth, SV.health + 2.2 * dt);
    }
  },

  hurt: function (amount) {
    SV.health -= amount;
    SV.hud.flashDamage();
    if (SV.health <= 0) {
      SV.health = 0;
      Game.wasted();
    }
  }
};

// player.js — Jace Rivera on foot and behind the wheel; third-person camera.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;
  var sceneRef = null, cameraRef = null;
  var group = null;
  var x = 26, z = 60, angle = 0, speedY = 0, onGround = true;
  var camYaw = 0, camPitch = 0.32, camDist = 8;
  var walkPhase = 0;
  var currentCar = null;
  var legL = null, legR = null, armL = null, armR = null;
  var enterCd = 0;

  function makePlayerModel() {
    var g = new THREE.Group();
    var jacket = new THREE.MeshLambertMaterial({ color: 0xff5a3a });
    var skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
    var jeans = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.42), jacket);
    body.position.y = 1.15; g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skin);
    head.position.y = 1.88; g.add(head);
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.52), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    cap.position.y = 2.14; g.add(cap);
    legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.32), jeans);
    legL.position.set(-0.19, 0.37, 0); g.add(legL);
    legR = legL.clone(); legR.position.x = 0.19; g.add(legR);
    armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), jacket);
    armL.position.set(-0.5, 1.15, 0); g.add(armL);
    armR = armL.clone(); armR.position.x = 0.5; g.add(armR);
    // pistol in right hand
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.5, 0.8, -0.25); g.add(gun);
    return g;
  }

  function init(scene, camera, spawnX, spawnZ) {
    sceneRef = scene; cameraRef = camera;
    x = spawnX; z = spawnZ;
    group = makePlayerModel();
    group.position.set(x, 0, z);
    scene.add(group);
  }
  function position() { return { x: x, z: z }; }
  function facing() { return angle; }
  function setPosition(nx, nz) { x = nx; z = nz; group.position.set(x, 0, z); }
  function getCurrentCar() { return currentCar; }

  function enterCar(car) {
    currentCar = car;
    car.driver = 'player';
    group.visible = false;
    SV.audio.doorSlam();
    SV.hud.toast('You stole the ' + car.kind + '! ★ Wanted up');
    SV.police.addWanted(1, 'Car stolen');
    enterCd = 0.6;
  }
  function exitCar() {
    if (!currentCar) return;
    var car = currentCar;
    car.driver = 'parked';
    currentCar = null;
    // step out to the side
    var sx = car.x + Math.cos(car.angle) * 2.6, sz = car.z - Math.sin(car.angle) * 2.6;
    var fixed = SV.city.collideCircle(sx, sz, 0.7);
    x = fixed.x; z = fixed.z;
    group.visible = true;
    group.position.set(x, 0, z);
    angle = car.angle + Math.PI;
    SV.audio.doorSlam();
    enterCd = 0.6;
  }

  function update(dt) {
    enterCd = Math.max(0, enterCd - dt);
    var drag = SV.input.drag();
    camYaw -= drag.dx * 0.005;
    camPitch = U.clamp(camPitch + drag.dy * 0.004, 0.08, 1.1);

    if (currentCar) {
      var input = SV.input.axis();
      SV.vehicles.driveCar(currentCar, input, dt);
      x = currentCar.x; z = currentCar.z;
      angle = currentCar.angle;
      SV.audio.engine(Math.abs(currentCar.speed) / currentCar.maxSpeed, true);
      if (SV.input.wasPressed('KeyE') && enterCd <= 0) exitCar();
      if (SV.input.wasPressed('KeyH')) SV.audio.horn();
      if (SV.input.mouseClicked()) SV.combat.shoot(cameraRef, true);
      updateCamera(dt, true);
      return;
    }
    SV.audio.engine(0, false);

    // on foot
    var input2 = SV.input.axis();
    var running = SV.input.run();
    var moveSpeed = running ? 9 : 5;
    var moving = input2.x !== 0 || input2.z !== 0;
    if (moving) {
      // movement relative to camera yaw
      var fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
      var rightX = Math.cos(camYaw), rightZ = -Math.sin(camYaw);
      var mx = fwdX * -input2.z + rightX * input2.x;
      var mz = fwdZ * -input2.z + rightZ * input2.x;
      var len = Math.sqrt(mx * mx + mz * mz) || 1;
      mx /= len; mz /= len;
      var targetAngle = Math.atan2(mx, mz);
      angle = U.angleLerp(angle, targetAngle, Math.min(1, dt * 10));
      x += mx * moveSpeed * dt;
      z += mz * moveSpeed * dt;
      walkPhase += dt * moveSpeed * 1.6;
      var swing = Math.sin(walkPhase) * 0.55;
      legL.rotation.x = swing; legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
    } else {
      legL.rotation.x = U.lerp(legL.rotation.x, 0, dt * 8);
      legR.rotation.x = U.lerp(legR.rotation.x, 0, dt * 8);
      armL.rotation.x = U.lerp(armL.rotation.x, 0, dt * 8);
      armR.rotation.x = U.lerp(armR.rotation.x, 0, dt * 8);
    }
    // jump
    if (SV.input.wasPressed('Space') && onGround) { speedY = 7; onGround = false; }
    if (!onGround) {
      speedY -= 22 * dt;
      var y = group.position.y + speedY * dt;
      if (y <= 0) { y = 0; speedY = 0; onGround = true; }
      group.position.y = y;
    }
    var fixed = SV.city.collideCircle(x, z, 0.7);
    x = fixed.x; z = fixed.z;
    var cl = SV.city.clampToWorld(x, z);
    x = cl.x; z = cl.z;
    // bumping into a car at speed hurts; walking into a parked car just stops you
    var near = SV.vehicles.nearestCar(x, z, 2.6, true);
    if (near && Math.abs(near.speed || 0) > 6) {
      SV.combat.damagePlayer(20);
      SV.police.addWanted(1, 'Hit by a car');
      x += (x - near.x) * 0.5; z += (z - near.z) * 0.5;
    }
    group.position.set(x, group.position.y, z);
    group.rotation.y = angle;

    // actions
    if (SV.input.wasPressed('KeyE') && enterCd <= 0) {
      var car = SV.vehicles.nearestCar(x, z, 4.5, true);
      if (car) enterCar(car);
      else SV.hud.toast('No car nearby — look for parked cars on the streets');
    }
    if (SV.input.mouseClicked()) SV.combat.shoot(cameraRef, false);
    if (SV.input.wasPressed('KeyF')) SV.combat.punch();
    if (SV.input.wasPressed('KeyR')) SV.combat.reload();

    updateCamera(dt, false);
  }

  function updateCamera(dt, inCar) {
    var targetX = x, targetZ = z, targetY = inCar ? 1.6 : 1.6;
    var dist = inCar ? camDist + 3 : camDist;
    var pitch = inCar ? Math.max(camPitch, 0.3) : camPitch;
    // camera sits behind the car: car forward is (-sin, -cos), so the
    // camera offset is (+sin, +cos) of the car angle
    var yaw = inCar ? angle : camYaw;
    var cx = targetX + Math.sin(yaw) * Math.cos(pitch) * dist;
    var cz = targetZ + Math.cos(yaw) * Math.cos(pitch) * dist;
    var cy = targetY + Math.sin(pitch) * dist;
    // keep the camera out of buildings: pull it in if blocked
    var camPos = new THREE.Vector3(cx, cy, cz);
    cameraRef.position.lerp(camPos, Math.min(1, dt * (inCar ? 6 : 10)));
    cameraRef.lookAt(targetX, targetY + 0.4, targetZ);
    // on foot, camera yaw follows the mouse drag; when moving, blend yaw behind the player
    if (!inCar && SV.input.axis().z !== 0) {
      // keep camYaw as the user set it; movement is camera-relative
    }
  }

  // For screenshots: place the player and camera for a staged scene.
  function stageForShot(scene) {
    if (scene === 'chase') {
      var car = SV.vehicles.nearestCar(x, z, 200, true) || SV.vehicles.parked[0];
      if (car) { enterCar(car); }
      // put the stolen car on the main north road, heading downtown
      car.x = 0; car.z = 130; car.angle = 0; car.speed = 12; // already rolling
      SV.vehicles.syncCar(car, 0.016);
      x = car.x; z = car.z; angle = 0;
      // clear the road ahead so the chase reads cleanly
      SV.vehicles.traffic.forEach(function (tc) {
        if (Math.abs(tc.x) < 12 && tc.z > 40 && tc.z < 150) {
          var rp = SV.city.randomRoadPoint();
          tc.x = rp.x; tc.z = rp.z;
          SV.vehicles.syncCar(tc, 0.016);
        }
      });
      SV.police.wanted = 3;
      // police spawn BEHIND the player's car (forward is -sin/-cos of angle)
      var bx = Math.sin(angle), bz = Math.cos(angle);
      var pc1 = SV.vehicles.spawnPoliceCar(x + bx * 48 - bz * 8, z + bz * 48 + bx * 8);
      var pc2 = SV.vehicles.spawnPoliceCar(x + bx * 62 + bz * 8, z + bz * 62 - bx * 8);
      pc1.speed = 6; pc2.speed = 6; // rolling start so the chase builds in frame
      camYaw = angle;
      camPitch = 0.22;
    } else if (scene === 'street') {
      setPosition(0, 130);
      angle = Math.PI;
      camYaw = 0;
      camPitch = 0.3;
      // bring two pedestrians and a parked car into frame for the shot
      var peds = SV.peds.list;
      for (var pi = 0; pi < Math.min(3, peds.length); pi++) {
        peds[pi].x = -4 + pi * 4; peds[pi].z = 104 + pi * 5;
        peds[pi].tx = peds[pi].x; peds[pi].tz = 60;
        peds[pi].group.position.set(peds[pi].x, 0, peds[pi].z);
      }
      var parked = SV.vehicles.parked[0];
      if (parked) { parked.x = 8.5; parked.z = 108; parked.angle = 0; SV.vehicles.syncCar(parked, 0.016); }
    } else if (scene === 'mission') {
      var w = SV.city.landmarks.warehouse;
      // southeast intersection: whole warehouse, its sign, the beacon and guards in frame
      setPosition(w.x + 26, w.z + 26);
      angle = Math.atan2(-26, -26); // face northwest at the warehouse
      camYaw = angle + Math.PI; // camera southeast of the player, on the intersection
      camPitch = 0.3;
      // mission 4 (Warehouse Bust) is already running; guards spawn from it
    }
  }

  SV.player = {
    init: init, update: update, position: position, facing: facing,
    setPosition: setPosition, currentCar: getCurrentCar,
    enterCar: enterCar, exitCar: exitCar, stageForShot: stageForShot,
    get camYaw() { return camYaw; }
  };
})();

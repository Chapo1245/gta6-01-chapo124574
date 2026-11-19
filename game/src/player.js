// Azura Bay — Mara Voss on foot and behind the wheel: walking, stealing
// and driving cars, punching, crashing, and getting in and out.
window.AZURA = window.AZURA || {};

const AzuraPlayer = {
  create(scene) {
    const group = new THREE.Group();
    // A low-poly figure: jacket torso, head, legs, arms.
    const jacket = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b48a });
    const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), jacket);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8, 0, Math.PI * 2, 0, 1.4), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    hair.position.y = 1.82;
    group.add(hair);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), jeans);
    legL.position.set(-0.18, 0.35, 0);
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), jeans);
    legR.position.set(0.18, 0.35, 0);
    group.add(legR);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), jacket);
    armL.position.set(-0.48, 1.05, 0);
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), jacket);
    armR.position.set(0.48, 1.05, 0);
    group.add(armR);
    group.position.set(0, 0, 30);
    scene.add(group);
    return {
      group, x: 0, z: 30, heading: 0, speed: 0,
      inCar: null, health: 100, walkPhase: 0,
      lastDamageAt: -99, punchCooldown: 0,
    };
  },

  // Nearest car the player could steal, within reach.
  nearestCar(game, maxDist) {
    let best = null;
    let bestD = maxDist;
    game.cars.forEach((car) => {
      if (car === game.player.inCar) return;
      const d = AZURA.utils.dist2D(game.player.x, game.player.z, car.x, car.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    });
    return best;
  },

  enterCar(game, car) {
    game.player.inCar = car;
    game.player.group.visible = false;
    car.speed = 0;
    game.hud.toast('You took the car — the law noticed.');
    game.addWanted(1);
    game.audio.setEngine(0.1);
  },

  exitCar(game) {
    const p = game.player;
    const car = p.inCar;
    if (!car) return;
    p.inCar = null;
    p.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
    p.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
    p.heading = car.heading;
    p.group.visible = true;
    p.group.position.set(p.x, 0, p.z);
    game.audio.setEngine(0);
  },

  punch(game) {
    const p = game.player;
    if (p.punchCooldown > 0 || p.inCar) return;
    p.punchCooldown = 0.45;
    let hit = false;
    game.peds.forEach((ped) => {
      if (ped.down) return;
      if (AZURA.utils.dist2D(p.x, p.z, ped.x, ped.z) < 2.6) {
        ped.down = true;
        ped.downTimer = 6;
        ped.group.rotation.x = Math.PI / 2;
        hit = true;
      }
    });
    if (hit) {
      game.addWanted(1);
      game.hud.toast('Assault! Witnesses called it in.');
    }
  },

  // Arcade driving: accelerate, steer, handbrake drift, collisions.
  drive(game, dt, input) {
    const p = game.player;
    const car = p.inCar;
    const cfg = AZURA.config;
    const U = AZURA.utils;
    const engineMul = 1 + (game.upgrades.engine - 1) * 0.35;
    const top = cfg.carTopSpeed * engineMul;
    const accel = input.forward ? cfg.carAccel * engineMul : 0;
    const braking = input.back ? cfg.carBrake : 0;
    if (accel) car.speed += accel * dt;
    if (braking) car.speed -= (car.speed > 0 ? braking : cfg.carAccel * 0.6) * dt;
    // Rolling drag + handbrake slide.
    car.speed -= car.speed * (input.handbrake ? 0.6 : 0.35) * dt;
    car.speed = U.clamp(car.speed, -cfg.carReverseMax, top);
    const steerTarget = input.steer * cfg.carSteer * (car.speed >= 0 ? 1 : -1);
    car.steer = U.lerp(car.steer, steerTarget, 1 - Math.pow(0.001, dt));
    const grip = input.handbrake ? cfg.handbrakeGrip : 1;
    car.heading += (car.steer * car.speed * 0.055 * grip) * dt * 3;
    car.x -= Math.sin(car.heading) * car.speed * dt;
    car.z -= Math.cos(car.heading) * car.speed * dt;
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    // Building collisions: slide along, scrape speed, damage on hard hits.
    const impact = Math.abs(car.speed);
    game.city.colliders.forEach((box) => {
      const pushed = U.pushCircleOutOfBox(car.x, car.z, cfg.carRadius, box);
      if (pushed) {
        car.x = pushed.x;
        car.z = pushed.z;
        if (impact > 14) this.damage(game, (impact - 14) * 0.6);
        car.speed *= 0.55;
      }
    });
    // Car-to-car bumps.
    game.cars.forEach((other) => {
      if (other === car) return;
      const d = U.dist2D(car.x, car.z, other.x, other.z);
      if (d < cfg.carRadius * 2 && d > 0.01) {
        const push = (cfg.carRadius * 2 - d) / 2;
        const nx = (car.x - other.x) / d;
        const nz = (car.z - other.z) / d;
        car.x += nx * push;
        car.z += nz * push;
        if (Math.abs(car.speed) > 10) {
          this.damage(game, 4);
          if (other.police) game.addWanted(1);
        }
        car.speed *= 0.8;
      }
    });
    // Pedestrian hits while driving.
    game.peds.forEach((ped) => {
      if (ped.down) return;
      if (U.dist2D(car.x, car.z, ped.x, ped.z) < cfg.carRadius + 0.6 && Math.abs(car.speed) > 4) {
        ped.down = true;
        ped.downTimer = 8;
        ped.group.rotation.x = Math.PI / 2;
        game.addWanted(1);
        game.hud.toast('You hit a pedestrian!');
      }
    });
    car.sync();
    game.audio.setEngine(Math.abs(car.speed) / top);
  },

  walk(game, dt, input) {
    const p = game.player;
    const cfg = AZURA.config;
    const U = AZURA.utils;
    const speed = input.sprint ? cfg.sprintSpeed : cfg.walkSpeed;
    const mx = input.moveX;
    const mz = input.moveZ;
    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.sqrt(mx * mx + mz * mz);
      const nx = mx / len;
      const nz = mz / len;
      p.x += nx * speed * dt;
      p.z += nz * speed * dt;
      const targetHeading = Math.atan2(nx, nz) + Math.PI;
      p.heading = U.angleLerp(p.heading, targetHeading, 1 - Math.pow(0.0005, dt));
      p.walkPhase += dt * speed * 1.6;
      p.group.children.forEach((child, i) => {
        if (i === 3 || i === 4) child.rotation.x = Math.sin(p.walkPhase) * (i === 3 ? 0.5 : -0.5);
      });
    }
    // Stay inside the city and out of buildings.
    p.x = U.clamp(p.x, -cfg.halfCity + 4, cfg.halfCity - 4);
    p.z = U.clamp(p.z, -cfg.halfCity + 4, cfg.oceanStartZ - 6);
    game.city.colliders.forEach((box) => {
      const pushed = U.pushCircleOutOfBox(p.x, p.z, cfg.playerRadius, box);
      if (pushed) {
        p.x = pushed.x;
        p.z = pushed.z;
      }
    });
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
    game.audio.setEngine(0);
  },

  damage(game, amount) {
    const p = game.player;
    const now = game.time;
    if (now - p.lastDamageAt < 0.4) return;
    p.lastDamageAt = now;
    const reduced = amount * (game.upgrades.armor ? 0.55 : 1);
    p.health -= reduced;
    if (p.health <= 0) {
      p.health = 0;
      game.gameOver('WASTED');
    }
  },

  update(game, dt, input) {
    const p = game.player;
    if (p.punchCooldown > 0) p.punchCooldown -= dt;
    // Slow health regen after 10 s without damage.
    if (game.time - p.lastDamageAt > 10 && p.health > 0 && p.health < 100) {
      p.health = Math.min(100, p.health + 2 * dt);
    }
    if (p.inCar) this.drive(game, dt, input);
    else this.walk(game, dt, input);
  },
};

AZURA.player = AzuraPlayer;

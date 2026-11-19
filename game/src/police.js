// Azura Bay — the wanted system: police cruisers that chase and ram, and
// a helicopter with a searchlight that joins at 3 stars. Getting caught
// on foot means BUSTED.
window.AZURA = window.AZURA || {};

const AzuraPolice = {
  create(scene) {
    // Helicopter: body, tail, rotor, and a visible searchlight cone.
    const heli = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), bodyMat);
    body.scale.set(1, 0.8, 1.6);
    heli.add(body);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4.5, 6), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 3.4;
    heli.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    rotor.position.y = 1.5;
    rotor.name = 'rotor';
    heli.add(rotor);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(5, 40, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.y = -20;
    cone.rotation.x = Math.PI;
    heli.add(cone);
    const spot = new THREE.SpotLight(0xfff2b0, 2.2, 60, 0.35, 0.4, 1);
    spot.position.set(0, 0, 0);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, -40, 0);
    heli.add(spotTarget);
    spot.target = spotTarget;
    heli.add(spot);
    heli.position.set(0, 42, 0);
    heli.visible = false;
    scene.add(heli);
    return { cruisers: [], heli, heliAngle: 0, rotorSpin: 0 };
  },

  spawnCruiser(game) {
    const cfg = AZURA.config;
    const U = AZURA.utils;
    const p = game.player;
    const avenue = U.pick(cfg.roadCenters);
    const side = Math.random() < 0.5 ? -1 : 1;
    const car = AZURA.car.makeCar(game.scene, {
      color: 0xf5f5f5, police: true,
      x: U.clamp(p.x + side * U.rand(40, 70), -240, 240),
      z: U.clamp(p.z + U.rand(-40, 40), -240, 240),
      heading: 0,
    });
    car.cruiseSpeed = 0;
    game.cars.push(car);
    game.police.cruisers.push(car);
  },

  update(game, dt) {
    const cfg = AZURA.config;
    const U = AZURA.utils;
    const pol = game.police;
    const p = game.player;
    // Wanted decay: lay low and the heat fades.
    if (game.wanted > 0 && game.time - game.lastCrimeAt > cfg.wantedDecaySeconds) {
      game.wanted -= 1;
      game.lastCrimeAt = game.time;
      game.hud.toast(game.wanted === 0 ? 'The heat is off — for now.' : `Wanted level down to ${game.wanted} star${game.wanted === 1 ? '' : 's'}.`);
    }
    // Spawn cruisers up to the wanted level.
    while (pol.cruisers.length < game.wanted) this.spawnCruiser(game);
    // Despawn extras when the wanted level falls.
    while (pol.cruisers.length > game.wanted) {
      const extra = pol.cruisers.pop();
      game.scene.remove(extra.group);
      const idx = game.cars.indexOf(extra);
      if (idx >= 0) game.cars.splice(idx, 1);
    }
    // Cruiser chase: steer toward the player, ram on contact.
    pol.cruisers.forEach((cruiser) => {
      const targetHeading = Math.atan2(p.x - cruiser.x, p.z - cruiser.z) + Math.PI;
      cruiser.heading = U.angleLerp(cruiser.heading, targetHeading, 1 - Math.pow(0.01, dt));
      const dist = U.dist2D(cruiser.x, cruiser.z, p.x, p.z);
      const chaseSpeed = 16 + game.wanted * 1.5;
      cruiser.speed = Math.min(chaseSpeed, dist * 0.6 + 6);
      cruiser.x -= Math.sin(cruiser.heading) * cruiser.speed * dt;
      cruiser.z -= Math.cos(cruiser.heading) * cruiser.speed * dt;
      // Buildings slow a cruiser down instead of letting it clip through.
      game.city.colliders.forEach((box) => {
        const pushed = U.pushCircleOutOfBox(cruiser.x, cruiser.z, cfg.carRadius, box);
        if (pushed) {
          cruiser.x = pushed.x;
          cruiser.z = pushed.z;
          cruiser.speed *= 0.5;
        }
      });
      cruiser.sync();
      // Contact: on foot it is a bust; in a car it is a ram.
      if (dist < cfg.carRadius + 1.2) {
        if (p.inCar) {
          AZURA.player.damage(game, 6);
          cruiser.speed *= 0.4;
          if (p.inCar) p.inCar.speed *= 0.7;
        } else {
          game.gameOver('BUSTED');
        }
      }
    });
    // Helicopter at 3+ stars: circles the player, searchlight tracking.
    const heli = pol.heli;
    if (game.wanted >= 3) {
      heli.visible = true;
      pol.heliAngle += dt * 0.5;
      heli.position.x = p.x + Math.cos(pol.heliAngle) * 16;
      heli.position.z = p.z + Math.sin(pol.heliAngle) * 16;
      heli.position.y = 42 + Math.sin(game.time * 0.8) * 1.5;
      heli.rotation.y = Math.atan2(p.x - heli.position.x, p.z - heli.position.z) + Math.PI;
      const rotor = heli.getObjectByName('rotor');
      if (rotor) rotor.rotation.y += dt * 18;
    } else {
      heli.visible = false;
    }
    // Siren audio follows the nearest cruiser.
    let nearest = 999;
    pol.cruisers.forEach((c) => {
      nearest = Math.min(nearest, U.dist2D(c.x, c.z, p.x, p.z));
    });
    game.audio.setSiren(pol.cruisers.length > 0, nearest < 40 ? 1 - nearest / 40 : 0.2);
  },
};

AZURA.police = AzuraPolice;

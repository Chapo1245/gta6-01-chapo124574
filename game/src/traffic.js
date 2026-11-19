// Azura Bay — traffic AI cars that cruise the avenue grid and pedestrians
// who walk the sidewalks and scatter when a car bears down on them.
window.AZURA = window.AZURA || {};

const AzuraTraffic = {
  create(scene) {
    const cfg = AZURA.config;
    const cars = [];
    for (let i = 0; i < 10; i += 1) {
      const avenue = AZURA.utils.pick(cfg.roadCenters);
      const along = AZURA.utils.rand(-230, 230);
      const vertical = Math.random() < 0.5;
      const car = AZURA.car.makeCar(scene, {
        x: vertical ? avenue + 3.5 : along,
        z: vertical ? along : avenue + 3.5,
        heading: vertical ? 0 : Math.PI / 2,
      });
      car.cruiseSpeed = AZURA.utils.rand(8, 12);
      car.vertical = vertical;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      cars.push(car);
    }
    // Parked cars the player can steal.
    for (let i = 0; i < 6; i += 1) {
      const avenue = AZURA.utils.pick(cfg.roadCenters);
      const along = AZURA.utils.rand(-230, 230);
      const car = AZURA.car.makeCar(scene, {
        x: avenue + 8.5,
        z: along,
        heading: Math.PI / 2,
      });
      car.parked = true;
      car.cruiseSpeed = 0;
      cars.push(car);
    }
    // Pedestrians: simple figures on the sidewalks.
    const peds = [];
    const pedMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
    const pedMat2 = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
    for (let i = 0; i < 16; i += 1) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.1, 8), i % 2 ? pedMat : pedMat2);
      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
      head.position.y = 1.6;
      group.add(head);
      const avenue = AZURA.utils.pick(cfg.roadCenters);
      const along = AZURA.utils.rand(-230, 230);
      group.position.set(avenue + 9.5, 0, along);
      scene.add(group);
      peds.push({
        group,
        x: avenue + 9.5, z: along,
        heading: AZURA.utils.rand(0, Math.PI * 2),
        speed: AZURA.utils.rand(1.2, 2.2),
        down: false, downTimer: 0, flee: 0,
      });
    }
    return { cars, peds };
  },

  update(game, dt) {
    const cfg = AZURA.config;
    const U = AZURA.utils;
    game.cars.forEach((car) => {
      if (car.parked || car.police) return;
      if (car === game.player.inCar) return;
      // Cruise along the current road; at an intersection, sometimes turn.
      const speed = car.cruiseSpeed;
      if (car.vertical) car.z += car.dir * speed * dt;
      else car.x += car.dir * speed * dt;
      // Reached the end of the road: turn around at the city edge.
      if (car.vertical && (car.z > 240 || car.z < -240)) car.dir *= -1;
      if (!car.vertical && (car.x > 240 || car.x < -240)) car.dir *= -1;
      // Near an intersection: small chance to turn onto the cross street.
      const nearX = cfg.roadCenters.some((c) => Math.abs(car.x - c) < 2);
      const nearZ = cfg.roadCenters.some((c) => Math.abs(car.z - c) < 2);
      if (nearX && nearZ && Math.random() < dt * 0.25) {
        car.vertical = !car.vertical;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        if (car.vertical) car.x = U.pick(cfg.roadCenters) + 3.5;
        else car.z = U.pick(cfg.roadCenters) + 3.5;
      }
      car.heading = car.vertical ? (car.dir > 0 ? Math.PI : 0) : (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      car.speed = speed;
      car.sync();
    });
    game.peds.forEach((ped) => {
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          ped.down = false;
          ped.group.rotation.x = 0;
          ped.group.position.y = 0;
        }
        return;
      }
      // Flee a fast car nearby.
      const playerCar = game.player.inCar;
      if (playerCar && Math.abs(playerCar.speed) > 8) {
        const d = U.dist2D(ped.x, ped.z, playerCar.x, playerCar.z);
        if (d < 9) ped.flee = 1.2;
      }
      if (ped.flee > 0) {
        ped.flee -= dt;
        const away = Math.atan2(ped.x - game.player.x, ped.z - game.player.z);
        ped.heading = away;
        ped.x += Math.sin(away) * 5 * dt;
        ped.z += Math.cos(away) * 5 * dt;
      } else {
        ped.x += Math.sin(ped.heading) * ped.speed * dt;
        ped.z += Math.cos(ped.heading) * ped.speed * dt;
        if (Math.random() < dt * 0.08) ped.heading += U.rand(-1.2, 1.2);
        // Keep pedestrians on the sidewalks: snap back inside the city.
        ped.x = U.clamp(ped.x, -cfg.halfCity + 6, cfg.halfCity - 6);
        ped.z = U.clamp(ped.z, -cfg.halfCity + 6, cfg.oceanStartZ - 8);
      }
      ped.group.position.set(ped.x, 0, ped.z);
      ped.group.rotation.y = ped.heading;
    });
  },
};

AZURA.traffic = AzuraTraffic;

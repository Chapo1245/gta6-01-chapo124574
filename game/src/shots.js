// Azura Bay — screenshot staging behind ?shot=cover|drive|mission|vista.
// Each scene puts the real game in a fixed, photogenic state (real rules,
// real traffic, real HUD) and sets window.__shotReady once it has rendered
// a few frames, so a screenshot is a true render of the game.
window.AZURA = window.AZURA || {};

const AzuraShots = {
  apply(game, name) {
    const scene = game.scene;
    game.shotMode = true;
    game.state = 'playing';
    game.hud.showHud(game);
    const p = game.player;

    if (name === 'drive') {
      // Mara driving north up avenue 35, traffic ahead on the same road,
      // 2 stars with a cruiser closing in behind.
      const car = AZURA.car.makeCar(scene, { color: 0xc0392b, x: 35, z: 140, heading: 0 });
      game.cars.push(car);
      AZURA.player.enterCar(game, car);
      car.speed = 16;
      [90, 50, 10].forEach((z) => {
        const t = AZURA.car.makeCar(scene, { x: 38.5, z, heading: 0 });
        t.cruiseSpeed = 10;
        t.vertical = true;
        t.dir = -1;
        game.cars.push(t);
      });
      game.wanted = 2;
      game.lastCrimeAt = game.time;
      game.cameraMode = 'chase';
    } else if (name === 'mission') {
      // Job 4 at the plaza fountain: Mara drives west along street -35
      // straight at the beacon, two cruisers ahead, helicopter circling
      // in front with its searchlight on the street.
      game.missions.index = 3;
      const car = AZURA.car.makeCar(scene, { color: 0x2e86c1, x: 60, z: -35, heading: Math.PI / 2 });
      game.cars.push(car);
      AZURA.player.enterCar(game, car);
      car.speed = 14;
      [[25, -45], [10, -25]].forEach(([x, z]) => {
        const cruiser = AZURA.car.makeCar(scene, { color: 0xf5f5f5, police: true, x, z, heading: -Math.PI / 2 });
        game.cars.push(cruiser);
        game.police.cruisers.push(cruiser);
      });
      game.wanted = 3;
      game.lastCrimeAt = game.time;
      game.police.heliAngle = Math.PI;
      game.cameraMode = 'chase';
    } else if (name === 'vista') {
      // High above the beach, looking north over the boardwalk and the city.
      p.x = 35;
      p.z = 250;
      p.heading = 0;
      p.group.position.set(p.x, 0, p.z);
      game.cameraMode = 'vista';
    } else {
      // Cover: golden-hour shot from avenue 35 — Mara's yellow car in
      // front, the city rising behind it.
      const car = AZURA.car.makeCar(scene, { color: 0xf1c40f, x: 35, z: 180, heading: 0 });
      game.cars.push(car);
      AZURA.player.enterCar(game, car);
      game.missions.index = 0;
      game.cameraMode = 'cover';
    }
    // A few frames in, the scene is settled: flag it ready.
    let frames = 0;
    const watch = () => {
      frames += 1;
      if (frames >= 3) window.__shotReady = true;
      else requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  },
};

AZURA.shots = AzuraShots;

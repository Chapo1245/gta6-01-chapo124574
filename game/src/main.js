// Azura Bay — boot and the one loop: the world advances, the camera
// follows Mara, the HUD draws, and the game moves between menu, playing,
// paused and game-over. ?shot=cover|drive|mission|vista stages a
// screenshot scene instead of the menu.
window.AZURA = window.AZURA || {};

const AzuraMain = {
  boot() {
    const cfg = AZURA.config;
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    document.getElementById('game').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.skyColor);
    scene.fog = new THREE.Fog(cfg.fogColor, cfg.fogNear, cfg.fogFar);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

    // Golden-hour sun with shadows, plus a warm sky fill.
    const sun = new THREE.DirectionalLight(cfg.sunColor, cfg.sunIntensity);
    sun.position.set(cfg.sunPosition[0], cfg.sunPosition[1], cfg.sunPosition[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -320;
    sun.shadow.camera.right = 320;
    sun.shadow.camera.top = 320;
    sun.shadow.camera.bottom = -320;
    sun.shadow.camera.far = 900;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xffd9a0, 0x5a6a7a, 0.85));

    const game = {
      config: cfg,
      renderer, scene, camera, sun,
      state: 'menu',
      time: 0,
      cash: cfg.startCash,
      wanted: 0,
      lastCrimeAt: -999,
      upgrades: { engine: 1, armor: false },
      cameraMode: 'chase',
      cameraYaw: Math.PI,
      cameraPitch: 0.32,
      camX: 0, camY: 10, camZ: 40,
    };
    window.__AZURA__ = game;

    // Load a safehouse save if one exists.
    const saved = AZURA.save.load();
    if (saved) {
      game.cash = saved.cash;
      game.upgrades = saved.upgrades || game.upgrades;
    }

    game.city = AZURA.city.build(scene);
    game.player = AZURA.player.create(scene);
    const traffic = AZURA.traffic.create(scene);
    game.cars = traffic.cars;
    game.peds = traffic.peds;
    game.police = AZURA.police.create(scene);
    game.missions = AZURA.missions.create(scene);
    if (saved && typeof saved.missionIndex === 'number') {
      game.missions.index = Math.min(saved.missionIndex, AZURA.missions.list.length - 1);
    }
    game.input = AZURA.input.create();
    game.audio = AZURA.audio;
    game.hud = AZURA.hud;
    game.hud.init(game);

    game.addWanted = (n) => {
      game.wanted = Math.min(cfg.maxWanted, game.wanted + n);
      game.lastCrimeAt = game.time;
    };
    game.gameOver = (reason) => {
      if (game.state !== 'playing') return;
      game.state = 'gameover';
      game.overReason = reason;
      game.hud.showGameOver(game, reason);
    };
    game.startPlaying = () => {
      game.audio.init();
      game.state = 'playing';
      game.hud.showHud(game);
      if (saved) game.hud.toast('Save loaded — welcome back to Azura Bay.');
    };
    game.resume = () => {
      game.state = 'playing';
      game.hud.showHud(game);
    };
    game.restart = () => {
      AZURA.save.clear();
      window.location.reload();
    };

    // Camera drag: hold and drag to orbit around Mara.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    renderer.domElement.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      game.cameraYaw += (e.clientX - lastX) * 0.005;
      game.cameraPitch = AZURA.utils.clamp(game.cameraPitch + (e.clientY - lastY) * 0.003, 0.08, 1.1);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('pointerup', () => { dragging = false; });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    game.hud.showMenu(game);

    // Screenshot staging runs the real game, not the menu.
    if (shot) AZURA.shots.apply(game, shot);

    let last = performance.now();
    const frame = (now) => {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (game.state === 'playing') this.step(game, dt);
      else if (game.state === 'menu') this.idleCamera(game, dt);
      this.render(game, dt);
    };
    requestAnimationFrame(frame);
    return game;
  },

  step(game, dt) {
    game.time += dt;
    const input = game.input.read();
    const pressed = game.input.takePressed();
    // One-shot keys.
    if (pressed.KeyE) this.interact(game);
    if (pressed.KeyF) AZURA.player.punch(game);
    if (pressed.KeyP || pressed.Escape) {
      game.state = 'paused';
      game.hud.showPause(game);
    }
    if (pressed.Digit1) game.audio.setStation(0);
    if (pressed.Digit2) game.audio.setStation(1);
    if (pressed.Digit3) game.audio.setStation(2);
    if (pressed.KeyM) game.audio.toggleMute();
    if (pressed.KeyG) {
      if (AZURA.utils.dist2D(game.player.x, game.player.z, game.config.garage.x, game.config.garage.z) < 18) {
        game.state = 'paused';
        game.hud.showGarage(game);
      }
    }
    AZURA.player.update(game, dt, input);
    AZURA.traffic.update(game, dt);
    AZURA.police.update(game, dt);
    AZURA.missions.update(game, dt);
    game.audio.update();
    game.hud.update(game, dt);
    this.updateCamera(game, dt);
    // Fountain water shimmer, ocean drift.
    const water = game.scene.getObjectByName('fountainWater');
    if (water) water.rotation.y += dt * 0.4;
    const ocean = game.scene.getObjectByName('ocean');
    if (ocean) ocean.position.y = -0.4 + Math.sin(game.time * 0.5) * 0.15;
  },

  interact(game) {
    const p = game.player;
    const U = AZURA.utils;
    const cfg = game.config;
    if (p.inCar) {
      AZURA.player.exitCar(game);
      return;
    }
    const car = AZURA.player.nearestCar(game, 4);
    if (car) {
      AZURA.player.enterCar(game, car);
      return;
    }
    if (U.dist2D(p.x, p.z, cfg.garage.x, cfg.garage.z) < 18) {
      game.state = 'paused';
      game.hud.showGarage(game);
      return;
    }
    if (U.dist2D(p.x, p.z, cfg.safehouse.x, cfg.safehouse.z) < 12) {
      if (AZURA.save.save(game)) {
        p.health = 100;
        game.wanted = 0;
        game.hud.toast('Saved at the safehouse — healed, heat gone.');
      }
      return;
    }
    const shop = cfg.shops.find((s) => U.dist2D(p.x, p.z, s.x, s.z) < 12);
    if (shop) {
      if (game.cash >= cfg.snackPrice && p.health < 100) {
        game.cash -= cfg.snackPrice;
        p.health = Math.min(100, p.health + 30);
        game.hud.toast(`${shop.name}: snack bought, +30 health.`);
      } else if (p.health >= 100) {
        game.hud.toast('Already full health.');
      } else {
        game.hud.toast('Not enough cash for a snack.');
      }
    }
  },

  // Slow orbit over the plaza while the menu is up.
  idleCamera(game, dt) {
    game.time += dt;
    const t = game.time * 0.05;
    game.camera.position.set(Math.sin(t) * 120, 55, Math.cos(t) * 120);
    game.camera.lookAt(0, 0, 40);
  },

  updateCamera(game, dt) {
    const U = AZURA.utils;
    const p = game.player;
    const mode = game.cameraMode;
    let tx;
    let ty;
    let tz;
    let lx;
    let ly;
    let lz;
    if (mode === 'cover') {
      tx = p.x - 6;
      ty = 8;
      tz = p.z + 18;
      lx = p.x;
      ly = 3;
      lz = p.z - 40;
    } else if (mode === 'vista') {
      tx = p.x - 40;
      ty = 60;
      tz = p.z + 90;
      lx = p.x;
      ly = 0;
      lz = p.z - 160;
    } else {
      // Chase camera: behind the player's heading, speed widens the view.
      const dist = p.inCar ? 12 : 8;
      const height = p.inCar ? 5 : 3.6;
      const yaw = p.inCar ? p.heading : game.cameraYaw;
      const px = p.inCar ? p.x : p.x;
      const pz = p.inCar ? p.z : p.z;
      tx = px + Math.sin(yaw) * dist;
      ty = height;
      tz = pz + Math.cos(yaw) * dist;
      lx = px - Math.sin(yaw) * 10;
      ly = 1.5;
      lz = pz - Math.cos(yaw) * 10;
      const speedNorm = p.inCar ? Math.abs(p.inCar.speed) / 38 : 0;
      game.camera.fov = U.lerp(62, 74, speedNorm);
      game.camera.updateProjectionMatrix();
    }
    const k = 1 - Math.pow(0.0001, dt);
    if (game.shotMode) {
      // Screenshots must frame exactly, whatever the frame rate: snap.
      game.camX = tx;
      game.camY = ty;
      game.camZ = tz;
    } else {
      game.camX = U.lerp(game.camX, tx, k);
      game.camY = U.lerp(game.camY, ty, k);
      game.camZ = U.lerp(game.camZ, tz, k);
    }
    game.camera.position.set(game.camX, game.camY, game.camZ);
    game.camera.lookAt(lx, ly, lz);
  },

  render(game, dt) {
    game.renderer.render(game.scene, game.camera);
  },
};

AZURA.main = AzuraMain;
AzuraMain.boot();

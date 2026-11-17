// Sunvale Heat — bootstrap, game loop, camera, state machine (fresh code, round 2).
// Wires every system together: renderer, menu/play/pause/busted/wasted,
// chase + orbit cameras, autosave, and the ?shot= staging hooks used to
// take the entry's screenshots from the game's own live systems.
var Game = {
  renderer: null,
  clock: null,
  saveT: 0,
  menuOrbit: 0,
  endKind: null,

  init: function () {
    var canvas = el("game-canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    SV.renderer = this.renderer;
    SV.scene = new THREE.Scene();
    SV.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    SV.camPos = new THREE.Vector3(0, 40, 120);
    SV.camera.position.copy(SV.camPos);
    this.clock = new THREE.Clock();

    City.build(SV.scene);
    Player.build(SV.scene);
    Vehicles.spawn(SV.scene);
    Pedestrians.spawn(SV.scene);
    Police.init(SV.scene);
    HUD.init();
    Input.init(canvas);
    SV.audio = AudioSys;
    SV.hud = HUD;

    window.addEventListener("resize", function () {
      SV.camera.aspect = window.innerWidth / window.innerHeight;
      SV.camera.updateProjectionMatrix();
      Game.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    // Audio unlocks on the first gesture.
    var unlock = function () { AudioSys.init(); AudioSys.resume(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    // Staged-screenshot hooks (?shot=chase|street|mission|menu).
    var params = new URLSearchParams(window.location.search);
    SV.shot = params.get("shot");
    if (SV.shot && SV.shot !== "menu") {
      this.startNew();
      this.stageShot(SV.shot);
    } else {
      HUD.showMenu(Save.has());
    }
    window.__SV = SV;
    window.__Game = Game;
    this.clock.start();
    this.loop();
    window.__ready = true;
  },

  startNew: function () {
    Save.clear();
    SV.cash = 250; SV.health = SV.maxHealth;
    SV.missionIndex = 0; SV.mission = null;
    SV.wanted = 0; SV.wantedHeat = 0; SV.lastCrimeAt = -999;
    SV.time = 0; SV.clockMin = 8 * 60 + 24;
    SV.stats = { shots: 0, hits: 0, carsStolen: 0, pedsHit: 0, missionsDone: 0 };
    if (SV.car) Vehicles.exitCar();
    SV.player.pos.set(0, 0, 26);
    SV.player.vel.set(0, 0, 0);
    SV.player.group.visible = true;
    SV.camYaw = 0.6; SV.camPitch = 0.32;
    SV.mode = "play";
    HUD.hideMenu();
    HUD.hideEnd();
    HUD.showPause(false);
    Missions.start(0);
    if (SV.audio) { SV.audio.init(); SV.audio.resume(); }
  },

  continueSave: function () {
    var d = Save.load();
    if (!d) { this.startNew(); return; }
    SV.mode = "play";
    Save.apply(d);
    if (SV.car) Vehicles.exitCar();
    SV.player.group.visible = true;
    HUD.hideMenu();
    HUD.hideEnd();
    HUD.showPause(false);
    Missions.start(SV.missionIndex);
    if (SV.audio) { SV.audio.init(); SV.audio.resume(); }
  },

  togglePause: function () {
    if (SV.mode === "play") {
      SV.mode = "paused";
      HUD.showPause(true);
      if (document.exitPointerLock) document.exitPointerLock();
    } else if (SV.mode === "paused") {
      SV.mode = "play";
      HUD.showPause(false);
    }
  },

  restartMission: function () {
    HUD.showPause(false);
    SV.mode = "play";
    Missions.start(SV.missionIndex);
  },

  toMenu: function () {
    if (SV.mode === "play" || SV.mode === "paused") Save.save();
    if (SV.car) Vehicles.exitCar();
    SV.mode = "menu";
    HUD.showPause(false);
    HUD.hideEnd();
    HUD.showMenu(Save.has());
    if (document.exitPointerLock) document.exitPointerLock();
  },

  busted: function () {
    if (SV.mode !== "play") return;
    SV.mode = "busted";
    var loss = Math.min(SV.cash, Math.max(100, Math.floor(SV.cash * 0.15)));
    SV.cash -= loss;
    SV.wanted = 0; SV.wantedHeat = 0;
    if (SV.car) Vehicles.exitCar();
    if (SV.audio) SV.audio.fail();
    if (document.exitPointerLock) document.exitPointerLock();
    HUD.showEnd("busted", "BUSTED", "Sunvale PD caught you. You lost $" + loss + " in fines. Mara is not impressed.");
    Save.save();
  },

  wasted: function () {
    if (SV.mode !== "play") return;
    SV.mode = "wasted";
    var loss = Math.min(SV.cash, Math.max(50, Math.floor(SV.cash * 0.1)));
    SV.cash -= loss;
    SV.wanted = 0; SV.wantedHeat = 0;
    if (SV.car) Vehicles.exitCar();
    if (SV.audio) SV.audio.fail();
    if (document.exitPointerLock) document.exitPointerLock();
    HUD.showEnd("wasted", "WASTED", "You woke up at Sunvale General, $" + loss + " lighter. Mara's jobs are still waiting.");
    Save.save();
  },

  afterEnd: function () {
    HUD.hideEnd();
    SV.health = SV.maxHealth;
    SV.player.pos.set(0, 0, 26);
    SV.player.vel.set(0, 0, 0);
    SV.player.group.visible = true;
    SV.mode = "play";
    Missions.start(SV.missionIndex);
  },

  tryEnterExitCar: function () {
    if (SV.mode !== "play") return;
    if (SV.car) { Vehicles.exitCar(); return; }
    var car = Vehicles.nearestParked(3.6);
    if (car) {
      Vehicles.enterCar(car);
      Police.addHeat(0.12, "theft");
    }
  },

  // Stage a live scene for a screenshot, using the game's real systems.
  stageShot: function (name) {
    var self = this;
    if (name === "chase") {
      SV.clockMin = 17 * 60 + 42;
      Missions.start(2); // Heat Check
      SV.mission.phase = "escape";
      SV.wanted = 3; SV.wantedHeat = 0.55; SV.lastCrimeAt = SV.time;
      var taxi = null;
      for (var i = 0; i < SV.cars.length; i++) if (SV.cars[i].isTaxi) taxi = SV.cars[i];
      if (taxi) {
        taxi.pos.set(-40, 0, -52);
        taxi.yaw = Math.PI / 2; // east along the street
        taxi.speed = 18;
        Vehicles.enterCar(taxi);
        SV.camYaw = Math.PI / 2;
        // Snap the chase camera behind the taxi so the shot is framed at once.
        SV.camPos.set(-40 + Math.sin(SV.camYaw + Math.PI) * 11.5, 4.6, -52 + Math.cos(SV.camYaw + Math.PI) * 11.5);
      }
      // Traffic ahead on the same street, spread across both lanes.
      var ahead = 0;
      for (var j = 0; j < SV.cars.length && ahead < 3; j++) {
        var c = SV.cars[j];
        if (c.kind === "traffic") {
          c.pos.set(10 + ahead * 26, 0, -52 + (ahead % 2 === 0 ? -3.2 : 3.2));
          c.yaw = Math.PI / 2;
          c.speed = 9;
          c.route = { horiz: true, line: -52, dir: 1 };
          ahead++;
        }
      }
      // Two police cars ahead of the taxi, in frame, converging on it.
      var mkPolice = function (x, z, speed) {
        var pc = Vehicles.makeCar(0x1a1d24, "police");
        pc.pos.set(x, 0, z);
        pc.yaw = Math.PI / 2;
        pc.speed = speed;
        var bar = boxMesh(1.1, 0.22, 0.5, 0xdddddd, 0, 1.5, -0.25);
        pc.group.add(bar);
        pc.redLamp = boxMesh(0.5, 0.26, 0.52, 0xff2222, -0.28, 1.5, -0.25);
        pc.blueLamp = boxMesh(0.5, 0.26, 0.52, 0x2266ff, 0.28, 1.5, -0.25);
        pc.group.add(pc.redLamp, pc.blueLamp);
        SV.scene.add(pc.group);
        SV.cars.push(pc);
        Police.cars.push(pc);
      };
      mkPolice(-15, -58, 10);
      mkPolice(28, -46, 9);
    } else if (name === "street") {
      SV.clockMin = 10 * 60 + 15;
      Missions.start(0);
      SV.player.pos.set(6, 0, 40);
      SV.camYaw = Math.PI; // face the downtown towers
      SV.camPitch = 0.24;
      SV.camPos.set(6, 3.5, 32);
    } else if (name === "mission") {
      SV.clockMin = 14 * 60 + 5;
      Missions.start(3); // Warehouse Bust
      // Stand south of the warehouse front, facing the guards + beacon.
      SV.player.pos.set(SV.warehouseFront.x + 8, 0, SV.warehouseFront.z + 16);
      SV.camYaw = Math.atan2(SV.warehouseFront.x - SV.player.pos.x, SV.warehouseFront.z - SV.player.pos.z) + Math.PI;
      SV.player.ammo = 12;
      SV.camPos.set(
        SV.player.pos.x + Math.sin(SV.camYaw) * 9,
        4.2,
        SV.player.pos.z + Math.cos(SV.camYaw) * 9
      );
    }
    setTimeout(function () { window.__shotReady = true; }, 600);
  },

  updateCamera: function (dt) {
    var cam = SV.camera;
    if (SV.mode === "menu") {
      this.menuOrbit += dt * 0.05;
      var r = 130;
      var tx = Math.cos(this.menuOrbit) * r, tz = Math.sin(this.menuOrbit) * r;
      SV.camPos.x = lerp(SV.camPos.x, tx, 1 - Math.pow(0.01, dt));
      SV.camPos.y = lerp(SV.camPos.y, 55, 1 - Math.pow(0.01, dt));
      SV.camPos.z = lerp(SV.camPos.z, tz, 1 - Math.pow(0.01, dt));
      cam.position.copy(SV.camPos);
      cam.lookAt(0, 8, 0);
      return;
    }
    var target;
    if (SV.car) {
      var c = SV.car;
      var back = 11.5, up = 4.6;
      var wantYaw = c.yaw;
      // Chase cam: settle behind the car, allow the player to look around.
      var camYaw = angLerp(SV.camYaw, wantYaw + Math.PI, 0.06);
      SV.camYaw = camYaw;
      target = new THREE.Vector3(
        c.pos.x + Math.sin(camYaw) * back,
        up,
        c.pos.z + Math.cos(camYaw) * back
      );
      SV.camPos.x = lerp(SV.camPos.x, target.x, 1 - Math.pow(0.001, dt));
      SV.camPos.y = lerp(SV.camPos.y, target.y, 1 - Math.pow(0.001, dt));
      SV.camPos.z = lerp(SV.camPos.z, target.z, 1 - Math.pow(0.001, dt));
      cam.position.copy(SV.camPos);
      cam.lookAt(c.pos.x, 1.8, c.pos.z);
    } else {
      var p = SV.player;
      var d = SV.camDist;
      var cx = p.pos.x + Math.sin(SV.camYaw) * Math.cos(SV.camPitch) * d;
      var cz = p.pos.z + Math.cos(SV.camYaw) * Math.cos(SV.camPitch) * d;
      var cy = p.pos.y + 1.6 + Math.sin(SV.camPitch) * d;
      SV.camPos.x = lerp(SV.camPos.x, cx, 1 - Math.pow(0.0005, dt));
      SV.camPos.y = lerp(SV.camPos.y, cy, 1 - Math.pow(0.0005, dt));
      SV.camPos.z = lerp(SV.camPos.z, cz, 1 - Math.pow(0.0005, dt));
      cam.position.copy(SV.camPos);
      cam.lookAt(p.pos.x, p.pos.y + 1.7, p.pos.z);
    }
  },

  updatePrompt: function () {
    if (SV.mode !== "play") { HUD.setPrompt(null); return; }
    if (!SV.car) {
      var car = Vehicles.nearestParked(3.6);
      if (car) { HUD.setPrompt("E — Steal " + (car.isTaxi ? "taxi" : "car")); return; }
    } else {
      HUD.setPrompt("E — Exit car   ·   Shift — Boost   ·   Space — Handbrake");
      return;
    }
    HUD.setPrompt(null);
  },

  loop: function () {
    var self = this;
    requestAnimationFrame(function () { self.loop(); });
    var dt = Math.min(this.clock.getDelta(), 0.05) * SV.timeScale;
    if (SV.mode === "play") {
      SV.time += dt;
      SV.clockMin += dt * 0.22;
      Player.update(dt);
      Vehicles.update(dt);
      Pedestrians.update(dt);
      Police.update(dt);
      Missions.update(dt);
      Combat.update(dt);
      if (SV.audio) SV.audio.update(dt);
      if (SV.sea) SV.sea.position.y = 0.05 + Math.sin(SV.time * 0.7) * 0.06;
      if (SV.fountainTop) SV.fountainTop.position.y = 5.6 + Math.sin(SV.time * 2.2) * 0.25;
      this.updatePrompt();
      this.saveT += dt;
      if (this.saveT > 25) { this.saveT = 0; Save.save(); }
    }
    this.updateCamera(dt);
    HUD.update(dt);
    this.renderer.render(SV.scene, SV.camera);
  }
};

window.addEventListener("DOMContentLoaded", function () { Game.init(); });

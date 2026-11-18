// Azura Bay — boot and the one loop. The world advances in fixed 1/60 s
// steps; the renderer paints what is there. Screens: title, play, paused,
// wasted and busted. ?shot=cover|drive|mission|vista stages a frozen scene
// for a screenshot instead of running the loop.
import { CITY, MONEY, PALETTE, PLAYER, RADIO_STATIONS, STEP } from './config.js';
import { makeRng } from './random.js';
import { buildWorld, nearestRoadPoint } from './world.js';
import { carForward, createTraffic, makeVehicle, stepTraffic } from './vehicles.js';
import { createPedestrians, nearestPedestrian, stepPedestrians } from './people.js';
import { addHeat, clearPolice, createPolice, stepPolice } from './police.js';
import { advanceStep, createMissions, currentStep, failJob, startJob, stepMissions, stepTarget } from './missions.js';
import { createHud, drawMinimap, hideScreen, renderHud, showScreen } from './hud.js';
import { createAudio, nextStation, playSfx, startAudio, stepAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MISSION, ACTION_PAUSE, ACTION_PUNCH, ACTION_RADIO, createInput } from './input.js';
import { shotName, stageShot } from './shots.js';
import { readSave, writeSave } from './save.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 120, 620);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 40, 80);

const sun = new THREE.DirectionalLight(0xffe6b8, 2.6);
sun.position.set(-180, 220, -120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -320;
sun.shadow.camera.right = 320;
sun.shadow.camera.top = 320;
sun.shadow.camera.bottom = -320;
sun.shadow.camera.far = 800;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffd9a0, 0x4a5a6a, 0.85));

const rng = makeRng(seed);
const world = buildWorld(rng);
scene.add(world.group);
const traffic = createTraffic(scene, rng.fork(101));
const pedestrians = createPedestrians(scene, rng.fork(202));
const police = createPolice(scene);
const missions = createMissions();
const hud = createHud();
const audio = createAudio();
const input = createInput();

// The mission beacon: a glowing gold disc and a beam of light.
const beaconMat = new THREE.MeshStandardMaterial({ color: 0xffd24d, emissive: 0xffb800, emissiveIntensity: 2.2 });
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 24), beaconMat);
beacon.visible = false;
scene.add(beacon);
const beam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 1.1, 26, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
);
beam.visible = false;
scene.add(beam);

// Mara Voss on foot: a red jacket, dark jeans, distinct from the crowd.
function makePlayerFigure() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.85, 8), jeans);
  legs.position.y = 0.42;
  legs.castShadow = true;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.72, 8), jacket);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9 }));
  hair.position.y = 1.84;
  group.add(hair);
  return group;
}

const saved = readSave();
const player = {
  x: world.locations.safehouse.x,
  z: world.locations.safehouse.z,
  heading: Math.PI / 2,
  health: PLAYER.health,
  money: saved ? saved.money : MONEY.start,
  inCar: false,
  car: null,
  figure: makePlayerFigure(),
  punchTimer: 0,
  bustedTimer: 0,
  upgrades: saved ? saved.upgrades || {} : {},
  jobsDone: saved ? saved.jobsDone || 0 : 0,
  bestMoney: saved ? saved.bestMoney || 0 : 0,
};
player.figure.position.set(player.x, 0, player.z);
scene.add(player.figure);

const game = {
  scene,
  camera,
  renderer,
  world,
  player,
  police,
  missions,
  traffic,
  pedestrians,
  beacon,
  beam,
  rng: rng.fork(303),
  policeStep(dt) {
    stepPolice(police, scene, dt, game.rng, player, onRam);
  },
};

let screen = 'title';
let camPos = new THREE.Vector3(0, 40, 80);
let camLook = new THREE.Vector3(0, 0, 0);
let titleAngle = 0;

function announce(message) {
  status.textContent = message;
}

function resetPlayerToSafehouse() {
  player.x = world.locations.safehouse.x;
  player.z = world.locations.safehouse.z;
  player.heading = Math.PI / 2;
  player.health = PLAYER.health;
  player.inCar = false;
  if (player.car) {
    scene.remove(player.car.group);
    player.car = null;
  }
  clearPolice(police, scene);
  missions.current = -1;
  player.figure.position.set(player.x, 0, player.z);
  scene.add(player.figure);
}

function startGame() {
  startAudio(audio);
  hideScreen(hud);
  screen = 'play';
  announce('Playing. Mara Voss is on the streets of Azura Bay.');
}

function endGame(kind) {
  screen = kind;
  if (player.money > player.bestMoney) player.bestMoney = player.money;
  const text =
    kind === 'wasted'
      ? `Mara is down. The crew keeps $${Math.floor(player.money).toLocaleString('en-US')} — the jobs are still waiting.<br><br>Press Enter to get back up at the Safehouse.`
      : `The Azura Bay police took Mara in. The crew keeps $${Math.floor(player.money).toLocaleString('en-US')} — the jobs are still waiting.<br><br>Press Enter to get back out at the Safehouse.`;
  showScreen(hud, kind, kind === 'wasted' ? 'WASTED' : 'BUSTED', text);
  announce(kind === 'wasted' ? 'Wasted.' : 'Busted.');
  playSfx(audio, 'fail');
}

// --- Collisions -------------------------------------------------------------
function buildingHit(x, z, radius) {
  for (const b of world.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + radius && Math.abs(z - b.z) < b.d / 2 + radius) return b;
  }
  return null;
}

function resolveBuilding(x, z, radius) {
  const b = buildingHit(x, z, radius);
  if (!b) return { x, z, hit: false };
  const dx = x - b.x;
  const dz = z - b.z;
  const px = b.w / 2 + radius - Math.abs(dx);
  const pz = b.d / 2 + radius - Math.abs(dz);
  if (px < pz) return { x: b.x + Math.sign(dx || 1) * (b.w / 2 + radius), z, hit: true };
  return { x, z: b.z + Math.sign(dz || 1) * (b.d / 2 + radius), hit: true };
}

// --- Driving ----------------------------------------------------------------
function stepCar(dt) {
  const car = player.car;
  const fwd = input.forward();
  const back = input.back();
  const steerInput = input.steer();
  const handbrake = input.handbrake();
  const accel = fwd ? 16 : back ? -10 : 0;
  const drag = handbrake ? 14 : 3.5;
  car.speed += accel * dt;
  car.speed -= car.speed * drag * dt * 0.35;
  car.speed = Math.max(-10, Math.min(38, car.speed));
  if (!fwd && !back && Math.abs(car.speed) < 0.4) car.speed = 0;
  const steerTarget = steerInput * 0.55 * (car.speed >= 0 ? 1 : -1);
  const steerRate = handbrake ? 3.4 : 2.4;
  car.steer += Math.max(-steerRate * dt, Math.min(steerRate * dt, steerTarget - car.steer));
  car.heading += (car.steer * car.speed * dt) / 2.6;
  const nx = car.x + Math.cos(car.heading) * car.speed * dt;
  const nz = car.z - Math.sin(car.heading) * car.speed * dt;
  const resolved = resolveBuilding(nx, nz, 1.6);
  if (resolved.hit && Math.abs(car.speed) > 6) {
    playSfx(audio, 'crash');
    addHeat(police, 0);
    car.speed *= 0.35;
  }
  car.x = Math.max(CITY.minX, Math.min(CITY.maxX, resolved.x));
  car.z = Math.max(CITY.minZ, Math.min(CITY.maxZ, resolved.z));
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
  for (const wheel of car.wheels) {
    wheel.rotation.z -= (car.speed * dt) / 0.36;
    wheel.rotation.y = car.steer * 0.5;
  }
  // Shove traffic cars and knock down pedestrians in the way.
  for (const other of traffic) {
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4.4 && dist > 0.01) {
      const push = (4.4 - dist) * 0.5;
      other.x += (dx / dist) * push;
      other.z += (dz / dist) * push;
      if (Math.abs(car.speed) > 8) {
        car.speed *= 0.92;
        playSfx(audio, 'crash');
      }
    }
  }
  for (const w of pedestrians) {
    const dx = w.x - car.x;
    const dz = w.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.6 && Math.abs(car.speed) > 5) {
      w.x += (dx / (dist || 1)) * 6;
      w.z += (dz / (dist || 1)) * 6;
      w.fleeing = true;
      w.speed = 4.2;
      addHeat(police, 1);
      playSfx(audio, 'crash');
    }
  }
}

// --- On foot ----------------------------------------------------------------
function stepOnFoot(dt) {
  const run = input.run();
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const steerInput = input.steer();
  player.heading += steerInput * 2.6 * dt;
  let move = 0;
  if (input.forward()) move = 1;
  else if (input.back()) move = -0.55;
  const nx = player.x + Math.cos(player.heading) * move * speed * dt;
  const nz = player.z - Math.sin(player.heading) * move * speed * dt;
  const resolved = resolveBuilding(nx, nz, 0.6);
  player.x = Math.max(CITY.minX, Math.min(CITY.maxX, resolved.x));
  player.z = Math.max(CITY.minZ, Math.min(CITY.maxZ, resolved.z));
  player.figure.position.set(player.x, 0, player.z);
  player.figure.rotation.y = player.heading;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.bustedTimer > 0 && police.stars === 0) player.bustedTimer = 0;
}

// --- Interactions -----------------------------------------------------------
function nearestStealableCar() {
  let best = null;
  let bestD = 4;
  for (const car of traffic) {
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  if (player.car) {
    const d = Math.hypot(player.car.x - player.x, player.car.z - player.z);
    if (d < bestD) return player.car;
  }
  return best;
}

function enterCar() {
  const target = nearestStealableCar();
  if (!target) return;
  const stolen = target !== player.car;
  if (stolen) {
    const index = traffic.indexOf(target);
    if (index >= 0) traffic.splice(index, 1);
    if (player.car) scene.remove(player.car.group);
    player.car = target;
    addHeat(police, 1);
    announce('Car stolen — the police noticed.');
  }
  player.inCar = true;
  scene.remove(player.figure);
  player.x = target.x;
  player.z = target.z;
  player.heading = target.heading;
}

function exitCar() {
  if (!player.car) return;
  player.inCar = false;
  const side = { x: player.car.x - Math.sin(player.car.heading) * 2.4, z: player.car.z - Math.cos(player.car.heading) * 2.4 };
  player.x = side.x;
  player.z = side.z;
  player.heading = player.car.heading;
  player.figure.position.set(player.x, 0, player.z);
  scene.add(player.figure);
}

function punch() {
  if (player.punchTimer > 0 || player.inCar) return;
  player.punchTimer = PLAYER.punchCooldown;
  playSfx(audio, 'punch');
  const target = nearestPedestrian(pedestrians, player.x, player.z, PLAYER.punchRange);
  if (target) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const dist = Math.hypot(dx, dz) || 1;
    target.x += (dx / dist) * 5;
    target.z += (dz / dist) * 5;
    target.fleeing = true;
    target.speed = 4.2;
    addHeat(police, 1);
  }
}

function onRam() {
  player.health -= 6;
  playSfx(audio, 'crash');
  if (player.health <= 0) endGame('wasted');
}

// --- Missions ---------------------------------------------------------------
function updateMissions(dt) {
  const timedOut = stepMissions(missions, dt);
  if (timedOut === 'timeout') {
    failJob(missions, 'the clock ran out');
    playSfx(audio, 'fail');
    return;
  }
  const step = currentStep(missions);
  if (!step) {
    beacon.visible = false;
    beam.visible = false;
    return;
  }
  if (step.type === 'goto') {
    const d = Math.hypot(step.x - player.x, step.z - player.z);
    beacon.position.set(step.x, 0.15, step.z);
    beam.position.set(step.x, 13, step.z);
    beacon.visible = true;
    beam.visible = true;
    beacon.scale.setScalar(1 + Math.sin(performance.now() / 240) * 0.15);
    if (d < 6) {
      const result = advanceStep(missions);
      playSfx(audio, 'pickup');
      if (result.complete) {
        player.money += result.pay;
        playSfx(audio, 'cash');
      }
    }
  } else if (step.type === 'enter') {
    beacon.visible = false;
    beam.visible = false;
    if (player.inCar) {
      const result = advanceStep(missions);
      if (result.complete) {
        player.money += result.pay;
        playSfx(audio, 'cash');
      }
    }
  } else if (step.type === 'escape') {
    beacon.visible = false;
    beam.visible = false;
    if (police.stars === 0) {
      const result = advanceStep(missions);
      if (result.complete) {
        player.money += result.pay;
        playSfx(audio, 'cash');
      }
    }
  }
  // A step that raises the heat when it is reached.
  if (step.wanted && police.stars < step.wanted) {
    const d = Math.hypot(step.x - player.x, step.z - player.z);
    if (d < 8) addHeat(police, step.wanted - police.stars);
  }
}

function startNextJob() {
  if (missions.current >= 0) return;
  const index = missions.done % missions.jobs.length;
  startJob(missions, index);
  playSfx(audio, 'pickup');
}

// --- Camera -----------------------------------------------------------------
function updateCamera(dt) {
  const fwd = carForward({ heading: player.heading });
  let wantPos;
  let wantLook;
  if (player.inCar) {
    wantPos = new THREE.Vector3(player.x - fwd.x * 11, 4.6, player.z - fwd.z * 11);
    wantLook = new THREE.Vector3(player.x + fwd.x * 8, 1.4, player.z + fwd.z * 8);
  } else {
    wantPos = new THREE.Vector3(player.x - fwd.x * 7, 3.4, player.z - fwd.z * 7);
    wantLook = new THREE.Vector3(player.x + fwd.x * 5, 1.4, player.z + fwd.z * 5);
  }
  const k = 1 - Math.exp(-6 * dt);
  camPos.lerp(wantPos, k);
  camLook.lerp(wantLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// --- The step ---------------------------------------------------------------
function step(dt) {
  if (screen === 'title') {
    titleAngle += dt * 0.05;
    camera.position.set(Math.cos(titleAngle) * 190, 95, Math.sin(titleAngle) * 190);
    camera.lookAt(40, 0, 0);
    stepTraffic(traffic, dt, game.rng, null);
    stepPedestrians(pedestrians, dt, game.rng, []);
    return;
  }
  if (screen !== 'play') return;

  if (player.inCar) stepCar(dt);
  else stepOnFoot(dt);

  stepTraffic(traffic, dt, game.rng, player.inCar ? player.car : null);
  const threats = [];
  if (player.inCar && Math.abs(player.car.speed) > 6) threats.push({ x: player.x, z: player.z, radius: 12 });
  stepPedestrians(pedestrians, dt, game.rng, threats);
  stepPolice(police, scene, dt, game.rng, player, onRam);
  updateMissions(dt);

  // Busted: caught on foot by a cruiser that stays close. The player has a
  // few seconds to break away before the arrest sticks.
  if (!player.inCar && police.stars > 0) {
    let close = false;
    for (const cop of police.cruisers) {
      if (Math.hypot(cop.x - player.x, cop.z - player.z) < 3.5) close = true;
    }
    if (close) {
      player.bustedTimer += dt;
      if (player.bustedTimer > 4) endGame('busted');
    } else player.bustedTimer = 0;
  }

  // Save at the safehouse.
  const house = world.locations.safehouse;
  if (Math.hypot(house.x - player.x, house.z - player.z) < 8 && !player.inCar) {
    if (writeSave({ money: player.money, jobsDone: missions.done, upgrades: player.upgrades, bestMoney: player.bestMoney })) {
      announce('Progress saved at the Safehouse.');
    }
  }

  updateCamera(dt);
  stepAudio(audio, dt, player.inCar ? player.car.speed : 0, police.stars);

  const target = stepTarget(missions);
  const stepNow = currentStep(missions);
  renderHud(hud, {
    stars: police.stars,
    money: player.money,
    health: player.health,
    speed: player.inCar ? player.car.speed : 0,
    inCar: player.inCar,
    objective: stepNow ? stepNow.text : null,
    objectiveDist: target ? Math.hypot(target.x - player.x, target.z - player.z) : null,
    station: RADIO_STATIONS[audio.station].name,
    message: missions.message,
    messageTime: missions.messageTime,
  });
  drawMinimap(hud, world, player, police, target, traffic);
}

function handleActions() {
  const actions = input.takeActions();
  if (screen === 'title' || screen === 'wasted' || screen === 'busted') {
    if (actions & ACTION_CONFIRM) {
      if (screen !== 'title') resetPlayerToSafehouse();
      startGame();
    }
    return;
  }
  if (actions & ACTION_PAUSE) {
    if (screen === 'play') {
      screen = 'paused';
      showScreen(hud, 'paused', 'PAUSED', 'Take a breath. The city waits.<br><br>Press P or Enter to keep playing.');
      announce('Paused.');
    } else if (screen === 'paused') {
      hideScreen(hud);
      screen = 'play';
      announce('Playing.');
    }
    return;
  }
  if (screen !== 'play') return;
  if (actions & ACTION_ENTER) {
    if (player.inCar) exitCar();
    else enterCar();
  }
  if (actions & ACTION_PUNCH) punch();
  if (actions & ACTION_RADIO) {
    const name = nextStation(audio);
    missions.message = `Radio: ${name}`;
    missions.messageTime = 2;
  }
  if (actions & ACTION_MISSION) startNextJob();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleActions();
  let acc = dt;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  if (screen === 'title' || screen === 'play') renderer.render(scene, camera);
}

let last = performance.now();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') {
    screen = 'paused';
    showScreen(hud, 'paused', 'PAUSED', 'Take a breath. The city waits.<br><br>Press P or Enter to keep playing.');
  }
});

// Debug and playtest hook: the automated playtest drives and inspects the
// game through this. It changes nothing about how the game plays.
window.__azura = { player, police, missions, traffic, pedestrians, world, game, screen: () => screen };

// --- Screenshot staging -----------------------------------------------------
if (shotParam) {
  hideScreen(hud);
  const name = shotName(shotParam);
  // A parked starter car for the player to drive in the shots.
  const starterCar = makeVehicle('sedan', world.locations.safehouse.x, world.locations.safehouse.z, 0, 0xc23a2e);
  player.car = starterCar;
  stageShot(name, game);
  const target = stepTarget(missions);
  const stepNow = currentStep(missions);
  renderHud(hud, {
    stars: police.stars,
    money: player.money,
    health: player.health,
    speed: player.inCar && player.car ? player.car.speed : 0,
    inCar: player.inCar,
    objective: stepNow ? stepNow.text : null,
    objectiveDist: target ? Math.hypot(target.x - player.x, target.z - player.z) : null,
    station: RADIO_STATIONS[audio.station].name,
    message: missions.message,
    messageTime: 6,
  });
  drawMinimap(hud, world, player, police, target, traffic);
  let painted = 0;
  const paint = () => {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else {
      window.__SHOT_READY = true;
      window.__shotReady = true;
    }
  };
  requestAnimationFrame(paint);
} else {
  showScreen(
    hud,
    'title',
    'AZURA BAY',
    'Mara Voss is back in Azura Bay — getaway driver, no crew, one last shot at the big score.<br><br>' +
      'Steal cars, outrun the police, run eight jobs across the city, and stash your cash at the Safehouse.<br><br>' +
      'WASD move / drive · E enter car · F punch · M next job · R radio · P pause<br><br>' +
      'Press Enter or click to start.',
  );
  announce('Azura Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

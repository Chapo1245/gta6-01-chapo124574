// main.js — Sunvale Heat entrypoint: boot, game loop, camera, menus, save,
// busted/wasted flows and deterministic screenshot staging (?shot=...).
import { buildCity } from './city.js';
import { Cars } from './cars.js';
import { Player } from './player.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { SaveSys } from './save.js';
import { Input } from './input.js';
import { Effects } from './effects.js';

const THREE = window.THREE;
const world = {
  state: 'menu', // menu | playing | paused | busted | wasted
  cash: 0, gameMinutes: 9 * 60,
  camYaw: Math.PI * 0.75, camPitch: 0.35,
  playerCar: null, lastMouseAt: 0, playSeconds: 0,
};
world.combat = Combat;
world.Input = Input;

function $(id) { return document.getElementById(id); }

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('app').appendChild(renderer.domElement);
  world.renderer = renderer;
  const scene = new THREE.Scene();
  world.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
  world.camera = camera;
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  world.city = buildCity(scene);
  Effects.init(scene);
  world.effects = Effects;
  world.cars = Cars;
  world.player = Player;
  world.pedestrians = Pedestrians;
  world.police = Police;
  world.missions = Missions;
  world.hud = HUD;
  world.audio = AudioSys;
  world.save = saveGame;
  world.busted = busted;
  world.wasted = wasted;
  world.onCarExploded = onCarExploded;

  HUD.init();
  Cars.init(world);
  Player.init(world);
  Pedestrians.init(world);
  Police.init(world);
  Missions.init(world);
  Input.init(renderer.domElement);

  // key bindings that live at the top level
  Input.onPress('KeyE', () => {
    if (world.state !== 'playing') return;
    if (world.playerCar) Player.exitCar(world);
    else {
      const car = Cars.nearestStealable(Player.pos.x, Player.pos.z);
      if (car) Player.enterCar(car, world);
    }
  });
  Input.onPress('KeyM', () => {
    if (world.state !== 'playing') return;
    const next = Missions.nextMission();
    if (next && !Missions.current) Missions.startMission(next);
  });
  Input.onPress('KeyP', () => togglePause());
  Input.onPress('Escape', () => { if (world.state === 'playing') togglePause(); });
  Input.onPress('KeyN', () => {
    AudioSys.setMuted(!AudioSys.isMuted());
    HUD.toast(AudioSys.isMuted() ? 'Sound muted' : 'Sound on', 2);
  });
  $('play-btn').addEventListener('click', () => { AudioSys.unlock(); startGame(false); });
  $('continue-btn').addEventListener('click', () => { AudioSys.unlock(); startGame(true); });
  $('resume-btn').addEventListener('click', () => togglePause());
  $('quit-btn').addEventListener('click', () => { world.state = 'menu'; showMenu(); });
  $('busted-btn').addEventListener('click', () => respawn('police'));
  $('wasted-btn').addEventListener('click', () => respawn('hospital'));

  buildMissionList();
  const save = SaveSys.load();
  if (save && (save.cash > 0 || save.missionsDone.length > 0)) {
    $('continue-btn').classList.remove('hidden');
    $('continue-info').textContent = `$${save.cash} · ${save.missionsDone.length} jobs done`;
  }
  // debug / automation handle (read-only state for play-testing)
  window.__sunvale = world;
  showMenu();
  stageShot();
  renderer.setAnimationLoop(tick);
}

function buildMissionList() {
  const el = $('mission-list');
  const save = SaveSys.load();
  const done = save ? save.missionsDone : [];
  el.innerHTML = Missions.defs.map((d, i) => {
    const cls = done.includes(d.id) ? 'done' : (i === done.length ? 'next' : 'todo');
    const mark = done.includes(d.id) ? '✓' : (i === done.length ? '►' : '·');
    return `<div class="${cls}">${mark} ${i + 1}. ${d.name} — $${d.reward}</div>`;
  }).join('');
}

function exitPointerLock() {
  // When a menu/overlay takes over, free the mouse so its buttons are
  // clickable at once (pointer lock would otherwise swallow the click).
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}
}

function showMenu() {
  exitPointerLock();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('busted').classList.add('hidden');
  $('wasted').classList.add('hidden');
  buildMissionList();
}

function startGame(useSave) {
  const save = useSave ? SaveSys.load() : null;
  world.cash = save ? save.cash : 0;
  Player.health = save ? save.health : 100;
  Player.ammo = 12;
  Player.reserveAmmo = save ? save.ammo : 48;
  Missions.done = save ? [...save.missionsDone] : [];
  world.gameMinutes = 9 * 60;
  world.state = 'playing';
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  Input.clearClick(); // a stale click on the menu button must not fire the gun
  AudioSys.startMusic();
  HUD.toast('Welcome to Sunvale. Press M for your first job.', 5);
  HUD.setObjective('Press M to start your first job');
}

function togglePause() {
  if (world.state === 'playing') {
    world.state = 'paused';
    exitPointerLock();
    $('pause').classList.remove('hidden');
  } else if (world.state === 'paused') {
    world.state = 'playing';
    $('pause').classList.add('hidden');
  }
}

function fineAmount() {
  return Math.max(100, Math.round(world.cash * 0.1));
}
function busted() {
  if (world.state !== 'playing') return;
  const fine = fineAmount();
  world.cash = Math.max(0, world.cash - fine);
  if (world.playerCar) { world.playerCar.speed = 0; Player.exitCar(world); }
  Police.clearWanted();
  world.state = 'busted';
  exitPointerLock();
  $('busted-fine').textContent = '$' + fine;
  $('busted').classList.remove('hidden');
  AudioSys.busted();
  AudioSys.engine(0, false);
  AudioSys.siren(false);
  saveGame();
}
function wasted() {
  if (world.state !== 'playing') return;
  const fine = fineAmount();
  world.cash = Math.max(0, world.cash - fine);
  if (world.playerCar) Player.exitCar(world);
  Police.clearWanted();
  world.state = 'wasted';
  exitPointerLock();
  $('wasted-fine').textContent = '$' + fine;
  $('wasted').classList.remove('hidden');
  AudioSys.sting(false);
  AudioSys.engine(0, false);
  saveGame();
}
function respawn(kind) {
  const lm = kind === 'police' ? world.city.landmarks.policeStation : world.city.landmarks.hospital;
  Player.pos.set(lm.x + 6, 0, lm.z + 6);
  Player.health = 100;
  Player.ammo = 12; Player.reserveAmmo = 48;
  world.state = 'playing';
  $('busted').classList.add('hidden');
  $('wasted').classList.add('hidden');
  HUD.toast(kind === 'police' ? 'Back on the streets. Stay clean.' : 'Patched up. The city is still yours.', 4);
}
function onCarExploded(car) {
  if (car === world.playerCar) {
    world.playerCar = null;
    car.driver = null;
    Player.mesh.visible = true;
    const side = { x: Math.sin(car.heading), z: Math.cos(car.heading) };
    Player.pos.set(car.pos.x + side.x * 2.5, 0, car.pos.z + side.z * 2.5);
    AudioSys.engine(0, false);
    // the blast hurts: 45 damage, and wasted() fires if that kills Jace
    Player.invulnUntil = 0;
    Combat.damagePlayer(45, world);
  }
}
function saveGame() {
  SaveSys.save({
    cash: world.cash,
    missionsDone: Missions.done,
    health: Math.round(Player.health),
    ammo: Player.reserveAmmo,
    playMinutes: Math.round(world.playSeconds / 60),
  });
}

// --- deterministic screenshot staging (?shot=chase|street|mission|menu) ---
function stageShot() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (!shot || shot === 'menu') return;
  startGame(false);
  world.gameMinutes = shot === 'chase' ? 17 * 60 + 30 : shot === 'street' ? 10 * 60 + 15 : 16 * 60 + 45;
  if (shot === 'chase') {
    const taxi = Cars.parked[0];
    taxi.mesh.position.set(-26, 0, 92);
    taxi.heading = Math.PI / 2; taxi.targetHeading = Math.PI / 2; taxi.axis = 'z'; taxi.dir = -1;
    Player.enterCar(taxi, world);
    taxi.speed = 12;
    world.cash = 1250;
    // police ahead-left and behind, traffic ahead (mission 3's onStart adds the 3-star heat)
    const p1 = Cars.spawnPolice(-32, 74);
    p1.heading = Math.PI / 2; p1.targetHeading = Math.PI / 2;
    const p2 = Cars.spawnPolice(-20, 108);
    p2.heading = Math.PI / 2; p2.targetHeading = Math.PI / 2;
    Police.cars.push(p1, p2);
    const t1 = Cars.traffic[0];
    t1.mesh.position.set(-26, 0, 42); t1.axis = 'z'; t1.dir = -1; t1.heading = Math.PI / 2; t1.targetHeading = Math.PI / 2; t1.speed = 10;
    const t2 = Cars.traffic[1];
    t2.mesh.position.set(-26, 0, 18); t2.axis = 'z'; t2.dir = -1; t2.heading = Math.PI / 2; t2.targetHeading = Math.PI / 2; t2.speed = 9;
    Missions.startMission(Missions.defs[2]);
    Missions.current.stepTime = 33; // 12s left on the clock
    world.camYaw = Math.PI; world.camPitch = 0.3;
  } else if (shot === 'street') {
    Player.pos.set(-14, 0, 44);
    Player.heading = Math.PI;
    const taxi = Cars.parked[0];
    taxi.mesh.position.set(-19, 0, 30); taxi.heading = Math.PI / 2;
    Missions.startMission(Missions.defs[0]);
    world.camYaw = Math.PI * 0.9; world.camPitch = 0.32;
  } else if (shot === 'mission') {
    const wh = world.city.landmarks.warehouse;
    Player.pos.set(wh.x + 14, 0, wh.z + 12);
    Player.heading = Math.PI * 0.8;
    Police.addHeat(2, 'warehouse bust');
    Missions.startMission(Missions.defs[3]);
    Missions.current.step = 1;
    Missions.spawnGuards();
    HUD.setObjective('Clear the four guards');
    world.camYaw = Math.PI * 0.85; world.camPitch = 0.3;
  }
}

// --- camera + loop ---
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const cam = world.camera;
  if (world.state === 'menu') {
    const t = performance.now() * 0.00004;
    cam.position.set(Math.cos(t) * 190, 62, Math.sin(t) * 190);
    cam.lookAt(0, 18, 0);
    return;
  }
  const anchor = world.playerCar ? world.playerCar.pos : Player.pos;
  camTarget.set(anchor.x, (anchor.y || 0) + 2.3, anchor.z);
  // driving: camera settles behind the car unless the mouse moved recently
  if (world.playerCar && performance.now() / 1000 - world.lastMouseAt > 2.5) {
    const want = world.playerCar.heading + Math.PI / 2;
    let dh = want - world.camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    world.camYaw += dh * Math.min(1, dt * 2.2);
  }
  const dist = world.playerCar ? 11 : 8.5;
  const cp = world.camPitch;
  const fx = Math.sin(world.camYaw), fz = Math.cos(world.camYaw);
  const shake = Effects.getShake();
  const sx = (Math.random() - 0.5) * shake * 0.5, sy = (Math.random() - 0.5) * shake * 0.5;
  cam.position.set(
    camTarget.x - fx * dist * Math.cos(cp) + sx,
    camTarget.y + dist * Math.sin(cp) + sy,
    camTarget.z - fz * dist * Math.cos(cp));
  cam.lookAt(camTarget.x, camTarget.y, camTarget.z);
}

let lastT = performance.now();
let saveTimer = 0;
function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  // mouse look
  const md = Input.mouseDelta();
  if (md.x !== 0 || md.y !== 0) {
    world.lastMouseAt = now / 1000;
    world.camYaw -= md.x * 0.0032;
    world.camPitch = Math.max(0.05, Math.min(1.0, world.camPitch + md.y * 0.003));
  }
  if (world.state === 'playing') {
    world.playSeconds += dt;
    world.gameMinutes += dt; // 1 real second = 1 game minute
    Player.update(dt, world);
    Cars.update(dt, world);
    Pedestrians.update(dt, world);
    Police.update(dt, world);
    Missions.update(dt, world);
    saveTimer += dt;
    if (saveTimer > 30) { saveTimer = 0; saveGame(); }
  }
  world.city.update(dt);
  Effects.update(dt);
  updateCamera(dt);
  if (world.state === 'playing') HUD.update(world, dt);
  // sun shadow follows the player
  const ap = world.playerCar ? world.playerCar.pos : Player.pos;
  world.city.sun.position.set(ap.x + 120, 180, ap.z + 60);
  world.city.sun.target.position.set(ap.x, 0, ap.z);
  world.renderer.render(world.scene, world.camera);
}

window.addEventListener('error', (e) => {
  const m = $('message');
  if (m) { m.textContent = 'Error: ' + (e.message || e.error); m.style.opacity = '1'; }
});

boot();

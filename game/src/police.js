// The wanted system: heat rises with crimes and cools when the player lies
// low. Cruisers spawn at the edge of sight, chase the player and ram; at
// three stars a helicopter joins and keeps a searchlight on the player.
import { CITY, WANTED } from './config.js';
import { makeVehicle } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createPolice(scene) {
  return {
    stars: 0,
    heat: 0,
    quietTime: 0,
    cruisers: [],
    heli: null,
    heliLight: null,
    sirenPhase: 0,
  };
}

function spawnCruiser(scene, police, px, pz, rng) {
  const angle = rng.next() * Math.PI * 2;
  const raw = {
    x: px + Math.cos(angle) * WANTED.copSpawnRadius,
    z: pz + Math.sin(angle) * WANTED.copSpawnRadius,
  };
  // Cruisers spawn on a road, never inside a building.
  const spot = nearestRoadPoint(raw.x, raw.z);
  const car = makeVehicle('police', spot.x, spot.z, Math.atan2(-(pz - spot.z), px - spot.x), 0xf2f2f2);
  car.ramTimer = 0;
  scene.add(car.group);
  police.cruisers.push(car);
  return car;
}

function spawnHeli(scene, police) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.5, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 1.8), bodyMat);
  body.castShadow = true;
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), bodyMat);
  tail.position.set(-3.4, 0.3, 0);
  group.add(tail);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.6 }),
  );
  glass.position.set(1.6, 0.2, 0);
  group.add(glass);
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.6 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.4), rotorMat);
  rotor.position.y = 1.1;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.4), rotorMat);
  tailRotor.position.set(-5, 0.3, 0);
  group.add(tailRotor);
  const light = new THREE.SpotLight(0xfff2c8, 2.2, 90, 0.32, 0.5, 1);
  light.position.set(0, -0.8, 0);
  group.add(light);
  const target = new THREE.Object3D();
  group.add(target);
  light.target = target;
  scene.add(group);
  police.heli = { group, rotor, tailRotor, light, target, x: 0, z: 0, angle: 0 };
}

export function addHeat(police, amount) {
  police.heat = Math.min(WANTED.maxStars, police.heat + amount);
  police.stars = Math.ceil(police.heat);
  police.quietTime = 0;
}

export function stepPolice(police, scene, dt, rng, player, onRam) {
  // Heat cools after a stretch with no new crime.
  police.quietTime += dt;
  if (police.quietTime > WANTED.decayDelay && police.heat > 0) {
    police.heat = Math.max(0, police.heat - WANTED.decayPerSecond * dt);
    police.stars = Math.ceil(police.heat);
  }
  const wanted = police.stars;
  const wantCruisers = wanted === 0 ? 0 : Math.min(WANTED.maxCruisers, wanted + 1);
  while (police.cruisers.length < wantCruisers) {
    spawnCruiser(scene, police, player.x, player.z, rng);
  }
  while (police.cruisers.length > wantCruisers) {
    const gone = police.cruisers.pop();
    scene.remove(gone.group);
  }
  // Cruisers chase and ram.
  for (const cop of police.cruisers) {
    if (cop.ramTimer > 0) cop.ramTimer -= dt;
    const dx = player.x - cop.x;
    const dz = player.z - cop.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(-dz, dx);
    let diff = wantHeading - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const targetSpeed = dist > 8 ? 26 : 12;
    cop.speed += Math.max(-22 * dt, Math.min(16 * dt, targetSpeed - cop.speed));
    cop.x += Math.cos(cop.heading) * cop.speed * dt;
    cop.z += -Math.sin(cop.heading) * cop.speed * dt;
    cop.group.position.set(cop.x, 0, cop.z);
    cop.group.rotation.y = cop.heading;
    for (const wheel of cop.wheels) wheel.rotation.z -= (cop.speed * dt) / 0.36;
    if (dist < 3.4 && cop.speed > 4 && cop.ramTimer <= 0) {
      onRam(cop);
      cop.ramTimer = 1.5;
      cop.speed *= -0.25;
    }
  }
  // Helicopter at three stars and above.
  if (wanted >= WANTED.heliAtStars && !police.heli) spawnHeli(scene, police);
  if (wanted < WANTED.heliAtStars && police.heli) {
    scene.remove(police.heli.group);
    police.heli = null;
  }
  if (police.heli) {
    const heli = police.heli;
    heli.angle += dt * 0.5;
    const hx = player.x + Math.cos(heli.angle) * 16;
    const hz = player.z + Math.sin(heli.angle) * 16;
    heli.x = hx;
    heli.z = hz;
    heli.group.position.set(hx, 34 + Math.sin(heli.angle * 2) * 1.5, hz);
    heli.group.rotation.y = Math.atan2(-(player.z - hz), player.x - hx);
    heli.rotor.rotation.y += dt * 22;
    heli.tailRotor.rotation.x += dt * 18;
    heli.target.position.set(player.x - hx, -34, player.z - hz);
  }
  police.sirenPhase += dt;
}

export function clearPolice(police, scene) {
  for (const cop of police.cruisers) scene.remove(cop.group);
  police.cruisers = [];
  if (police.heli) {
    scene.remove(police.heli.group);
    police.heli = null;
  }
  police.stars = 0;
  police.heat = 0;
}

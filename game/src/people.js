// Pedestrians: simple figures who stroll the sidewalks and run away from
// trouble — a speeding car, a punch, a crash nearby.
import { CITY, PEDESTRIANS } from './config.js';
import { nearestRoadPoint } from './world.js';

const SHIRTS = [0xe8e4da, 0xc25a4a, 0x4a7ac2, 0x5aa85a, 0xd8a03a, 0x7a5a9e, 0x3a9e9e, 0xc2702e];
const PANTS = [0x2c3440, 0x4a3a2c, 0x3a4a5a, 0x5a5a5a];

function makeFigure(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[Math.floor(rng.next() * SHIRTS.length)], roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS[Math.floor(rng.next() * PANTS.length)], roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: [0xe8b88a, 0xc98a5a, 0x8a5a3a][Math.floor(rng.next() * 3)], roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.85, 8), pants);
  legs.position.y = 0.42;
  legs.castShadow = true;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), shirt);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  group.add(head);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), shirt);
  armL.position.set(-0.3, 1.2, 0);
  armL.rotation.z = 0.25;
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.3;
  armR.rotation.z = -0.25;
  group.add(armR);
  return group;
}

export function createPedestrians(scene, rng) {
  const walkers = [];
  for (let i = 0; i < PEDESTRIANS.count; i += 1) {
    const spot = nearestRoadPoint(rng.range(-250, 250), rng.range(-250, 250));
    // Step off the road onto the sidewalk.
    const onAvenue = Math.abs(spot.x - Math.round(spot.x)) < 0.01;
    const figure = makeFigure(rng);
    const px = spot.x + (rng.chance(0.5) ? 8.5 : -8.5);
    const pz = spot.z + (rng.chance(0.5) ? 8.5 : -8.5);
    figure.position.set(px, 0, pz);
    scene.add(figure);
    walkers.push({
      group: figure,
      x: px,
      z: pz,
      heading: rng.next() * Math.PI * 2,
      speed: PEDESTRIANS.strollSpeed,
      fleeing: false,
      wander: rng.range(4, 12),
    });
  }
  return walkers;
}

export function stepPedestrians(walkers, dt, rng, threats) {
  // threats: [{x, z, radius}] — cars moving fast, the player punching, crashes.
  for (const w of walkers) {
    let fleeX = 0;
    let fleeZ = 0;
    for (const t of threats) {
      const dx = w.x - t.x;
      const dz = w.z - t.z;
      const dist = Math.hypot(dx, dz);
      if (dist < t.radius && dist > 0.01) {
        fleeX += dx / dist;
        fleeZ += dz / dist;
      }
    }
    if (fleeX !== 0 || fleeZ !== 0) {
      w.fleeing = true;
      w.heading = Math.atan2(-fleeZ, fleeX);
      w.speed = PEDESTRIANS.fleeSpeed;
    } else if (w.fleeing) {
      w.fleeing = false;
      w.speed = PEDESTRIANS.strollSpeed;
    } else {
      w.wander -= dt;
      if (w.wander <= 0) {
        w.wander = rng.range(4, 12);
        w.heading += rng.range(-1.2, 1.2);
      }
    }
    w.x += Math.cos(w.heading) * w.speed * dt;
    w.z += -Math.sin(w.heading) * w.speed * dt;
    // Stay inside the city and off the beach road.
    w.x = Math.max(CITY.minX + 6, Math.min(CITY.beachX0 - 4, w.x));
    w.z = Math.max(CITY.minZ + 6, Math.min(CITY.maxZ - 6, w.z));
    w.group.position.set(w.x, 0, w.z);
    w.group.rotation.y = w.heading;
    // A simple walk bob.
    w.group.position.y = Math.abs(Math.sin(w.x * 2 + w.z * 2)) * 0.04 * (w.speed / PEDESTRIANS.strollSpeed);
  }
}

export function nearestPedestrian(walkers, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const w of walkers) {
    const d = Math.hypot(w.x - x, w.z - z);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

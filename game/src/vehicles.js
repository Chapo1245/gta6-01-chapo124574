// Cars: extruded side silhouettes with a glasshouse, spinning wheels, lights
// and bumpers — never plain boxes. Traffic cars drive the grid, turn at
// intersections and keep their distance from the car ahead.
import { CAR, CITY, TRAFFIC } from './config.js';
import { nearestRoadPoint, randomRoadPoint } from './world.js';

const PAINTS = [0xc23a2e, 0x2e6bc2, 0xe8b13a, 0x3a9e6b, 0x8a4a9e, 0xd8d8d8, 0x22262e, 0xc2702e, 0x4a90b8, 0x9e2e5a];

// The side profile of a sedan: nose, hood, windshield, roof, rear glass, trunk.
function carProfile() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.32);
  s.lineTo(0, 0.52);
  s.lineTo(0.55, 0.62);
  s.lineTo(1.15, 0.78);
  s.lineTo(1.75, 1.12);
  s.lineTo(2.35, 1.32);
  s.lineTo(3.05, 1.32);
  s.lineTo(3.55, 1.02);
  s.lineTo(4.15, 0.88);
  s.lineTo(4.4, 0.72);
  s.lineTo(4.4, 0.32);
  s.closePath();
  return s;
}

// The glasshouse: windshield, side glass and rear glass as one dark shape.
function glassProfile() {
  const s = new THREE.Shape();
  s.moveTo(1.55, 0.82);
  s.lineTo(1.95, 1.14);
  s.lineTo(2.3, 1.26);
  s.lineTo(2.95, 1.26);
  s.lineTo(3.35, 0.98);
  s.lineTo(3.35, 0.82);
  s.closePath();
  return s;
}

function wheelMesh() {
  const wheel = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14),
    new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.9 }),
  );
  tyre.rotation.x = Math.PI / 2;
  tyre.castShadow = true;
  wheel.add(tyre);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.35, metalness: 0.7 }),
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

export function makeCarMesh(kind, paint) {
  const group = new THREE.Group();
  const paintMat = new THREE.MeshStandardMaterial({
    color: paint ?? PAINTS[Math.floor(Math.random() * PAINTS.length)],
    roughness: 0.35,
    metalness: 0.35,
  });
  const bodyGeo = new THREE.ExtrudeGeometry(carProfile(), {
    depth: CAR.width - 0.24,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
    steps: 1,
  });
  bodyGeo.translate(0, 0, -(CAR.width - 0.24) / 2);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.castShadow = true;
  group.add(body);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.6 });
  const glassGeo = new THREE.ExtrudeGeometry(glassProfile(), { depth: CAR.width - 0.34, bevelEnabled: false });
  glassGeo.translate(0, 0, -(CAR.width - 0.34) / 2);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  group.add(glass);
  // Bumpers.
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5, metalness: 0.4 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, CAR.width - 0.1), bumperMat);
  front.position.set(4.42, 0.38, 0);
  group.add(front);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, CAR.width - 0.1), bumperMat);
  rear.position.set(-0.02, 0.38, 0);
  group.add(rear);
  // Headlights and taillights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a0, emissiveIntensity: 0.7 });
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.42), headMat);
    head.position.set(4.44, 0.62, side * 0.62);
    group.add(head);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xc22a1e, emissive: 0x881108, emissiveIntensity: 0.7 }),
    );
    tail.position.set(-0.06, 0.62, side * 0.62);
    group.add(tail);
  }
  // Wheels.
  const wheels = [];
  for (const [wx, wz] of [
    [1.15, -0.86],
    [1.15, 0.86],
    [3.35, -0.86],
    [3.35, 0.86],
  ]) {
    const wheel = wheelMesh();
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.14, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.4 }),
    );
    bar.position.set(2.6, 1.42, 0);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd21f1f, emissive: 0xff2020, emissiveIntensity: 1.6 }),
    );
    red.position.set(2.6, 1.52, -0.28);
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1f4fd2, emissive: 0x2040ff, emissiveIntensity: 1.6 }),
    );
    blue.position.set(2.6, 1.52, 0.28);
    group.add(blue);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.16, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 0.8 }),
    );
    sign.position.set(2.6, 1.44, 0);
    group.add(sign);
  }
  // The extrude runs along +x from the nose; centre it on the car.
  group.children.forEach((child) => {
    child.position.x -= CAR.length / 2;
  });
  // Wheels were positioned in profile space too; re-centre the group instead.
  group.position.x += 0;
  return { group, wheels };
}

// The player's car and every traffic car share this state shape.
export function makeVehicle(kind, x, z, heading, paint) {
  const { group, wheels } = makeCarMesh(kind, paint);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return {
    kind,
    group,
    wheels,
    x,
    z,
    heading,
    speed: 0,
    steer: 0,
    // Traffic only: metres left to the next junction.
    leg: 0,
  };
}

function turnChoices(x, z, heading) {
  // At an intersection, the car may keep going or turn left or right.
  const options = [heading];
  options.push(heading + Math.PI / 2, heading - Math.PI / 2);
  return options;
}

// Metres to the next intersection along the car's current heading.
function distanceToJunction(car) {
  const fx = Math.cos(car.heading);
  const fz = -Math.sin(car.heading);
  if (Math.abs(fx) > 0.7) {
    if (fx > 0) {
      for (const ax of CITY.avenues) if (ax > car.x + 1) return ax - car.x;
    } else {
      for (let i = CITY.avenues.length - 1; i >= 0; i -= 1) {
        if (CITY.avenues[i] < car.x - 1) return car.x - CITY.avenues[i];
      }
    }
  } else if (Math.abs(fz) > 0.7) {
    if (fz > 0) {
      for (const sz of CITY.streets) if (sz > car.z + 1) return sz - car.z;
    } else {
      for (let i = CITY.streets.length - 1; i >= 0; i -= 1) {
        if (CITY.streets[i] < car.z - 1) return car.z - CITY.streets[i];
      }
    }
  }
  return 70;
}

export function createTraffic(scene, rng) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'sedan', 'taxi', 'sedan', 'van'];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const spot = randomRoadPoint(rng);
    // The heading follows the road the car is on: along a street it runs
    // east-west, along an avenue north-south, either direction.
    const heading = spot.alongX ? (rng.chance(0.5) ? 0 : Math.PI) : rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    const kind = kinds[i % kinds.length];
    const car = makeVehicle(kind, spot.x, spot.z, heading, undefined);
    car.speed = rng.range(6, TRAFFIC.cruiseSpeed);
    car.leg = distanceToJunction(car);
    scene.add(car.group);
    cars.push(car);
  }
  return cars;
}

export function stepTraffic(cars, dt, rng, playerCar) {
  for (const car of cars) {
    // Slow for the car ahead on the same lane.
    let blocked = false;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < TRAFFIC.followGap) {
        const ahead = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
        if (ahead > 0) {
          blocked = true;
          break;
        }
      }
    }
    if (playerCar) {
      const dx = playerCar.x - car.x;
      const dz = playerCar.z - car.z;
      if (Math.hypot(dx, dz) < TRAFFIC.followGap) {
        const ahead = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
        if (ahead > 0) blocked = true;
      }
    }
    const targetSpeed = blocked ? 0 : TRAFFIC.cruiseSpeed;
    car.speed += Math.max(-14 * dt, Math.min(8 * dt, targetSpeed - car.speed));
    const moved = car.speed * dt;
    car.x += Math.cos(car.heading) * moved;
    car.z += -Math.sin(car.heading) * moved;
    car.leg -= moved;
    if (car.leg <= 0) {
      // At the junction: snap onto it and choose a new direction.
      const snapped = nearestRoadPoint(car.x, car.z);
      car.x = snapped.x;
      car.z = snapped.z;
      const options = turnChoices(car.x, car.z, car.heading);
      car.heading = options[Math.floor(rng.next() * options.length)];
      car.leg = distanceToJunction(car);
    }
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    for (const wheel of car.wheels) wheel.rotation.z -= (car.speed * dt) / 0.36;
  }
}

export function carForward(car) {
  return { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
}

// cars.js — vehicles: arcade physics, AI traffic, parked cars to steal, police cars.
// One job: everything with four wheels.
const THREE = window.THREE;
import { BLOCK, STREET, PITCH, HALF } from './city.js';
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

const CAR_TYPES = {
  taxi:   { len: 4.4, top: 29, accel: 13, color: 0xf7c948, name: 'Taxi' },
  sedan:  { len: 4.4, top: 25, accel: 11, color: 0x888888, name: 'Sedan' },
  sport:  { len: 4.2, top: 36, accel: 17, color: 0xd21f2b, name: 'Sport' },
  van:    { len: 5.0, top: 21, accel: 9,  color: 0x4a6b8a, name: 'Van' },
  pickup: { len: 4.8, top: 24, accel: 11, color: 0x3a7d4a, name: 'Pickup' },
  police: { len: 4.5, top: 33, accel: 15, color: 0xf2f2f2, name: 'Police' },
};

export function buildCarMesh(type, colorHex) {
  const t = CAR_TYPES[type];
  const g = new THREE.Group();
  // glossy paint (Phong) instead of flat Lambert — the single biggest
  // visual win for cars: sun glints off the bodywork.
  const paint = new THREE.MeshPhongMaterial({ color: colorHex ?? t.color, shininess: 70, specular: 0x666666 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x181a1e });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xd8d8d8, shininess: 120, specular: 0xffffff });
  const glass = new THREE.MeshPhongMaterial({ color: 0x1a2c44, shininess: 140 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(t.len, 0.85, 2.0), paint);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  // hood + trunk slopes so the silhouette is not a brick
  const hood = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.22, 0.28, 1.9), paint);
  hood.position.set(t.len * 0.36, 1.05, 0); hood.rotation.z = -0.18; hood.castShadow = true; g.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.18, 0.26, 1.9), paint);
  trunk.position.set(-t.len * 0.38, 1.04, 0); trunk.rotation.z = 0.14; g.add(trunk);
  // cabin with a chrome window trim frame behind the glass
  const trim = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.54, 0.78, 1.86), chrome);
  trim.position.set(-t.len * 0.06, 1.42, 0); g.add(trim);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.5, 0.7, 1.8), glass);
  cabin.position.set(-t.len * 0.06, 1.45, 0); cabin.castShadow = true; g.add(cabin);
  // grille + bumpers + side mirrors
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.2), dark);
  grille.position.set(t.len / 2 + 0.02, 0.72, 0); g.add(grille);
  for (const bx of [t.len / 2 - 0.05, -t.len / 2 + 0.05]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 2.05), chrome);
    bumper.position.set(bx, 0.42, 0); g.add(bumper);
  }
  for (const mz of [1.02, -1.02]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.1), dark);
    mirror.position.set(t.len * 0.18, 1.35, mz); g.add(mirror);
  }
  // wheels with hubcaps
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.32, 10);
  const wheels = [];
  for (const [wx, wz] of [[t.len * 0.32, 0.95], [t.len * 0.32, -0.95], [-t.len * 0.32, 0.95], [-t.len * 0.32, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w); wheels.push(w);
    const hub = new THREE.Mesh(hubGeo, chrome);
    hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.38, wz); g.add(hub);
  }
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const z of [0.65, -0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.4), hlMat);
    hl.position.set(t.len / 2, 0.8, z); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tl.position.set(-t.len / 2, 0.8, z); g.add(tl);
  }
  let lightBar = null;
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.9, 0); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(0, 1.95, 0.4); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0, 1.95, -0.4); g.add(blue);
    lightBar = { red, blue, phase: 0 };
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.9, 0.3, 2.02),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    stripe.position.y = 0.75; g.add(stripe);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
    sign.position.set(0, 1.95, 0); g.add(sign);
    // checker stripe along the doors
    const check = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.7, 0.28, 2.03),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    check.position.set(0, 0.62, 0); g.add(check);
  }
  if (type === 'sport') {
    // rear spoiler on two struts
    for (const sz of [0.6, -0.6]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), dark);
      strut.position.set(-t.len / 2 + 0.15, 1.3, sz); g.add(strut);
    }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), paint);
    wing.position.set(-t.len / 2 + 0.15, 1.5, 0); wing.castShadow = true; g.add(wing);
  }
  if (type === 'van') {
    // roof rack
    const rack = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.5, 0.08, 1.5), dark);
    rack.position.set(-0.2, 1.88, 0); g.add(rack);
    for (const [rx, rz] of [[-0.2, 0.7], [-0.2, -0.7]]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.5, 0.14, 0.08), dark);
      rail.position.set(rx, 1.95, rz); g.add(rail);
    }
  }
  if (type === 'pickup') {
    // open bed: low walls around the rear half
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.36, 0.12, 1.8), dark);
    bedFloor.position.set(-t.len * 0.3, 1.0, 0); g.add(bedFloor);
    for (const bz of [0.9, -0.9]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.36, 0.5, 0.1), paint);
      wall.position.set(-t.len * 0.3, 1.25, bz); g.add(wall);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.8), paint);
    tail.position.set(-t.len * 0.48, 1.25, 0); g.add(tail);
  }
  g.userData.wheels = wheels; g.userData.lightBar = lightBar;
  return g;
}

class Car {
  constructor(type, colorHex, x, z, heading) {
    this.type = type; this.def = CAR_TYPES[type];
    this.mesh = buildCarMesh(type, colorHex);
    this.mesh.position.set(x, 0, z);
    this.heading = heading; this.speed = 0;
    this.health = 100; this.driver = null; // 'player' | 'traffic' | 'police' | null
    this.parked = false; this.dead = false; this.smoking = false;
    this.steerVis = 0;
    // traffic AI state
    this.axis = Math.abs(Math.cos(heading)) > 0.7 ? 'x' : 'z';
    this.dir = (this.axis === 'x' ? Math.sign(Math.cos(heading)) : Math.sign(-Math.sin(heading))) || 1;
    this.targetHeading = heading;
    this.cruise = 8 + Math.random() * 4;
    this.turnAt = null;
    this.stopped = false;
  }
  get pos() { return this.mesh.position; }
  forward() { return { x: Math.cos(this.heading), z: -Math.sin(this.heading) }; }
  damage(amount, world) {
    if (this.dead) return;
    // garage Armor Plating: the player's car takes less damage per level
    if (this.driver === 'player' && world && world.garage) amount *= world.garage.damageMult();
    this.health -= amount;
    if (this.health <= 40 && !this.smoking) { this.smoking = true; }
    if (this.health <= 0) {
      this.dead = true;
      Effects.explosion(this.pos);
      AudioSys.explosion();
      if (world && world.onCarExploded) world.onCarExploded(this);
    }
  }
}

export const Cars = {
  list: [],
  traffic: [],
  parked: [],
  init(world) {
    this.world = world;
    this.list = []; this.traffic = []; this.parked = [];
    // 12 AI traffic cars on random streets
    for (let i = 0; i < 12; i++) {
      const p = world.city.randomStreetPoint();
      const types = ['sedan', 'sedan', 'van', 'pickup', 'sport'];
      const type = types[i % types.length];
      const colors = [0x7a8a99, 0xb03a2e, 0x2e6b4f, 0xd8d8d8, 0x3a3a5c, 0x8a6d3b];
      const heading = Math.random() < 0.5 ? 0 : Math.PI / 2;
      const car = new Car(type, colors[i % colors.length], p.x, p.z, heading + (Math.random() < 0.5 ? 0 : Math.PI));
      car.driver = 'traffic';
      world.scene.add(car.mesh);
      this.list.push(car); this.traffic.push(car);
    }
    // 14 parked cars to steal, one is the yellow taxi near the plaza
    const spots = [];
    const sc = world.city.streetCenters;
    for (let i = 0; i < 14; i++) {
      const c = sc[1 + (i % 8)];
      const along = -180 + i * 28;
      const side = i % 2 === 0 ? 1 : -1;
      spots.push(i % 2 === 0
        ? { x: c + side * (STREET / 2 + 1.6), z: along, h: 0 }
        : { x: along, z: c + side * (STREET / 2 + 1.6), h: Math.PI / 2 });
    }
    const plan = [
      ['taxi', 0xf7c948], ['sport', 0xd21f2b], ['sedan', 0x2e6b4f], ['van', 0x4a6b8a],
      ['pickup', 0x8a6d3b], ['sedan', 0xb03a2e], ['sport', 0x1a6fd4], ['sedan', 0xd8d8d8],
      ['van', 0x6b4a8a], ['pickup', 0x3a3a5c], ['sedan', 0x7a8a99], ['sport', 0xff8c1a],
      ['sedan', 0x2e2e2e], ['pickup', 0x9a3a5c],
    ];
    spots.forEach((s, i) => {
      const [type, color] = plan[i % plan.length];
      const car = new Car(type, color, s.x, s.z, s.h);
      car.parked = true; car.driver = null;
      world.scene.add(car.mesh);
      this.list.push(car); this.parked.push(car);
    });
    // the mission taxi sits by the plaza, unmistakable
    const taxi = this.parked[0];
    taxi.mesh.position.set(14, 0, -14); taxi.heading = Math.PI / 2; taxi.targetHeading = Math.PI / 2;
    taxi.axis = 'z'; taxi.dir = 1;
  },
  nearestStealable(x, z, maxDist = 4.5) {
    let best = null, bd = maxDist;
    for (const c of this.parked) {
      if (c.dead || c.driver) continue;
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },
  spawnPolice(x, z) {
    const car = new Car('police', 0xf2f2f2, x, z, 0);
    car.driver = 'police';
    this.world.scene.add(car.mesh);
    this.list.push(car);
    return car;
  },
  removeCar(car) {
    this.world.scene.remove(car.mesh);
    this.list = this.list.filter((c) => c !== car);
    this.traffic = this.traffic.filter((c) => c !== car);
    this.parked = this.parked.filter((c) => c !== car);
  },
  update(dt, world) {
    const player = world.player;
    for (const car of this.list) {
      if (car.dead) continue;
      if (car.driver === 'player') this._updatePlayerCar(car, dt, world);
      else if (car.driver === 'traffic') this._updateTrafficCar(car, dt, world);
      else if (car.driver === 'police') this._updatePoliceCar(car, dt, world);
      // visuals: wheels + light bar
      const wheels = car.mesh.userData.wheels;
      if (wheels) for (const w of wheels) w.rotation.z += car.speed * dt * 2.2;
      const lb = car.mesh.userData.lightBar;
      if (lb) {
        lb.phase += dt * 7;
        const on = Math.sin(lb.phase) > 0;
        lb.red.material.color.setHex(on ? 0xff2222 : 0x551111);
        lb.blue.material.color.setHex(on ? 0x2244ff : 0x111155);
      }
      if (car.smoking && Math.random() < dt * 8) {
        Effects.smoke({ x: car.pos.x, y: 1.2, z: car.pos.z });
      }
    }
    // car-vs-car circle collisions
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i]; if (a.dead) continue;
      for (let j = i + 1; j < this.list.length; j++) {
        const b = this.list[j]; if (b.dead) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 4.2 && d > 0.01) {
          const push = (4.2 - d) / 2, nx = dx / d, nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push;
          b.pos.x += nx * push; b.pos.z += nz * push;
          const impact = Math.abs(a.speed - b.speed);
          if (impact > 6) {
            a.damage(impact * 0.8, world); b.damage(impact * 0.8, world);
            Effects.sparks({ x: (a.pos.x + b.pos.x) / 2, y: 1, z: (a.pos.z + b.pos.z) / 2 });
            if (a.driver === 'player' || b.driver === 'player') AudioSys.crash();
            a.speed *= 0.5; b.speed *= 0.5;
          }
        }
      }
    }
    // keep traffic topped up
    if (this.traffic.filter((c) => !c.dead).length < 10 && Math.random() < dt * 0.2) {
      const p = world.city.randomStreetPoint();
      const car = new Car('sedan', 0x7a8a99, p.x, p.z, Math.random() * Math.PI * 2);
      car.driver = 'traffic';
      world.scene.add(car.mesh);
      this.list.push(car); this.traffic.push(car);
    }
    void player;
  },
  _drive(car, dt, world, accelInput, steerInput, handbrake, boost) {
    const def = car.def;
    // garage upgrades bite here: Engine Tune raises top speed, NOS raises boost
    const g = world.garage;
    const top = def.top * (g ? g.speedMult() : 1) * (boost ? (g ? g.boostMult() : 1.25) : 1);
    let accel = accelInput * def.accel;
    if (handbrake) { accel = 0; car.speed *= Math.max(0, 1 - 3.2 * dt); }
    if (accelInput > 0) car.speed += accel * dt;
    else if (accelInput < 0) {
      if (car.speed > 0.5) car.speed += accelInput * def.accel * 1.6 * dt; // brake
      else car.speed += accelInput * def.accel * 0.5 * dt; // reverse
    } else {
      car.speed *= Math.max(0, 1 - 0.6 * dt);
      if (Math.abs(car.speed) < 0.15) car.speed = 0;
    }
    car.speed = Math.max(-8, Math.min(top, car.speed));
    const steerAuthority = Math.min(1, Math.abs(car.speed) / 8);
    const steer = steerInput * 0.55 * steerAuthority * (handbrake ? 1.7 : 1);
    car.heading += steer * dt * Math.sign(car.speed || 1) * (car.speed >= 0 ? 1 : -1) * 1.4;
    car.steerVis = steerInput;
    const f = car.forward();
    car.pos.x += f.x * car.speed * dt;
    car.pos.z += f.z * car.speed * dt;
    // building collision (circle vs AABB)
    const hit = world.city.collides(car.pos.x, car.pos.z, 2.1);
    if (hit) {
      const cx = Math.max(hit.minX, Math.min(car.pos.x, hit.maxX));
      const cz = Math.max(hit.minZ, Math.min(car.pos.z, hit.maxZ));
      const dx = car.pos.x - cx, dz = car.pos.z - cz;
      const d = Math.hypot(dx, dz) || 0.01;
      car.pos.x = cx + (dx / d) * 2.1;
      car.pos.z = cz + (dz / d) * 2.1;
      if (Math.abs(car.speed) > 5) {
        Effects.sparks({ x: car.pos.x, y: 0.9, z: car.pos.z });
        car.damage(Math.abs(car.speed) * 0.9, world);
        if (car.driver === 'player') { AudioSys.crash(); Effects.shake(0.35); }
      }
      car.speed *= 0.35;
    }
    const cl = world.city.clampToWorld(car.pos.x, car.pos.z);
    car.pos.x = cl.x; car.pos.z = cl.z;
    car.mesh.rotation.y = car.heading;
    // front wheels steer visually
    const wheels = car.mesh.userData.wheels;
    if (wheels) { wheels[0].rotation.y = steer * 0.5; wheels[1].rotation.y = steer * 0.5; }
  },
  _updatePlayerCar(car, dt, world) {
    const { Input } = world;
    const ax = Input.axis();
    const handbrake = Input.isDown('Space');
    const boost = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    this._drive(car, dt, world, ax.f, -ax.s, handbrake, boost);
    if (handbrake && Math.abs(car.speed) > 8 && Math.random() < dt * 20) {
      Effects.skid({ x: car.pos.x, y: 0.2, z: car.pos.z });
    }
    AudioSys.engine(Math.abs(car.speed) / car.def.top, true);
  },
  _updateTrafficCar(car, dt, world) {
    const city = world.city;
    const along = car.axis === 'x' ? car.pos.x : car.pos.z;
    let line = car.axis === 'x' ? car.pos.z : car.pos.x;
    // find next intersection ahead
    let nextDist = 1e9, nextCenter = null;
    for (const c of city.streetCenters) {
      const d = (c - along) * car.dir;
      if (d > 2 && d < nextDist) { nextDist = d; nextCenter = c; }
    }
    let wantSpeed = car.cruise;
    // traffic light: red for this axis?
    if (nextDist < 14 && nextCenter !== null) {
      const greenForMe = car.axis === 'z' ? city.lightState.nsGreen : !city.lightState.nsGreen;
      if (!greenForMe) wantSpeed = nextDist > 9 ? car.cruise * 0.5 : 0;
    }
    // car ahead on same lane
    for (const o of this.list) {
      if (o === car || o.dead) continue;
      const oAlong = o.axis === car.axis ? (car.axis === 'x' ? o.pos.x : o.pos.z) : null;
      const oLine = o.axis === car.axis ? (car.axis === 'x' ? o.pos.z : o.pos.x) : null;
      if (oAlong === null || Math.abs(oLine - line) > 3) continue;
      const d = (oAlong - along) * car.dir;
      if (d > 0 && d < 9) wantSpeed = Math.min(wantSpeed, 0);
      else if (d > 0 && d < 16) wantSpeed = Math.min(wantSpeed, car.cruise * 0.4);
    }
    // accelerate toward wantSpeed
    if (car.speed < wantSpeed) car.speed = Math.min(wantSpeed, car.speed + 6 * dt);
    else car.speed = Math.max(wantSpeed, car.speed - 10 * dt);
    // turn decision at the intersection
    if (nextDist < 1.5 && nextCenter !== null) {
      if (Math.random() < 0.3) {
        const newAxis = car.axis === 'x' ? 'z' : 'x';
        car.axis = newAxis;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.targetHeading = newAxis === 'x'
          ? (car.dir > 0 ? 0 : Math.PI)
          : (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
        line = nextCenter; // new lane line is the intersection street
      }
    }
    // smooth heading toward target
    let dh = car.targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-3 * dt, Math.min(3 * dt, dh));
    const f = car.forward();
    car.pos.x += f.x * car.speed * dt;
    car.pos.z += f.z * car.speed * dt;
    // snap back onto lane line
    if (car.axis === 'x') car.pos.z += (line - car.pos.z) * Math.min(1, dt * 4);
    else car.pos.x += (line - car.pos.x) * Math.min(1, dt * 4);
    const cl = city.clampToWorld(car.pos.x, car.pos.z);
    car.pos.x = Math.max(-HALF + 10, Math.min(HALF - 10, cl.x));
    car.pos.z = Math.max(-HALF + 10, Math.min(HALF - 10, cl.z));
    car.mesh.rotation.y = car.heading;
    void PITCH; void BLOCK;
  },
  _updatePoliceCar(car, dt, world) {
    const target = world.playerCar ? world.playerCar.pos : world.player.pos;
    const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(-dz, dx);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
    const want = dist > 7 ? 1 : (dist < 3 ? -0.4 : 0.4);
    this._drive(car, dt, world, want, 0, false, false);
    car.speed = Math.max(-6, Math.min(32, car.speed));
  },
};

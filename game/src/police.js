// police.js — the wanted system: stars, heat, police cars and foot officers.
// One job: make crime have consequences.
const THREE = window.THREE;
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

function makeOfficerMesh() {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1c2f55 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.36), navy);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.8; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 10), navy);
  cap.position.y = 1.98; g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), navy);
  legL.position.set(0, 0.38, 0.14); g.add(legL);
  const legR = legL.clone(); legR.position.z = -0.14; g.add(legR);
  g.userData = { legL, legR };
  return g;
}

export const Police = {
  stars: 0,
  heat: 0,
  lastCrimeAt: -100,
  cars: [],
  officers: [],
  arrestTimer: 0,
  init(world) {
    this.world = world;
    this.stars = 0; this.heat = 0; this.lastCrimeAt = -100;
    this.cars = []; this.officers = [];
    this.arrestTimer = 0;
  },
  get wanted() { return this.stars; },
  addHeat(n, reason) {
    const now = performance.now() / 1000;
    this.heat = Math.min(100, this.heat + n * 12);
    this.lastCrimeAt = now;
    const newStars = Math.max(1, Math.min(5, Math.ceil(this.heat / 20)));
    if (newStars > this.stars) {
      this.stars = newStars;
      if (this.world.hud) this.world.hud.toast(`WANTED LEVEL ${this.stars} — ${reason || 'crime'}!`);
      AudioSys.sting(false);
    }
    this.stars = Math.max(this.stars, newStars);
  },
  ensureStars(n, reason) {
    // Missions that promise "four stars" must deliver four stars no matter
    // what heat the player walked in with: raise heat to the floor for n.
    const need = (n - 1) * 20 + 1;
    if (this.heat < need) this.heat = need;
    this.lastCrimeAt = performance.now() / 1000;
    const newStars = Math.max(1, Math.min(5, Math.ceil(this.heat / 20)));
    if (newStars > this.stars) {
      this.stars = newStars;
      if (this.world.hud) this.world.hud.toast(`WANTED LEVEL ${this.stars} — ${reason || 'crime'}!`);
      AudioSys.sting(false);
    }
    this.stars = Math.max(this.stars, newStars);
  },
  clearWanted() {
    this.heat = 0; this.stars = 0;
    for (const c of this.cars) this.world.cars.removeCar(c);
    for (const o of this.officers) this.world.scene.remove(o.mesh);
    this.cars = []; this.officers = [];
    if (this.world.helicopter) this.world.helicopter.clear();
    AudioSys.siren(false);
  },
  _spawnCar() {
    const world = this.world;
    const p = world.city.randomStreetPoint();
    // spawn 60-90m from the player so they drive in
    const a = Math.random() * Math.PI * 2;
    const x = world.player.pos.x + Math.cos(a) * 70;
    const z = world.player.pos.z + Math.sin(a) * 70;
    const cl = world.city.clampToWorld(x, z);
    const car = world.cars.spawnPolice(cl.x, cl.z);
    this.cars.push(car);
    void p;
  },
  _spawnOfficer() {
    const world = this.world;
    const a = Math.random() * Math.PI * 2;
    const x = world.player.pos.x + Math.cos(a) * 25;
    const z = world.player.pos.z + Math.sin(a) * 25;
    const cl = world.city.clampToWorld(x, z);
    const mesh = makeOfficerMesh();
    mesh.position.set(cl.x, 0, cl.z);
    world.scene.add(mesh);
    this.officers.push({ mesh, pos: mesh.position, health: 50, down: false, phase: 0 });
  },
  update(dt, world) {
    const now = performance.now() / 1000;
    // the anchor: the car when driving, Jace when on foot. The R3 code
    // chased world.player.pos, which goes stale the moment you drive.
    const anchor = world.playerCar ? world.playerCar.pos : world.player.pos;
    // heat decays when quiet and unseen — but the helicopter overhead
    // keeps the player spotted, so no decay while it is up
    const heliNear = this.world.helicopter && this.world.helicopter.active ? 30 : 1e9;
    const nearestCop = Math.min(
      ...this.cars.map((c) => Math.hypot(c.pos.x - anchor.x, c.pos.z - anchor.z)),
      ...this.officers.map((o) => Math.hypot(o.pos.x - anchor.x, o.pos.z - anchor.z)),
      heliNear,
      1e9);
    if (now - this.lastCrimeAt > 8 && nearestCop > 45 && this.stars > 0) {
      this.heat = Math.max(0, this.heat - 5 * dt);
      const s = Math.ceil(this.heat / 20);
      if (s < this.stars) {
        this.stars = s;
        if (s === 0) { this.clearWanted(); if (world.hud) world.hud.toast('You lost the heat.'); }
      }
    }
    // keep units topped up to the wanted level
    const wantCars = this.stars > 0 ? Math.min(1 + this.stars, 4) : 0;
    const wantOfficers = this.stars > 0 ? Math.min(this.stars, 3) : 0;
    this.cars = this.cars.filter((c) => !c.dead);
    while (this.cars.length < wantCars && this.stars > 0) this._spawnCar();
    while (this.officers.length < wantOfficers && this.stars > 0) this._spawnOfficer();
    // officers chase on foot (toward the anchor — the car, if driving)
    for (const o of this.officers) {
      if (o.down) continue;
      const dx = anchor.x - o.pos.x, dz = anchor.z - o.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const speed = 6.2;
      o.pos.x += (dx / d) * speed * dt;
      o.pos.z += (dz / d) * speed * dt;
      o.mesh.rotation.y = Math.atan2(-dz, dx);
      o.phase += dt * 10;
      const s = Math.sin(o.phase) * 0.55;
      o.mesh.userData.legL.rotation.x = s;
      o.mesh.userData.legR.rotation.x = -s;
      // arrest: close to an on-foot player for 1.5s
      if (!world.playerCar && d < 2.4) {
        this.arrestTimer += dt;
        if (this.arrestTimer > 1.5) { world.busted(); this.arrestTimer = 0; }
      } else {
        this.arrestTimer = Math.max(0, this.arrestTimer - dt * 2);
      }
      // officer hit by player car
      if (world.playerCar && !world.playerCar.dead && d < 2.4 && Math.abs(world.playerCar.speed) > 4) {
        o.down = true;
        o.mesh.rotation.x = Math.PI / 2;
        Effects.blood({ x: o.pos.x, y: 1, z: o.pos.z });
        this.addHeat(2, 'officer down');
        setTimeout(() => { world.scene.remove(o.mesh); this.officers = this.officers.filter((x) => x !== o); }, 4000);
      }
    }
    // despawn far units
    for (const c of [...this.cars]) {
      if (Math.hypot(c.pos.x - anchor.x, c.pos.z - anchor.z) > 220) {
        world.cars.removeCar(c); this.cars = this.cars.filter((x) => x !== c);
      }
    }
    AudioSys.siren(this.stars > 0);
  },
};

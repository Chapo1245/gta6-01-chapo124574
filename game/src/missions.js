// missions.js — Mara Voss story arc (5 missions) + taxi-fare side gig.
// One job: objectives, waypoint beacon, guards, rewards, progression.
const THREE = window.THREE;
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

function makeGuardMesh() {
  const g = new THREE.Group();
  const green = new THREE.MeshLambertMaterial({ color: 0x2e4d2a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.36), green);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.8; g.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.3, 1.25, 0); g.add(gun);
  g.userData = { gun };
  return g;
}

const DEFS = [
  {
    id: 'm1', name: 'First Wheels', reward: 500,
    briefing: 'Mara Voss: "New in Sunvale, Jace? Prove it. Jack the yellow taxi by the plaza and bring it to my garage. No questions."',
    steps: [
      { text: 'Steal the yellow taxi by the plaza', target: () => ({ x: 14, z: -14 }), radius: 6,
        check: (w) => w.playerCar && w.playerCar.type === 'taxi' },
      { text: "Bring the taxi to Mara's Garage", target: (w) => w.city.landmarks.garage, radius: 7,
        check: (w) => w.playerCar && w.playerCar.type === 'taxi' &&
          Math.hypot(w.playerCar.pos.x - w.city.landmarks.garage.x, w.playerCar.pos.z - w.city.landmarks.garage.z) < 7 },
    ],
  },
  {
    id: 'm2', name: 'Sunset Run', reward: 800, timeLimit: 90,
    briefing: 'Mara Voss: "A buyer waits at the boardwalk. Get there before the sun drops — ninety seconds, wheels spinning."',
    steps: [
      { text: 'Get in a car', target: null, radius: 0, check: (w) => !!w.playerCar },
      { text: 'Reach the boardwalk before sunset', target: (w) => w.city.landmarks.beach, radius: 9, timer: 90,
        check: (w) => w.playerCar &&
          Math.hypot(w.playerCar.pos.x - w.city.landmarks.beach.x, w.playerCar.pos.z - w.city.landmarks.beach.z) < 9 },
    ],
  },
  {
    id: 'm3', name: 'Heat Check', reward: 1200, timeLimit: 45,
    briefing: 'Mara Voss: "The heat is on you, Jace — three stars and every cruiser in Sunvale. Survive forty-five seconds. Lose them or outrun them."',
    steps: [
      { text: 'Survive the heat — 45 seconds', target: null, radius: 0, timer: 45,
        onStart: (w) => { w.police.ensureStars(3, 'heat check'); },
        check: (w, m) => m.stepTime >= 45 || w.police.stars === 0 },
    ],
  },
  {
    id: 'm4', name: 'Warehouse Bust', reward: 2000,
    briefing: 'Mara Voss: "A package sits in the Harbor Warehouse, guarded by four of Rocco\'s men. Clear them out, grab it, bring it home."',
    steps: [
      { text: 'Go to the Harbor Warehouse', target: (w) => w.city.landmarks.warehouse, radius: 9,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.warehouse.x, w.player.pos.z - w.city.landmarks.warehouse.z) < 9 },
      { text: 'Clear the four guards', target: (w) => w.city.landmarks.warehouse, radius: 12,
        onStart: (w) => w.missions.spawnGuards(),
        check: (w) => w.missions.guards.every((g) => g.down) },
      { text: 'Grab the package', target: (w) => w.city.landmarks.warehouse, radius: 3.5,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.warehouse.x, w.player.pos.z - w.city.landmarks.warehouse.z) < 3.5 },
      { text: "Return the package to Mara's Garage", target: (w) => w.city.landmarks.garage, radius: 7,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.garage.x, w.player.pos.z - w.city.landmarks.garage.z) < 7 },
    ],
  },
  {
    id: 'm5', name: 'The Big Score', reward: 5000,
    briefing: 'Mara Voss: "Sunvale Bank. The vault. Four stars the second you touch it — then bring it all back to me. This is the one, Jace."',
    steps: [
      { text: 'Drive to Sunvale Bank', target: (w) => w.city.landmarks.bank, radius: 9,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.bank.x, w.player.pos.z - w.city.landmarks.bank.z) < 9 },
      { text: 'Grab the cash from the vault', target: (w) => w.city.landmarks.bank, radius: 4,
        onStart: (w) => { w.police.ensureStars(4, 'bank job'); },
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.bank.x, w.player.pos.z - w.city.landmarks.bank.z) < 4 },
      { text: "Escape to Mara's Garage", target: (w) => w.city.landmarks.garage, radius: 7,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.garage.x, w.player.pos.z - w.city.landmarks.garage.z) < 7 },
    ],
  },
  {
    id: 'm6', name: 'Boardwalk Delivery', reward: 900, timeLimit: 75,
    briefing: 'Mara Voss: "A package for a friend on the boardwalk — seventy-five seconds, no detours, no cops. The sea air is on me."',
    steps: [
      { text: 'Get in a car', target: null, radius: 0, check: (w) => !!w.playerCar },
      { text: 'Deliver to the boardwalk — 75 seconds', target: (w) => w.city.landmarks.beach, radius: 9, timer: 75,
        check: (w) => w.playerCar &&
          Math.hypot(w.playerCar.pos.x - w.city.landmarks.beach.x, w.playerCar.pos.z - w.city.landmarks.beach.z) < 9 },
    ],
  },
  {
    id: 'm7', name: 'Taxi King', reward: 1500,
    briefing: 'Mara Voss: "The taxi game pays, Jace — three fares, back to back, no excuses. The city tips a driver who shows up."',
    steps: [
      { text: 'Drive the taxi — complete 3 fares', target: null, radius: 0,
        check: (w) => w.missions.faresDone >= 3 },
    ],
  },
  {
    id: 'm8', name: 'Plaza Showdown', reward: 1800,
    briefing: 'Mara Voss: "Rocco\'s crew is shaking down the plaza. Clear the three of them out and the plaza is ours again."',
    steps: [
      { text: 'Go to the Plaza', target: (w) => w.city.landmarks.plaza, radius: 10,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.plaza.x, w.player.pos.z - w.city.landmarks.plaza.z) < 10 },
      { text: 'Clear the three enforcers', target: (w) => w.city.landmarks.plaza, radius: 14,
        onStart: (w) => w.missions.spawnGuardsAt(w.city.landmarks.plaza, 3),
        check: (w) => w.missions.guards.every((g) => g.down) },
      { text: "Report back to Mara's Garage", target: (w) => w.city.landmarks.garage, radius: 7,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.garage.x, w.player.pos.z - w.city.landmarks.garage.z) < 7 },
    ],
  },
  {
    id: 'm9', name: 'Getaway Driver', reward: 2500, timeLimit: 60,
    briefing: 'Mara Voss: "Four stars, a helicopter over your head, and sixty seconds to lose them. Then vanish to the beach. Show me you can drive."',
    steps: [
      { text: 'Survive the heat — 60 seconds', target: null, radius: 0, timer: 60,
        onStart: (w) => { w.police.ensureStars(4, 'getaway'); },
        check: (w, m) => m.stepTime >= 60 || w.police.stars === 0 },
      { text: 'Vanish — reach the beach', target: (w) => w.city.landmarks.beach, radius: 9,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.beach.x, w.player.pos.z - w.city.landmarks.beach.z) < 9 },
    ],
  },
  {
    id: 'm10', name: 'Sunvale Heist', reward: 8000,
    briefing: 'Mara Voss: "The bank again — bigger this time. Five stars, the helicopter, everything they have. Then disappear to the safehouse. This is the last one, Jace. Make it count."',
    steps: [
      { text: 'Drive to Sunvale Bank', target: (w) => w.city.landmarks.bank, radius: 9,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.bank.x, w.player.pos.z - w.city.landmarks.bank.z) < 9 },
      { text: 'Hit the vault — five stars', target: (w) => w.city.landmarks.bank, radius: 4,
        onStart: (w) => { w.police.ensureStars(5, 'sunvale heist'); },
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.bank.x, w.player.pos.z - w.city.landmarks.bank.z) < 4 },
      { text: 'Disappear to the safehouse', target: (w) => w.city.landmarks.safehouse, radius: 8,
        check: (w) => Math.hypot(w.player.pos.x - w.city.landmarks.safehouse.x, w.player.pos.z - w.city.landmarks.safehouse.z) < 8 },
    ],
  },
];

export const Missions = {
  defs: DEFS,
  current: null, // { def, step, stepTime, active }
  done: [],
  guards: [],
  fare: null, // { state, pickup, dest, reward, timer, marker }
  fareCooldown: 0,
  faresDone: 0, // taxi fares completed this session (m7 "Taxi King" counts them)
  beacon: null,
  init(world) {
    this.world = world;
    this.current = null; this.done = []; this.guards = []; this.fare = null;
    this.faresDone = 0;
    // waypoint beacon: additive light pillar + pulsing ring
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd94a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.position.y = 30; this.beacon.visible = false;
    world.scene.add(this.beacon);
  },
  available() {
    return DEFS.filter((d) => !this.done.includes(d.id));
  },
  nextMission() { return this.available()[0] || null; },
  startMission(def) {
    if (this.current) return false;
    this.current = { def, step: 0, stepTime: 0, active: true };
    if (this.world.hud) {
      this.world.hud.toast(`${def.name} — ${def.briefing}`, 6);
      this.world.hud.setObjective(def.steps[0].text);
    }
    const s = def.steps[0];
    if (s.onStart) s.onStart(this.world);
    AudioSys.sting(true);
    return true;
  },
  failMission(reason) {
    if (!this.current) return;
    if (this.world.hud) this.world.hud.toast(`Mission failed — ${reason}. Talk to Mara to retry.`, 5);
    AudioSys.sting(false);
    this.current = null;
    this.beacon.visible = false;
  },
  completeMission() {
    const c = this.current;
    if (!c) return;
    this.done.push(c.def.id);
    this.world.cash += c.def.reward;
    if (this.world.hud) {
      this.world.hud.toast(`${c.def.name} complete! +$${c.def.reward}`, 5);
      this.world.hud.setObjective('Mission complete — press M for the next job');
    }
    AudioSys.sting(true);
    AudioSys.pickup();
    this.current = null;
    this.beacon.visible = false;
    if (this.world.save) this.world.save();
  },
  spawnGuards() {
    this.spawnGuardsAt(this.world.city.landmarks.warehouse, 4);
  },
  spawnGuardsAt(base, count) {
    const w = this.world;
    this.guards = [];
    for (let i = 0; i < count; i++) {
      const mesh = makeGuardMesh();
      const a = (i / count) * Math.PI * 2;
      mesh.position.set(base.x + Math.cos(a) * 9, 0, base.z + Math.sin(a) * 9);
      w.scene.add(mesh);
      this.guards.push({ mesh, pos: mesh.position, health: 50, down: false, shootAt: 1 + Math.random(), phase: Math.random() * 6 });
    }
  },
  clearGuards() {
    for (const g of this.guards) this.world.scene.remove(g.mesh);
    this.guards = [];
  },
  objectiveText() {
    if (this.current) return this.current.def.steps[this.current.step].text;
    if (this.fare) return this.fare.state === 'pickup' ? 'Pick up the fare' : 'Drop off the passenger';
    const next = this.nextMission();
    return next ? `Next job: ${next.name} — press M to start` : 'All jobs done — Sunvale is yours!';
  },
  objectivePos() {
    if (this.current) {
      const s = this.current.def.steps[this.current.step];
      if (s.target) {
        const t = typeof s.target === 'function' ? s.target(this.world) : s.target;
        return t;
      }
      return null;
    }
    if (this.fare) return this.fare.state === 'pickup' ? this.fare.pickup : this.fare.dest;
    return null;
  },
  startFare() {
    const w = this.world;
    if (this.current || this.fare || !w.playerCar || w.playerCar.type !== 'taxi') return;
    const pickup = w.city.randomSidewalkPoint();
    const dest = w.city.randomSidewalkPoint();
    const dist = Math.hypot(dest.x - pickup.x, dest.z - pickup.z);
    this.fare = {
      state: 'pickup', pickup, dest,
      reward: 100 + Math.round(dist / 10) * 10,
      timer: 75 + dist / 6,
    };
    if (w.hud) w.hud.toast(`Fare: pick up the passenger ($${this.fare.reward})`, 4);
  },
  update(dt, world) {
    // beacon follows the objective
    const op = this.objectivePos();
    if (op && (this.current || this.fare)) {
      this.beacon.visible = true;
      this.beacon.position.x = op.x; this.beacon.position.z = op.z;
      this.beacon.material.opacity = 0.25 + Math.sin(performance.now() * 0.004) * 0.12;
    } else {
      this.beacon.visible = false;
    }
    // mission steps
    if (this.current) {
      const c = this.current;
      c.stepTime += dt;
      const step = c.def.steps[c.step];
      if (step.timer && c.stepTime > step.timer && !step.check(world, c)) {
        this.failMission('time ran out');
        return;
      }
      if (step.check(world, c)) {
        c.step++;
        c.stepTime = 0;
        if (c.step >= c.def.steps.length) { this.completeMission(); return; }
        const ns = c.def.steps[c.step];
        if (world.hud) world.hud.setObjective(ns.text);
        if (ns.onStart) ns.onStart(world);
        AudioSys.pickup();
      }
    }
    // taxi fare — starts when driving the taxi with no mission active,
    // or while "Taxi King" (m7) is the active mission, since it counts fares
    if (!this.fare && world.playerCar && world.playerCar.type === 'taxi' &&
        (!this.current || this.current.def.id === 'm7')) {
      this.fareCooldown -= dt;
      if (this.fareCooldown <= 0) this.startFare();
    }
    if (this.fare) {
      const f = this.fare;
      f.timer -= dt;
      const target = f.state === 'pickup' ? f.pickup : f.dest;
      const pp = world.playerCar ? world.playerCar.pos : world.player.pos;
      const d = Math.hypot(pp.x - target.x, pp.z - target.z);
      if (d < 5) {
        if (f.state === 'pickup') {
          f.state = 'drop';
          if (world.hud) world.hud.toast('Passenger aboard — drive to the marker', 4);
        } else {
          world.cash += f.reward;
          this.faresDone++;
          if (world.hud) world.hud.toast(`Fare complete! +$${f.reward} (fares: ${this.faresDone})`, 4);
          AudioSys.pickup();
          this.fare = null;
          this.fareCooldown = 20;
          if (world.save) world.save();
        }
      } else if (f.timer <= 0) {
        if (world.hud) world.hud.toast('Fare cancelled — too slow', 4);
        this.fare = null;
        this.fareCooldown = 15;
      }
    }
    // guards shoot at the anchor (the car, if driving)
    for (const g of this.guards) {
      if (g.down) continue;
      const anchor = world.playerCar ? world.playerCar.pos : world.player.pos;
      const dx = anchor.x - g.pos.x, dz = anchor.z - g.pos.z;
      const d = Math.hypot(dx, dz);
      g.mesh.rotation.y = Math.atan2(-dz, dx);
      g.shootAt -= dt;
      if (d < 30 && g.shootAt <= 0) {
        g.shootAt = 1.1 + Math.random() * 0.9;
        // inaccurate shot: 45% hits
        if (Math.random() < 0.45) {
          world.combat.damagePlayer(5 + Math.random() * 4, world);
        }
        Effects.muzzle(
          { x: g.pos.x + Math.cos(g.mesh.rotation.y) * 0.6, y: 1.3, z: g.pos.z - Math.sin(g.mesh.rotation.y) * 0.6 },
          { x: dx / (d || 1), y: 0, z: dz / (d || 1) });
        AudioSys.shot();
      }
    }
  },
};

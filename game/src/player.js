// player.js — Jace on foot: walk, run, jump, punch, shoot, steal cars.
// One job: the character you control when not driving.
const THREE = window.THREE;
import { Combat } from './combat.js';
import { AudioSys } from './audio.js';

function makeJaceMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xe86a1c }); // orange jacket
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c4a6b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.36), jacket);
  body.position.y = 1.18; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), skin);
  head.position.y = 1.84; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hair.position.y = 1.88; g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), jeans);
  legL.position.set(0, 0.4, 0.15); g.add(legL);
  const legR = legL.clone(); legR.position.z = -0.15; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), jacket);
  armL.position.set(0, 1.18, 0.3); g.add(armL);
  const armR = armL.clone(); armR.position.z = -0.3; g.add(armR);
  // pistol in right hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.22, 0.85, -0.3); g.add(gun);
  g.userData = { legL, legR, armL, armR, gun };
  return g;
}

export const Player = {
  mesh: null,
  pos: null,
  heading: 0,
  health: 100,
  ammo: 12,
  reserveAmmo: 48,
  velY: 0,
  onGround: true,
  invulnUntil: 0,
  punchAt: 0,
  shootAt: 0,
  walkPhase: 0,
  lastDamageAt: -100,
  init(world) {
    this.world = world;
    this.mesh = makeJaceMesh();
    this.mesh.position.set(20, 0, 20);
    this.pos = this.mesh.position;
    this.heading = Math.PI * 0.75;
    this.health = 100; this.ammo = 12; this.reserveAmmo = 48;
    world.scene.add(this.mesh);
  },
  enterCar(car, world) {
    world.playerCar = car;
    car.driver = 'player'; car.parked = false;
    this.mesh.visible = false;
    world.police.addHeat(1, 'grand theft auto');
    AudioSys.engine(0, true);
    if (world.hud) world.hud.toast(`You stole the ${car.def.name} — the law noticed.`, 3);
  },
  exitCar(world) {
    const car = world.playerCar;
    if (!car) return;
    world.playerCar = null;
    car.driver = null; car.parked = true; car.speed = 0;
    // step out to the side of the car
    const side = { x: Math.sin(car.heading), z: Math.cos(car.heading) };
    this.pos.set(car.pos.x + side.x * 2.4, 0, car.pos.z + side.z * 2.4);
    this.heading = car.heading;
    this.mesh.visible = true;
    AudioSys.engine(0, false);
  },
  update(dt, world) {
    if (world.playerCar) return; // driving; car handles movement
    const now = performance.now() / 1000;
    const { Input } = world;
    const ax = Input.axis();
    const running = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    const speed = running ? 8.2 : 5.0;
    // camera-relative movement
    const cy = world.camYaw;
    const fx = Math.sin(cy), fz = Math.cos(cy);
    const rx = Math.cos(cy), rz = -Math.sin(cy);
    let mx = fx * ax.f + rx * ax.s;
    let mz = fz * ax.f + rz * ax.s;
    const ml = Math.hypot(mx, mz);
    if (ml > 0.01) {
      mx /= ml; mz /= ml;
      this.heading = Math.atan2(-mz, mx);
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      this.walkPhase += dt * speed * 1.6;
    }
    // building collision
    const hit = world.city.collides(this.pos.x, this.pos.z, 0.7);
    if (hit) {
      const cx = Math.max(hit.minX, Math.min(this.pos.x, hit.maxX));
      const cz = Math.max(hit.minZ, Math.min(this.pos.z, hit.maxZ));
      const dx = this.pos.x - cx, dz = this.pos.z - cz;
      const d = Math.hypot(dx, dz) || 0.01;
      this.pos.x = cx + (dx / d) * 0.7;
      this.pos.z = cz + (dz / d) * 0.7;
    }
    const cl = world.city.clampToWorld(this.pos.x, this.pos.z);
    this.pos.x = cl.x; this.pos.z = cl.z;
    // jump + gravity
    if (Input.isDown('Space') && this.onGround) {
      this.velY = 8.5; this.onGround = false;
    }
    if (!this.onGround) {
      this.velY -= 24 * dt;
      this.pos.y += this.velY * dt;
      if (this.pos.y <= 0) { this.pos.y = 0; this.velY = 0; this.onGround = true; }
    }
    // walk swing
    const s = ml > 0.01 ? Math.sin(this.walkPhase) * 0.55 : 0;
    const u = this.mesh.userData;
    u.legL.rotation.x = s; u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.6; u.armR.rotation.x = s * 0.6;
    this.mesh.rotation.y = this.heading;
    // punch
    if (Input.isDown('KeyF') && now - this.punchAt > 0.4) {
      this.punchAt = now;
      Combat.punch(world);
    }
    // shoot
    if ((Input.isMouseDown() || Input.consumeClick()) && now - this.shootAt > 0.18) {
      this.shootAt = now;
      Combat.shoot(world);
    }
    // reload
    if (Input.isDown('KeyR') && this.ammo < 12 && this.reserveAmmo > 0) {
      const need = 12 - this.ammo;
      const take = Math.min(need, this.reserveAmmo);
      this.ammo += take; this.reserveAmmo -= take;
      AudioSys.click();
    }
    // health regen after 5s calm
    if (now - this.lastDamageAt > 5 && this.health < 100) {
      this.health = Math.min(100, this.health + 2.5 * dt);
    }
  },
};

// helicopter.js — Sunvale PD air support. One job: the police helicopter.
// Spawns at wanted 4-5 stars, circles the player with a searchlight, keeps
// the heat from decaying while it is up, and leaves when the wanted level clears.
// The spotlight is a real SpotLight, so it paints a pool of light on the
// street — the vertical threat the top entries have, and the cover shot's star.
const THREE = window.THREE;
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

function buildHeliMesh() {
  const g = new THREE.Group();
  const navy = new THREE.MeshPhongMaterial({ color: 0x1c2f55, shininess: 70 });
  const white = new THREE.MeshPhongMaterial({ color: 0xe8e8e8, shininess: 60 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x16324a, shininess: 140 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });
  // fuselage: rounded nose + cabin
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.7, 2.2), navy);
  body.position.y = 0; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), navy);
  nose.scale.set(1.2, 0.85, 1.0); nose.position.set(2.4, -0.1, 0); g.add(nose);
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.0), glass);
  cockpit.position.set(1.9, 0.45, 0); g.add(cockpit);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.9), white);
  belly.position.y = -1.0; g.add(belly);
  // tail boom + fin + tail rotor
  const boom = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 0.5), navy);
  boom.position.set(-4.2, 0.35, 0); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.9), navy);
  fin.position.set(-6.3, 0.9, 0); g.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), dark);
  tailRotor.position.set(-6.2, 0.5, 0.35); g.add(tailRotor);
  // main rotor mast + blades (spin around Y)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), dark);
  mast.position.y = 1.25; g.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.7;
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.5), dark);
    blade.rotation.y = a; rotor.add(blade);
  }
  g.add(rotor);
  // skids
  for (const z of [0.9, -0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), dark);
    skid.position.set(0, -1.45, z); g.add(skid);
  }
  // searchlight housing under the nose + visible cone
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.5, 10),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  lamp.position.set(1.6, -1.3, 0); g.add(lamp);
  const coneGeo = new THREE.ConeGeometry(3.2, 30, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff6c8, transparent: true, opacity: 0.16,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -16; // hangs below the lamp, apex at the lamp
  cone.rotation.x = Math.PI; // apex up
  g.add(cone);
  // red anti-collision beacon
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beacon.position.set(-1.2, 1.0, 0); g.add(beacon);
  g.userData = { rotor, tailRotor, cone, beacon };
  return g;
}

export const Helicopter = {
  active: false,
  mesh: null,
  light: null,
  angle: 0,
  rotorSoundOn: false,
  init(world) {
    this.world = world;
    this.active = false;
    this.mesh = null;
    this.light = null;
    this.angle = Math.random() * Math.PI * 2;
  },
  spawn() {
    if (this.active) return;
    const w = this.world;
    const mesh = buildHeliMesh();
    const p = w.playerCar ? w.playerCar.pos : w.player.pos;
    mesh.position.set(p.x + 26, 20, p.z - 18);
    w.scene.add(mesh);
    this.mesh = mesh;
    // real spotlight: paints a pool of light on the street below
    const spot = new THREE.SpotLight(0xfff2b8, 2.2, 90, 0.32, 0.45, 1.2);
    spot.position.copy(mesh.position);
    w.scene.add(spot);
    w.scene.add(spot.target);
    this.light = spot;
    this.active = true;
    if (w.hud) w.hud.toast('POLICE HELICOPTER — the eye in the sky is on you!', 5);
    AudioSys.sting(false);
    AudioSys.rotor(true);
    this.rotorSoundOn = true;
  },
  clear() {
    if (!this.active) return;
    const w = this.world;
    if (this.mesh) w.scene.remove(this.mesh);
    if (this.light) { w.scene.remove(this.light); w.scene.remove(this.light.target); }
    this.mesh = null; this.light = null; this.active = false;
    if (this.rotorSoundOn) { AudioSys.rotor(false); this.rotorSoundOn = false; }
  },
  update(dt, world) {
    // spawn / despawn follows the wanted level
    if (!this.active && world.police.stars >= 4) this.spawn();
    if (this.active && world.police.stars < 4) { this.clear(); return; }
    if (!this.active) return;
    // circle the anchor (the car when driving, Jace on foot)
    const anchor = world.playerCar ? world.playerCar.pos : world.player.pos;
    const p = anchor;
    // circle the player at ~26m, ~14m up (low enough to read in the chase
    // camera), banking into the turn; rise above any rooftop in the way
    this.angle += dt * 0.45;
    const tx = p.x + Math.cos(this.angle) * 26;
    const tz = p.z + Math.sin(this.angle) * 26;
    const m = this.mesh;
    m.position.x += (tx - m.position.x) * Math.min(1, dt * 1.6);
    m.position.z += (tz - m.position.z) * Math.min(1, dt * 1.6);
    const over = world.city.collides(m.position.x, m.position.z, 2);
    const wantY = (over ? over.h + 6 : 14) + Math.sin(performance.now() * 0.0012) * 1.2;
    m.position.y += (wantY - m.position.y) * Math.min(1, dt * 2);
    // face the direction of travel, banked
    const heading = Math.atan2(-(tz - m.position.z), tx - m.position.x);
    m.rotation.y = heading;
    m.rotation.z = 0.14;
    // rotors spin; beacon blinks
    const u = m.userData;
    u.rotor.rotation.y += dt * 22;
    u.tailRotor.rotation.x += dt * 30;
    const blink = Math.sin(performance.now() * 0.012) > 0;
    u.beacon.material.color.setHex(blink ? 0xff2222 : 0x441111);
    // spotlight tracks the player; cone aims down at them
    this.light.position.copy(m.position);
    this.light.target.position.set(p.x, 0, p.z);
    const dx = p.x - m.position.x, dz = p.z - m.position.z;
    const d = Math.hypot(dx, dz) || 1;
    u.cone.lookAt(p.x, m.position.y - 30, p.z);
    // rotor wash: dust kicked up under the beam
    if (Math.random() < dt * 6) {
      Effects.rotorWash({ x: p.x + (Math.random() - 0.5) * 6, y: 0.3, z: p.z + (Math.random() - 0.5) * 6 });
    }
    void d;
  },
};

// pedestrians.js — Sunvale walkers. One job: people on the sidewalks who stroll,
// flee danger, and get knocked down (then get back up).
const THREE = window.THREE;

function makeWalkerMesh(shirtColor, skinColor) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const skin = new THREE.MeshLambertMaterial({ color: skinColor });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3242 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.34), shirt);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.78; head.castShadow = true; g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), pants);
  legL.position.set(0, 0.38, 0.14); g.add(legL);
  const legR = legL.clone(); legR.position.z = -0.14; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), shirt);
  armL.position.set(0, 1.15, 0.28); g.add(armL);
  const armR = armL.clone(); armR.position.z = -0.28; g.add(armR);
  g.userData = { legL, legR, armL, armR, body, head };
  return g;
}

class Walker {
  constructor(mesh, x, z) {
    this.mesh = mesh;
    this.pos = mesh.position; this.pos.set(x, 0, z);
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 1.1 + Math.random() * 0.7;
    this.target = null; this.fleeUntil = 0; this.downUntil = 0;
    this.walkPhase = Math.random() * 6;
    this.state = 'walk';
  }
}

export const Pedestrians = {
  list: [],
  init(world) {
    this.world = world; this.list = [];
    const shirts = [0xd94f4f, 0x4f7dd9, 0x4fd97a, 0xd9c24f, 0x9a4fd9, 0xe8e8e8, 0x4fd9d2, 0xd94fa8];
    const skins = [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0];
    for (let i = 0; i < 16; i++) {
      const p = world.city.randomSidewalkPoint();
      const mesh = makeWalkerMesh(shirts[i % shirts.length], skins[i % skins.length]);
      world.scene.add(mesh);
      this.list.push(new Walker(mesh, p.x, p.z));
    }
  },
  scare(x, z, radius = 14) {
    const now = performance.now() / 1000;
    for (const w of this.list) {
      const d = Math.hypot(w.pos.x - x, w.pos.z - z);
      if (d < radius) { w.state = 'flee'; w.fleeUntil = now + 3; }
    }
  },
  knockDown(x, z, radius, world) {
    let hit = 0;
    const now = performance.now() / 1000;
    for (const w of this.list) {
      if (w.state === 'down') continue;
      const d = Math.hypot(w.pos.x - x, w.pos.z - z);
      if (d < radius) {
        w.state = 'down'; w.downUntil = now + 2.5;
        w.mesh.rotation.x = Math.PI / 2;
        hit++;
      }
    }
    if (hit > 0 && world && world.police) world.police.addHeat(hit, 'pedestrian');
    return hit;
  },
  update(dt, world) {
    const now = performance.now() / 1000;
    for (const w of this.list) {
      if (w.state === 'down') {
        if (now > w.downUntil) {
          w.state = 'flee'; w.fleeUntil = now + 3;
          w.mesh.rotation.x = 0;
        }
        continue;
      }
      if (w.state === 'flee' && now > w.fleeUntil) w.state = 'walk';
      const fleeing = w.state === 'flee';
      const speed = fleeing ? 5.2 : w.speed;
      if (!w.target || Math.hypot(w.target.x - w.pos.x, w.target.z - w.pos.z) < 2) {
        if (fleeing) {
          const dx = w.pos.x - world.player.pos.x, dz = w.pos.z - world.player.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          w.target = { x: w.pos.x + (dx / d) * 30, z: w.pos.z + (dz / d) * 30 };
        } else {
          w.target = world.city.randomSidewalkPoint();
        }
      }
      const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      w.heading = Math.atan2(-dz, dx);
      w.pos.x += (dx / d) * speed * dt;
      w.pos.z += (dz / d) * speed * dt;
      const cl = world.city.clampToWorld(w.pos.x, w.pos.z);
      w.pos.x = cl.x; w.pos.z = cl.z;
      w.mesh.rotation.y = w.heading;
      // walk swing
      w.walkPhase += dt * speed * 4;
      const s = Math.sin(w.walkPhase) * (fleeing ? 0.7 : 0.45);
      const u = w.mesh.userData;
      u.legL.rotation.x = s; u.legR.rotation.x = -s;
      u.armL.rotation.x = -s * 0.7; u.armR.rotation.x = s * 0.7;
      // hit by a fast player car?
      if (world.playerCar && !world.playerCar.dead) {
        const cd = Math.hypot(w.pos.x - world.playerCar.pos.x, w.pos.z - world.playerCar.pos.z);
        if (cd < 2.4 && Math.abs(world.playerCar.speed) > 4) {
          this.knockDown(w.pos.x, w.pos.z, 2.5, world);
          world.playerCar.damage(2, world);
        }
      }
    }
  },
};

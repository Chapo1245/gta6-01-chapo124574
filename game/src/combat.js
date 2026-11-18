// combat.js — shooting, melee, explosions and player damage.
// One job: violence, resolved by ray-vs-sphere tests (no three Raycaster needed).
const THREE = window.THREE;
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

function raySphere(origin, dir, center, radius) {
  const ox = center.x - origin.x, oy = center.y - origin.y, oz = center.z - origin.z;
  const tca = ox * dir.x + oy * dir.y + oz * dir.z;
  if (tca < 0) return -1;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
  if (d2 > radius * radius) return -1;
  return tca - Math.sqrt(radius * radius - d2);
}

export const Combat = {
  shoot(world) {
    const player = world.player;
    if (player.ammo <= 0) {
      AudioSys.click();
      if (world.hud) world.hud.toast('Out of ammo — press R to reload', 2);
      return;
    }
    player.ammo--;
    AudioSys.shot();
    const cam = world.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const muzzle = {
      x: player.pos.x + dir.x * 0.8, y: player.pos.y + 1.45, z: player.pos.z + dir.z * 0.8,
    };
    Effects.muzzle(muzzle, { x: dir.x, y: dir.y, z: dir.z });
    // gather targets
    const targets = [];
    for (const g of world.missions.guards) {
      if (!g.down) targets.push({ p: { x: g.pos.x, y: g.pos.y + 1.2, z: g.pos.z }, r: 1.1, kind: 'guard', ref: g });
    }
    for (const o of world.police.officers) {
      if (!o.down) targets.push({ p: { x: o.pos.x, y: o.pos.y + 1.2, z: o.pos.z }, r: 1.1, kind: 'officer', ref: o });
    }
    for (const w of world.pedestrians.list) {
      if (w.state !== 'down') targets.push({ p: { x: w.pos.x, y: w.pos.y + 1.1, z: w.pos.z }, r: 1.0, kind: 'ped', ref: w });
    }
    for (const c of world.cars.list) {
      if (c.dead || c.driver === 'player') continue;
      targets.push({ p: { x: c.pos.x, y: c.pos.y + 1, z: c.pos.z }, r: 2.4, kind: 'car', ref: c });
    }
    let best = null, bestT = 120;
    for (const t of targets) {
      const tt = raySphere(origin, dir, t.p, t.r);
      if (tt > 0 && tt < bestT) { bestT = tt; best = t; }
    }
    const end = {
      x: origin.x + dir.x * bestT, y: origin.y + dir.y * bestT, z: origin.z + dir.z * bestT,
    };
    this._tracer(muzzle, end, world);
    if (!best) return;
    Effects.blood(end);
    if (best.kind === 'guard') {
      best.ref.health -= 34;
      if (best.ref.health <= 0) {
        best.ref.down = true;
        best.ref.mesh.rotation.x = Math.PI / 2;
        world.police.addHeat(1, 'guard down');
        setTimeout(() => { world.scene.remove(best.ref.mesh); }, 5000);
      }
    } else if (best.kind === 'officer') {
      best.ref.down = true;
      best.ref.mesh.rotation.x = Math.PI / 2;
      world.police.addHeat(2, 'officer down');
      setTimeout(() => { world.scene.remove(best.ref.mesh); world.police.officers = world.police.officers.filter((o) => o !== best.ref); }, 5000);
    } else if (best.kind === 'ped') {
      world.pedestrians.knockDown(best.ref.pos.x, best.ref.pos.z, 2, world);
      world.police.addHeat(2, 'shooting');
    } else if (best.kind === 'car') {
      best.ref.damage(25, world);
      Effects.sparks(end);
      world.police.addHeat(1, 'shooting');
    }
    world.pedestrians.scare(player.pos.x, player.pos.z, 18);
  },
  _tracer(a, b, world) {
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const geo = new THREE.BoxGeometry(len, 0.05, 0.05);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    m.lookAt(b.x, b.y, b.z);
    world.scene.add(m);
    setTimeout(() => { world.scene.remove(m); geo.dispose(); mat.dispose(); }, 70);
  },
  punch(world) {
    const player = world.player;
    AudioSys.punch();
    const fx = Math.cos(player.heading), fz = -Math.sin(player.heading);
    let hitAny = false;
    const tryHit = (px, pz, ref, onHit) => {
      const dx = px - player.pos.x, dz = pz - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.6 && (dx * fx + dz * fz) / (d || 1) > 0.3) { onHit(); hitAny = true; }
    };
    for (const g of world.missions.guards) {
      if (!g.down) tryHit(g.pos.x, g.pos.z, g, () => {
        g.health -= 25;
        if (g.health <= 0) { g.down = true; g.mesh.rotation.x = Math.PI / 2; }
        Effects.blood({ x: g.pos.x, y: 1.2, z: g.pos.z });
      });
    }
    for (const o of world.police.officers) {
      if (!o.down) tryHit(o.pos.x, o.pos.z, o, () => {
        o.down = true; o.mesh.rotation.x = Math.PI / 2;
        world.police.addHeat(1, 'officer down');
      });
    }
    for (const w of world.pedestrians.list) {
      if (w.state !== 'down') tryHit(w.pos.x, w.pos.z, w, () => {
        world.pedestrians.knockDown(w.pos.x, w.pos.z, 2, world);
      });
    }
    if (hitAny) Effects.shake(0.15);
  },
  explodeAt(p, radius, world) {
    Effects.explosion(p);
    AudioSys.explosion();
    Effects.shake(0.6);
    for (const c of world.cars.list) {
      if (c.dead) continue;
      const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
      if (d < radius) c.damage(120 - d * 4, world);
    }
    for (const g of world.missions.guards) {
      if (!g.down && Math.hypot(g.pos.x - p.x, g.pos.z - p.z) < radius) {
        g.down = true; g.mesh.rotation.x = Math.PI / 2;
      }
    }
    for (const o of world.police.officers) {
      if (!o.down && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < radius) {
        o.down = true; o.mesh.rotation.x = Math.PI / 2;
      }
    }
    const pd = Math.hypot(world.player.pos.x - p.x, world.player.pos.z - p.z);
    if (pd < radius) this.damagePlayer(40 - pd, world);
    world.pedestrians.scare(p.x, p.z, radius + 10);
  },
  damagePlayer(amount, world) {
    const player = world.player;
    if (player.invulnUntil > performance.now() / 1000) return;
    player.health -= amount;
    player.invulnUntil = performance.now() / 1000 + 0.25;
    if (world.hud) world.hud.flashDamage();
    if (player.health <= 0) {
      player.health = 0;
      world.wasted();
    }
  },
};

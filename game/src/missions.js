// Azura Bay — eight story jobs for Mara Voss: beacons, minimap markers,
// payouts, and a two-stage final score.
window.AZURA = window.AZURA || {};

const AzuraMissions = {
  list: [
    { name: 'Sunset Pickup', desc: 'Pick up the courier at the marina.', x: 70, z: 245, payout: 500 },
    { name: 'Boardwalk Dash', desc: 'Race the package down to the boardwalk.', x: -70, z: 256, payout: 750 },
    { name: 'Harbor Run', desc: 'Deliver the crate to the east harbor.', x: 245, z: -70, payout: 900 },
    { name: 'Plaza Handoff', desc: 'Meet the contact at the fountain plaza.', x: 0, z: 0, payout: 1100 },
    { name: 'Park Getaway', desc: 'Lose the tail, then reach the park.', x: -140, z: -140, payout: 1400 },
    { name: 'Garage Tune-Up', desc: 'Bring a ride to the garage for the crew.', x: 140, z: 132, payout: 1600 },
    { name: 'Safehouse Drop', desc: 'Stash the goods at the safehouse.', x: -210, z: 198, payout: 2000 },
    { name: 'The Big Score', desc: 'Hit the bank, then vanish at the safehouse.', x: -140, z: 70, payout: 5000, second: { x: -210, z: 198 } },
  ],

  create(scene) {
    // Beacon: a glowing pillar + a pulsing ring at the target.
    const beacon = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.y = 30;
    beacon.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 4.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    ring.name = 'beaconRing';
    beacon.add(ring);
    beacon.visible = false;
    scene.add(beacon);
    return { beacon, index: 0, stage: 0, done: false };
  },

  current(game) {
    const m = game.missions;
    if (m.index >= this.list.length) return null;
    return this.list[m.index];
  },

  target(game) {
    const m = game.missions;
    const job = this.current(game);
    if (!job) return null;
    if (job.second && m.stage === 1) return job.second;
    return { x: job.x, z: job.z };
  },

  update(game, dt) {
    const m = game.missions;
    const job = this.current(game);
    const beacon = m.beacon;
    if (!job) {
      beacon.visible = false;
      return;
    }
    const t = this.target(game);
    beacon.position.set(t.x, 0, t.z);
    beacon.visible = true;
    const ring = beacon.getObjectByName('beaconRing');
    if (ring) {
      const s = 1 + Math.sin(game.time * 3) * 0.15;
      ring.scale.set(s, s, 1);
    }
    // Arrival: within 12 m of the target completes the stage.
    const p = game.player;
    if (AZURA.utils.dist2D(p.x, p.z, t.x, t.z) < 12) {
      if (job.second && m.stage === 0) {
        m.stage = 1;
        game.hud.toast('First half done — now vanish at the safehouse!');
        game.addWanted(2);
      } else {
        game.cash += job.payout;
        game.hud.toast(`${job.name} complete — +$${job.payout}.`);
        m.index += 1;
        m.stage = 0;
        if (m.index >= this.list.length) {
          m.done = true;
          game.cash += 2500;
          game.hud.toast('All eight jobs done — Mara owns Azura Bay. +$2,500 bonus.');
        }
      }
    }
  },
};

AZURA.missions = AzuraMissions;

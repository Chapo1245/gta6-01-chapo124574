// hud.js — HUD, live minimap, toasts, damage vignette. One job: show the game state.
const MAP_SIZE = 220, WORLD_HALF = 240;
const toPx = (v) => ((v + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_SIZE;

export const HUD = {
  els: {},
  toastUntil: 0,
  init() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      cash: $('cash'), healthFill: $('health-fill'), stars: $('stars'),
      clock: $('clock'), objective: $('objective'), objDist: $('obj-dist'),
      speedo: $('speedo'), ammo: $('ammo'), message: $('message'),
      minimap: $('minimap'), crosshair: $('crosshair'), damage: $('damage'),
      wanted: $('wanted-label'),
    };
    this.mm = this.els.minimap.getContext('2d');
  },
  toast(msg, seconds = 4) {
    this.els.message.textContent = msg;
    this.els.message.style.opacity = '1';
    this.toastUntil = performance.now() / 1000 + seconds;
  },
  setObjective(text) { this.els.objective.textContent = text; },
  flashDamage() {
    this.els.damage.style.opacity = '0.55';
    setTimeout(() => { this.els.damage.style.opacity = '0'; }, 180);
  },
  update(world, dt) {
    const e = this.els, now = performance.now() / 1000;
    if (now > this.toastUntil) this.els.message.style.opacity = '0';
    e.cash.textContent = '$' + Math.round(world.cash).toLocaleString('en-US');
    e.healthFill.style.width = Math.max(0, world.player.health) + '%';
    e.healthFill.style.background = world.player.health > 50 ? '#37d67a' : world.player.health > 25 ? '#f7c948' : '#e5484d';
    const stars = world.police.stars;
    e.stars.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    e.stars.style.color = stars > 0 ? '#ffd94a' : 'rgba(255,255,255,0.35)';
    e.wanted.style.opacity = stars > 0 ? '1' : '0.4';
    const mins = Math.floor(world.gameMinutes) % (24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    e.clock.textContent = `${hh}:${mm}`;
    // objective + distance
    const op = world.missions.objectivePos();
    const pp = world.playerCar ? world.playerCar.pos : world.player.pos;
    if (op) {
      const d = Math.hypot(op.x - pp.x, op.z - pp.z);
      e.objDist.textContent = d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
    } else {
      e.objDist.textContent = '';
    }
    e.objective.textContent = world.missions.objectiveText();
    // speedo + ammo
    if (world.playerCar) {
      e.speedo.style.display = 'block';
      e.speedo.textContent = `${Math.round(Math.abs(world.playerCar.speed) * 2.237)} MPH`;
      e.ammo.style.display = 'none';
      e.crosshair.style.display = 'none';
    } else {
      e.speedo.style.display = 'none';
      e.ammo.style.display = 'block';
      e.ammo.textContent = `AMMO ${world.player.ammo} / ${world.player.reserveAmmo}`;
      e.crosshair.style.display = world.state === 'playing' ? 'block' : 'none';
    }
    this._drawMinimap(world);
    void dt;
  },
  _drawMinimap(world) {
    const g = this.mm;
    g.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    g.fillStyle = 'rgba(12,16,24,0.88)';
    g.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    // beach (south = bottom of map)
    g.fillStyle = '#e8d29a';
    g.fillRect(0, toPx(240), MAP_SIZE, MAP_SIZE - toPx(240));
    g.fillStyle = '#1e7fb8';
    g.fillRect(0, toPx(290), MAP_SIZE, MAP_SIZE - toPx(290));
    // blocks
    g.fillStyle = 'rgba(120,128,140,0.5)';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const x = toPx(-228 + i * 52), y = toPx(-228 + j * 52);
      g.fillRect(x, y, (40 / 480) * MAP_SIZE, (40 / 480) * MAP_SIZE);
    }
    // roads
    g.strokeStyle = 'rgba(220,225,235,0.55)'; g.lineWidth = 2;
    for (const c of world.city.streetCenters) {
      g.beginPath(); g.moveTo(toPx(c), 0); g.lineTo(toPx(c), MAP_SIZE); g.stroke();
      g.beginPath(); g.moveTo(0, toPx(c)); g.lineTo(MAP_SIZE, toPx(c)); g.stroke();
    }
    // plaza + parks
    g.fillStyle = '#cfc8bd';
    g.beginPath(); g.arc(toPx(0), toPx(0), 7, 0, 7); g.fill();
    g.fillStyle = '#5da24a';
    g.fillRect(toPx(-208 + 52) - 8, toPx(-208 + 52) - 8, 16, 16);
    g.fillRect(toPx(-208 + 7 * 52) - 8, toPx(-208 + 6 * 52) - 8, 16, 16);
    // landmarks
    const lm = world.city.landmarks;
    const dot = (x, z, color, r = 3.5) => {
      g.fillStyle = color;
      g.beginPath(); g.arc(toPx(x), toPx(z), r, 0, 7); g.fill();
    };
    dot(lm.policeStation.x, lm.policeStation.z, '#3a86ff');
    dot(lm.hospital.x, lm.hospital.z, '#ffffff');
    dot(lm.garage.x, lm.garage.z, '#ffd94a');
    dot(lm.warehouse.x, lm.warehouse.z, '#b08954');
    dot(lm.bank.x, lm.bank.z, '#37d67a');
    // shops (gold $) + safehouse (green home)
    if (lm.shopArms) dot(lm.shopArms.x, lm.shopArms.z, '#ffd94a', 3);
    if (lm.shopMedi) dot(lm.shopMedi.x, lm.shopMedi.z, '#ff8fa3', 3);
    if (lm.shopMart) dot(lm.shopMart.x, lm.shopMart.z, '#ffd94a', 3);
    if (lm.safehouse) {
      g.fillStyle = '#37d67a';
      const sx = toPx(lm.safehouse.x), sy = toPx(lm.safehouse.z);
      g.fillRect(sx - 3, sy - 2, 6, 5);
      g.beginPath(); g.moveTo(sx - 4, sy - 2); g.lineTo(sx, sy - 6); g.lineTo(sx + 4, sy - 2); g.closePath(); g.fill();
    }
    // mission beacon / fare
    const op = world.missions.objectivePos();
    if (op && (world.missions.current || world.missions.fare)) {
      const pulse = 4 + Math.sin(performance.now() * 0.006) * 1.5;
      g.fillStyle = '#ffd94a';
      g.beginPath(); g.arc(toPx(op.x), toPx(op.z), pulse, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(toPx(op.x), toPx(op.z), pulse + 3, 0, 7); g.stroke();
    }
    // traffic (white) + police (flashing red/blue)
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of world.cars.traffic) {
      if (c.dead) continue;
      g.fillRect(toPx(c.pos.x) - 1.5, toPx(c.pos.z) - 1.5, 3, 3);
    }
    const flash = Math.sin(performance.now() * 0.012) > 0;
    g.fillStyle = flash ? '#ff3333' : '#3355ff';
    for (const c of world.police.cars) {
      g.beginPath(); g.arc(toPx(c.pos.x), toPx(c.pos.z), 3.5, 0, 7); g.fill();
    }
    for (const o of world.police.officers) {
      g.fillStyle = '#3a86ff';
      g.fillRect(toPx(o.pos.x) - 2, toPx(o.pos.z) - 2, 4, 4);
    }
    // police helicopter: a yellow H with a rotor bar
    if (world.helicopter && world.helicopter.active && world.helicopter.mesh) {
      const h = world.helicopter.mesh.position;
      const hx = toPx(h.x), hy = toPx(h.z);
      g.fillStyle = '#ffd94a';
      g.beginPath(); g.arc(hx, hy, 5, 0, 7); g.fill();
      g.fillStyle = '#111';
      g.font = 'bold 8px Arial'; g.textAlign = 'center';
      g.fillText('H', hx, hy + 3);
    }
    // player arrow
    const px = toPx(world.player.pos.x), py = toPx(world.player.pos.z);
    g.save();
    g.translate(px, py);
    g.rotate(-world.player.heading + Math.PI / 2);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 1; g.stroke();
    g.restore();
    // north
    g.fillStyle = '#fff'; g.font = 'bold 11px Arial'; g.textAlign = 'left';
    g.fillText('N', 6, 14);
  },
};

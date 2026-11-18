// shops.js — Sunvale shops + safehouse. One job: give cash a purpose.
// Three shops (Sunvale Arms, MediCare Clinic, Corner Mart) sell ammo, armor
// and medkits; the beach safehouse lets Jace rest, heal and save. Shops open
// with B on foot near one; the safehouse rests with H. Buying pauses the
// world (state 'shopping') so nobody shoots you at the counter.
const THREE = window.THREE;
import { Effects } from './effects.js';
import { AudioSys } from './audio.js';

const SHOP_DEFS = [
  { key: 'shopArms', name: 'SUNVALE ARMS', sub: 'Guns · Ammo · Kevlar' },
  { key: 'shopMedi', name: 'MEDICARE CLINIC', sub: 'Patch up · Walk out clean' },
  { key: 'shopMart', name: 'CORNER MART', sub: 'Snacks · Ammo · Open 24h' },
];
const ITEMS = [
  { id: 'ammo', name: 'Pistol Ammo ×48', price: 150, desc: '+48 reserve rounds' },
  { id: 'armor', name: 'Kevlar Vest', price: 300, desc: '+50 armor (max 100)' },
  { id: 'medkit', name: 'Medkit', price: 200, desc: 'Heal to full health' },
];
const SHOP_RANGE = 7;
const REST_RANGE = 8;

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
  g.fillStyle = fg; g.font = 'bold 44px Arial'; g.textAlign = 'center';
  g.fillText(text, 128, 58);
  g.font = 'bold 26px Arial'; g.fillText('★ SHOP ★', 128, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const Shops = {
  openShop: null,
  markers: [],
  init(world) {
    this.world = world;
    this.openShop = null;
    this.markers = [];
    this.els = {
      shop: document.getElementById('shop'),
      name: document.getElementById('shop-name'),
      sub: document.getElementById('shop-sub'),
      cash: document.getElementById('shop-cash'),
      items: document.getElementById('shop-items'),
      close: document.getElementById('shop-close'),
      prompt: document.getElementById('prompt'),
    };
    if (this.els.close) this.els.close.addEventListener('click', () => this.close());
    // floating shop signs so the player can find them from the street
    for (const def of SHOP_DEFS) {
      const lm = world.city.landmarks[def.key];
      if (!lm) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 5, 6),
        new THREE.MeshLambertMaterial({ color: 0x2c2c30 }));
      pole.position.set(lm.x, 2.5, lm.z);
      world.scene.add(pole);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 3),
        new THREE.MeshLambertMaterial({
          map: signTexture(def.name, '#123a5c', '#ffd94a'), side: THREE.DoubleSide,
        }));
      sign.position.set(lm.x, 6.2, lm.z);
      world.scene.add(sign);
      this.markers.push({ mesh: sign, baseY: 6.2, phase: Math.random() * 6 });
    }
  },
  nearestShop() {
    const w = this.world;
    const p = w.player.pos;
    for (const def of SHOP_DEFS) {
      const lm = w.city.landmarks[def.key];
      if (!lm) continue;
      const d = Math.hypot(p.x - lm.x, p.z - lm.z);
      if (d < SHOP_RANGE) return { def, dist: d };
    }
    return null;
  },
  nearSafehouse() {
    const w = this.world;
    const lm = w.city.landmarks.safehouse;
    if (!lm) return false;
    const p = w.player.pos;
    return Math.hypot(p.x - lm.x, p.z - lm.z) < REST_RANGE;
  },
  open() {
    const w = this.world;
    if (w.state !== 'playing' || w.playerCar) return;
    const near = this.nearestShop();
    if (!near) return;
    this.openShop = near.def;
    w.prevState = w.state;
    w.state = 'shopping';
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}
    this._render();
    this.els.shop.classList.remove('hidden');
    AudioSys.click();
  },
  close() {
    if (this.world.state !== 'shopping') return;
    this.els.shop.classList.add('hidden');
    this.openShop = null;
    this.world.state = this.world.prevState || 'playing';
  },
  _render() {
    const w = this.world;
    this.els.name.textContent = this.openShop.name;
    this.els.sub.textContent = this.openShop.sub;
    this.els.cash.textContent = 'Cash: $' + Math.round(w.cash).toLocaleString('en-US');
    this.els.items.innerHTML = ITEMS.map((it) => {
      const afford = w.cash >= it.price;
      const disabled = it.id === 'armor' && w.player.armor >= 100;
      const note = it.id === 'armor' && w.player.armor >= 100 ? ' — MAXED' : '';
      return `<div class="shop-item">
        <div class="shop-item-info"><b>${it.name}</b> — $${it.price}<br><span>${it.desc}${note}</span></div>
        <button data-item="${it.id}" ${afford && !disabled ? '' : 'disabled'}>BUY</button>
      </div>`;
    }).join('');
    this.els.items.querySelectorAll('button[data-item]').forEach((btn) => {
      btn.addEventListener('click', () => this.buy(btn.getAttribute('data-item')));
    });
  },
  buy(itemId) {
    const w = this.world;
    const it = ITEMS.find((i) => i.id === itemId);
    if (!it || w.cash < it.price) return;
    if (itemId === 'armor' && w.player.armor >= 100) return;
    w.cash -= it.price;
    if (itemId === 'ammo') {
      w.player.reserveAmmo += 48;
      if (w.hud) w.hud.toast('Ammo bought — +48 reserve rounds', 3);
    } else if (itemId === 'armor') {
      w.player.armor = Math.min(100, w.player.armor + 50);
      Effects.cashBurst({ x: w.player.pos.x, y: 1.4, z: w.player.pos.z });
      if (w.hud) w.hud.toast(`Kevlar on — armor ${Math.round(w.player.armor)}`, 3);
    } else if (itemId === 'medkit') {
      w.player.health = 100;
      Effects.heal({ x: w.player.pos.x, y: 1.2, z: w.player.pos.z });
      if (w.hud) w.hud.toast('Patched up — full health', 3);
    }
    AudioSys.purchase();
    this._render();
    if (w.save) w.save();
  },
  rest() {
    const w = this.world;
    if (w.state !== 'playing' || w.playerCar || !this.nearSafehouse()) return;
    if (w.police.stars > 0) {
      if (w.hud) w.hud.toast('Too hot to rest — lose the cops first.', 3);
      return;
    }
    w.player.health = 100;
    w.gameMinutes = 9 * 60; // sleep through the night, up at 09:00
    Effects.heal({ x: w.player.pos.x, y: 1.2, z: w.player.pos.z });
    AudioSys.heal();
    if (w.hud) w.hud.toast('Rested at the safehouse — fresh morning, full health. Saved.', 4);
    if (w.save) w.save();
  },
  update(dt, world) {
    // bob the shop signs
    for (const m of this.markers) {
      m.mesh.position.y = m.baseY + Math.sin(performance.now() * 0.002 + m.phase) * 0.25;
      m.mesh.lookAt(world.camera.position.x, m.mesh.position.y, world.camera.position.z);
    }
    // context prompt (only while playing, on foot)
    const el = this.els.prompt;
    if (!el) return;
    if (world.state !== 'playing' || world.playerCar) { el.style.display = 'none'; return; }
    const near = this.nearestShop();
    if (near) {
      el.textContent = `Press B — ${near.def.name}`;
      el.style.display = 'block';
    } else if (this.nearSafehouse()) {
      el.textContent = world.police.stars > 0 ? 'Safehouse — lose the cops to rest' : 'Press H — Rest at the safehouse';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
    void dt;
  },
};

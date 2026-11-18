// garage.js — Mara's Garage upgrades. One job: spend cash on cars.
// Three upgrade lines, each with levels bought with cash: Engine Tune
// (top speed +15% a level), Armor Plating (car damage -12% a level) and
// NOS Boost (boost multiplier +25% a level). Levels are player-owned —
// they apply to whatever car Jace drives — and persist in the save. Opens
// with G while driving near Mara's Garage; buying pauses the world
// (state 'garage') so the cops wait outside.
import { AudioSys } from './audio.js';

const UPGRADES = [
  {
    id: 'speed', name: 'Engine Tune', max: 3, costs: [800, 1500, 2500],
    desc: 'Top speed +15% per level', effect: (l) => `+${l * 15}% top speed`,
  },
  {
    id: 'armor', name: 'Armor Plating', max: 3, costs: [600, 1200, 2000],
    desc: 'Car takes 12% less damage per level', effect: (l) => `-${l * 12}% damage taken`,
  },
  {
    id: 'nos', name: 'NOS Boost', max: 2, costs: [1000, 1800],
    desc: 'Boost multiplier +25% per level', effect: (l) => `+${l * 25}% boost`,
  },
];
const GARAGE_RANGE = 9;

export const Garage = {
  levels: { speed: 0, armor: 0, nos: 0 },
  init(world) {
    this.world = world;
    this.levels = { speed: 0, armor: 0, nos: 0 };
    this.els = {
      panel: document.getElementById('garage'),
      cash: document.getElementById('garage-cash'),
      items: document.getElementById('garage-items'),
      close: document.getElementById('garage-close'),
      prompt: document.getElementById('prompt'),
    };
    if (this.els.close) this.els.close.addEventListener('click', () => this.close());
  },
  nearGarage() {
    const w = this.world;
    if (!w.playerCar) return false;
    const g = w.city.landmarks.garage;
    const c = w.playerCar.pos;
    return Math.hypot(c.x - g.x, c.z - g.z) < GARAGE_RANGE;
  },
  open() {
    const w = this.world;
    if (w.state !== 'playing' || !this.nearGarage()) return;
    w.prevState = w.state;
    w.state = 'garage';
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}
    this._render();
    this.els.panel.classList.remove('hidden');
    AudioSys.click();
  },
  close() {
    if (this.world.state !== 'garage') return;
    this.els.panel.classList.add('hidden');
    this.world.state = this.world.prevState || 'playing';
  },
  _render() {
    const w = this.world;
    this.els.cash.textContent = 'Cash: $' + Math.round(w.cash).toLocaleString('en-US');
    this.els.items.innerHTML = UPGRADES.map((u) => {
      const lvl = this.levels[u.id];
      const maxed = lvl >= u.max;
      const cost = maxed ? null : u.costs[lvl];
      const afford = cost !== null && w.cash >= cost;
      const pips = '●'.repeat(lvl) + '○'.repeat(u.max - lvl);
      return `<div class="shop-item">
        <div class="shop-item-info"><b>${u.name}</b> ${pips}<br><span>${u.desc}${lvl > 0 ? ` — now ${u.effect(lvl)}` : ''}</span></div>
        <button data-up="${u.id}" ${maxed || !afford ? 'disabled' : ''}>${maxed ? 'MAX' : 'BUY $' + cost}</button>
      </div>`;
    }).join('');
    this.els.items.querySelectorAll('button[data-up]').forEach((btn) => {
      btn.addEventListener('click', () => this.buy(btn.getAttribute('data-up')));
    });
  },
  buy(id) {
    const w = this.world;
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const lvl = this.levels[id];
    if (lvl >= u.max) return;
    const cost = u.costs[lvl];
    if (w.cash < cost) return;
    w.cash -= cost;
    this.levels[id] = lvl + 1;
    AudioSys.purchase();
    if (w.hud) w.hud.toast(`${u.name} level ${lvl + 1} — ${u.effect(lvl + 1)}`, 4);
    this._render();
    if (w.save) w.save();
  },
  // modifiers read by cars.js every frame, so upgrades bite immediately
  speedMult() { return 1 + 0.15 * this.levels.speed; },
  damageMult() { return 1 - 0.12 * this.levels.armor; },
  boostMult() { return 1.25 + 0.25 * this.levels.nos; },
  update(dt, world) {
    // the garage prompt shares the #prompt line with shops; garage wins
    // while driving, shops win on foot — shops.js hides it in a car anyway.
    const el = this.els.prompt;
    if (!el) return;
    if (world.state === 'playing' && world.playerCar && this.nearGarage()) {
      el.textContent = "Press G — Mara's Garage (upgrades)";
      el.style.display = 'block';
    }
    void dt;
  },
};

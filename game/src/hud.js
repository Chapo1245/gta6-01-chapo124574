// Azura Bay — the HUD: wanted stars, cash, health, speed, radio, the
// live minimap, objective banner, toasts, menus and the garage shop.
window.AZURA = window.AZURA || {};

const AzuraHud = {
  el(id) {
    return document.getElementById(id);
  },

  init(game) {
    this.game = game;
    this.map = this.el('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
    const startBtn = this.el('startBtn');
    if (startBtn) startBtn.addEventListener('click', () => game.startPlaying());
    const resumeBtn = this.el('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => game.resume());
    const restartBtn = this.el('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => game.restart());
    const garageClose = this.el('garageClose');
    if (garageClose) garageClose.addEventListener('click', () => this.hideGarage(game));
    ['buyEngine2', 'buyEngine3', 'buyArmor'].forEach((id) => {
      const btn = this.el(id);
      if (btn) btn.addEventListener('click', () => this.buy(game, id));
    });
  },

  toast(message) {
    // Screenshot staging keeps the frame clean: no toast text over it.
    if (this.game && this.game.shotMode) return;
    const t = this.el('toast');
    if (!t) return;
    t.textContent = message;
    t.style.opacity = '1';
    this.toastTimer = 3.5;
  },

  showMenu(game) {
    this.el('menu').style.display = 'flex';
    this.el('hud').style.display = 'none';
  },

  showHud(game) {
    this.el('menu').style.display = 'none';
    this.el('pauseMenu').style.display = 'none';
    this.el('overMenu').style.display = 'none';
    this.el('garageMenu').style.display = 'none';
    this.el('hud').style.display = 'block';
  },

  showPause(game) {
    this.el('pauseMenu').style.display = 'flex';
  },

  showGameOver(game, reason) {
    this.el('overTitle').textContent = reason;
    this.el('overStats').textContent = `Cash $${game.cash} · Jobs done ${game.missions.index} / 8`;
    this.el('overMenu').style.display = 'flex';
  },

  showGarage(game) {
    const g = this.el('garageMenu');
    g.style.display = 'flex';
    this.el('buyEngine2').disabled = game.upgrades.engine >= 2 || game.cash < game.config.engine2Price;
    this.el('buyEngine3').disabled = game.upgrades.engine >= 3 || game.cash < game.config.engine3Price;
    this.el('buyArmor').disabled = game.upgrades.armor || game.cash < game.config.armorPrice;
    this.el('garageCash').textContent = `Cash $${game.cash}`;
  },

  hideGarage(game) {
    this.el('garageMenu').style.display = 'none';
    game.resume();
  },

  buy(game, id) {
    if (id === 'buyEngine2' && game.cash >= game.config.engine2Price) {
      game.cash -= game.config.engine2Price;
      game.upgrades.engine = 2;
      this.toast('Engine Mk II fitted — faster top speed.');
    } else if (id === 'buyEngine3' && game.cash >= game.config.engine3Price) {
      game.cash -= game.config.engine3Price;
      game.upgrades.engine = 3;
      this.toast('Engine Mk III fitted — the fastest ride in Azura Bay.');
    } else if (id === 'buyArmor' && game.cash >= game.config.armorPrice) {
      game.cash -= game.config.armorPrice;
      game.upgrades.armor = true;
      this.toast('Armor plating fitted — crashes hurt half as much.');
    }
    this.showGarage(game);
  },

  // Live minimap: roads, beach, landmarks, player, traffic, police, beacon.
  drawMinimap(game) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 180;
    const cfg = game.config;
    const toMap = (x, z) => [((x + 300) / 600) * S, ((z + 300) / 600) * S];
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, S, S);
    // Ocean + sand at the south edge.
    const [, oceanY] = toMap(0, cfg.oceanStartZ);
    ctx.fillStyle = '#2a7fa8';
    ctx.fillRect(0, oceanY, S, S - oceanY);
    const [, sandY] = toMap(0, cfg.sandStartZ);
    ctx.fillStyle = '#e8d5a0';
    ctx.fillRect(0, sandY, S, oceanY - sandY);
    // Park.
    const [px, py] = toMap(cfg.park.x, cfg.park.z);
    ctx.fillStyle = '#3f7a34';
    ctx.fillRect(px - 9, py - 9, 18, 18);
    // Roads.
    ctx.strokeStyle = '#4a4f58';
    ctx.lineWidth = 3;
    cfg.roadCenters.forEach((c) => {
      const [x] = toMap(c, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
      const [, y] = toMap(0, c);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    });
    // Landmarks: G garage, H safehouse.
    ctx.fillStyle = '#ffc93c';
    ctx.font = 'bold 11px sans-serif';
    const [gx, gy] = toMap(cfg.garage.x, cfg.garage.z);
    ctx.fillText('G', gx - 3, gy + 4);
    const [hx, hy] = toMap(cfg.safehouse.x, cfg.safehouse.z);
    ctx.fillText('H', hx - 3, hy + 4);
    // Mission beacon.
    const target = AZURA.missions.target(game);
    if (target) {
      const [tx, ty] = toMap(target.x, target.z);
      const pulse = 4 + Math.sin(game.time * 4) * 1.5;
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.arc(tx, ty, pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traffic dots.
    game.cars.forEach((car) => {
      const [cx, cy] = toMap(car.x, car.z);
      ctx.fillStyle = car.police ? (Math.floor(game.time * 4) % 2 ? '#ff2222' : '#2244ff') : '#dddddd';
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    });
    // Player arrow.
    const [ux, uy] = toMap(game.player.x, game.player.z);
    ctx.save();
    ctx.translate(ux, uy);
    ctx.rotate(-game.player.heading);
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  update(game, dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el('toast').style.opacity = '0';
    }
    // Wanted stars.
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < game.wanted ? '★' : '☆';
    this.el('stars').textContent = stars;
    this.el('stars').style.color = game.wanted >= 3 ? '#ff4444' : '#ffc93c';
    this.el('cash').textContent = `$${game.cash}`;
    this.el('health').style.width = `${game.player.health}%`;
    const speed = game.player.inCar ? Math.abs(game.player.inCar.speed) * 2.2 : 0;
    this.el('speed').textContent = game.player.inCar ? `${Math.round(speed)} mph` : 'on foot';
    this.el('radio').textContent = game.audio.muted ? 'muted' : game.audio.stationName();
    const job = AZURA.missions.current(game);
    this.el('objective').textContent = job
      ? `Job ${game.missions.index + 1}/8 — ${job.name}: ${job.desc} ($${job.payout})`
      : 'All jobs done — Azura Bay is yours.';
    const car = game.player.inCar;
    const nearCar = !car && AZURA.player.nearestCar(game, 4);
    const nearGarage = !car && AZURA.utils.dist2D(game.player.x, game.player.z, game.config.garage.x, game.config.garage.z) < 18;
    const nearHouse = !car && AZURA.utils.dist2D(game.player.x, game.player.z, game.config.safehouse.x, game.config.safehouse.z) < 12;
    const nearShop = !car && game.config.shops.some((s) => AZURA.utils.dist2D(game.player.x, game.player.z, s.x, s.z) < 12);
    let hint = '';
    if (car) hint = 'E exit · Space handbrake · F —';
    else if (nearCar) hint = 'E — steal this car';
    else if (nearGarage) hint = 'E — open the garage';
    else if (nearHouse) hint = 'E — save at the safehouse';
    else if (nearShop) hint = 'E — buy a snack ($25)';
    else if (game.wanted > 0) hint = 'Lay low — the heat fades';
    this.el('hint').textContent = hint;
    this.drawMinimap(game);
  },
};

AZURA.hud = AzuraHud;

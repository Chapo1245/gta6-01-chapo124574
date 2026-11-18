// The HUD: wanted stars, money and health, speed, the current objective,
// the radio station, and a live 2D minimap that draws the city, the player,
// the police and the mission beacon. Menus are DOM too: title, pause, over.
import { CITY } from './config.js';

const MAP_SIZE = 184;
const MAP_SCALE = MAP_SIZE / (CITY.maxX - CITY.minX + 60);

function toMap(x, z) {
  return {
    x: (x - CITY.minX + 30) * MAP_SCALE,
    y: (z - CITY.minZ + 30) * MAP_SCALE,
  };
}

export function createHud() {
  const root = document.getElementById('hud');
  const map = document.getElementById('minimap');
  const mapCtx = map.getContext('2d');
  return {
    root,
    map,
    mapCtx,
    stars: document.getElementById('stars'),
    money: document.getElementById('money'),
    health: document.getElementById('health-fill'),
    healthText: document.getElementById('health-text'),
    speed: document.getElementById('speed'),
    objective: document.getElementById('objective'),
    objectiveDist: document.getElementById('objective-dist'),
    radio: document.getElementById('radio'),
    message: document.getElementById('message'),
    screen: document.getElementById('screen'),
    screenTitle: document.getElementById('screen-title'),
    screenText: document.getElementById('screen-text'),
    hint: document.getElementById('hint'),
  };
}

export function drawMinimap(hud, world, player, police, missionTarget, traffic) {
  const ctx = hud.mapCtx;
  ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = 'rgba(12, 18, 26, 0.82)';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  // Beach and ocean.
  const beach = toMap(CITY.beachX0, CITY.minZ);
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(beach.x, 0, MAP_SIZE - beach.x, MAP_SIZE);
  const ocean = toMap(CITY.oceanX0, CITY.minZ);
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(ocean.x, 0, MAP_SIZE - ocean.x, MAP_SIZE);
  // Roads.
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 3;
  for (const x of CITY.avenues) {
    const p = toMap(x, CITY.minZ);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, MAP_SIZE);
    ctx.stroke();
  }
  for (const z of CITY.streets) {
    const p = toMap(CITY.minX, z);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(MAP_SIZE, p.y);
    ctx.stroke();
  }
  // Park and plaza.
  ctx.fillStyle = '#4a7a3a';
  const park = toMap(world.locations.park.x - 27, world.locations.park.z - 27);
  ctx.fillRect(park.x, park.y, 54 * MAP_SCALE, 54 * MAP_SCALE);
  ctx.fillStyle = '#b8a888';
  const plaza = toMap(world.locations.plaza.x - 27, world.locations.plaza.z - 27);
  ctx.fillRect(plaza.x, plaza.y, 54 * MAP_SCALE, 54 * MAP_SCALE);
  // Mission beacon.
  if (missionTarget) {
    const p = toMap(missionTarget.x, missionTarget.z);
    const pulse = 6 + Math.sin(performance.now() / 180) * 2;
    ctx.fillStyle = '#ffd24d';
    ctx.beginPath();
    ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5a00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Traffic as faint dots.
  ctx.fillStyle = 'rgba(220, 220, 220, 0.7)';
  for (const car of traffic) {
    const p = toMap(car.x, car.z);
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
  // Police as blue dots.
  ctx.fillStyle = '#4a90ff';
  for (const cop of police.cruisers) {
    const p = toMap(cop.x, cop.z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (police.heli) {
    const p = toMap(police.heli.x, police.heli.z);
    ctx.fillStyle = '#4a90ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player: a white arrow pointing along the heading.
  const p = toMap(player.x, player.z);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-player.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('N', 4, 12);
}

export function renderHud(hud, state) {
  // Wanted stars.
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < state.stars ? '★' : '☆';
  hud.stars.textContent = stars;
  hud.stars.style.color = state.stars >= 3 ? '#ff5a4a' : '#ffd24d';
  hud.money.textContent = `$${Math.floor(state.money).toLocaleString('en-US')}`;
  hud.health.style.width = `${Math.max(0, state.health)}%`;
  hud.health.style.background = state.health > 50 ? '#5ac25a' : state.health > 25 ? '#e8a13a' : '#e5534b';
  hud.healthText.textContent = `${Math.ceil(Math.max(0, state.health))}`;
  hud.speed.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
  if (state.objective) {
    hud.objective.textContent = state.objective;
    hud.objectiveDist.textContent = state.objectiveDist != null ? `${Math.round(state.objectiveDist)} m` : '';
  } else {
    hud.objective.textContent = 'No active job — press M for the next job';
    hud.objectiveDist.textContent = '';
  }
  hud.radio.textContent = `♪ ${state.station}`;
  if (state.message && state.messageTime > 0) {
    hud.message.textContent = state.message;
    hud.message.style.opacity = '1';
  } else {
    hud.message.style.opacity = '0';
  }
  hud.hint.textContent = state.inCar
    ? 'WASD drive · Space handbrake · E exit car · R radio · P pause'
    : 'WASD move · Shift run · E enter car · F punch · M next job · R radio · P pause';
}

export function showScreen(hud, kind, title, text) {
  hud.screen.dataset.kind = kind;
  hud.screenTitle.textContent = title;
  hud.screenText.innerHTML = text;
  hud.screen.style.display = 'flex';
}

export function hideScreen(hud) {
  hud.screen.style.display = 'none';
}

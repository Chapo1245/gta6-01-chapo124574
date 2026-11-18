// The screenshot scenes behind ?shot=cover|drive|mission|vista. Each one
// stages the real game — the player, traffic, police, a mission and the HUD —
// from a fixed seed, then freezes the simulation so the frame is exactly what
// a short game really looks like. The caller renders it a few times and sets
// window.__SHOT_READY when the frame is settled.
import { CITY } from './config.js';
import { addHeat, clearPolice } from './police.js';
import { startJob } from './missions.js';

function placePlayerCar(game, x, z, heading) {
  game.player.inCar = true;
  game.player.car.x = x;
  game.player.car.z = z;
  game.player.car.heading = heading;
  game.player.car.speed = 14;
  game.player.x = x;
  game.player.z = z;
  game.player.heading = heading;
  game.player.car.group.position.set(x, 0, z);
  game.player.car.group.rotation.y = heading;
  game.scene.add(game.player.car.group);
}

function placePlayerOnFoot(game, x, z, heading) {
  game.player.inCar = false;
  game.player.x = x;
  game.player.z = z;
  game.player.heading = heading;
  game.player.figure.position.set(x, 0, z);
  game.player.figure.rotation.y = heading;
  game.scene.add(game.player.figure);
}

function setCamera(game, x, y, z, lookX, lookY, lookZ) {
  game.camera.position.set(x, y, z);
  game.camera.lookAt(lookX, lookY, lookZ);
}

// A cruiser placed right on the player's tail for the cover.
function tailCruiser(game, px, pz, heading, back) {
  const cop = game.police.cruisers[0];
  if (!cop) return;
  const bx = px - Math.cos(heading) * back;
  const bz = pz + Math.sin(heading) * back;
  cop.x = bx;
  cop.z = bz;
  cop.heading = heading;
  cop.speed = 16;
  cop.group.position.set(bx, 0, bz);
  cop.group.rotation.y = heading;
}

export function stageShot(name, game) {
  clearPolice(game.police, game.scene);
  game.missions.current = -1;
  game.missions.step = 0;
  game.player.health = 100;
  game.player.money = 1250;

  if (name === 'drive') {
    // Cruising south down Palm Avenue, traffic and shops ahead. The camera
    // sits behind and to the right, so the coupe shows its side profile.
    placePlayerCar(game, 28, -120, -Math.PI / 2);
    game.player.car.speed = 12;
    startJob(game.missions, 0);
    setCamera(game, 38, 6, -132, 26, 1.5, -95);
    return 'drive';
  }
  if (name === 'mission') {
    // On foot at the beach pickup: Mara beside the gold beacon, the ocean
    // behind her to the east, the beach running south.
    placePlayerOnFoot(game, 278, 52, -Math.PI / 2);
    startJob(game.missions, 3);
    game.beacon.position.set(282, 0, 60);
    game.beacon.visible = true;
    setCamera(game, 276, 3.5, 40, 282, 1.5, 62);
    return 'mission';
  }
  if (name === 'vista') {
    placePlayerCar(game, -42, -42, Math.PI / 2);
    startJob(game.missions, 0);
    setCamera(game, -190, 170, 210, 60, 0, -40);
    return 'vista';
  }
  // cover: a police chase on Coral Row. The camera sits on the south side of
  // the road, level with the midpoint between the coupe and its tail, so the
  // chase reads across the frame: cruiser, coupe, helicopter above and ahead.
  placePlayerCar(game, -40, -112, 0);
  game.player.car.speed = 18;
  startJob(game.missions, 2);
  addHeat(game.police, 3);
  // Let the police module spawn its cruisers and helicopter, then arrange them.
  game.policeStep(0.5);
  tailCruiser(game, -40, -112, 0, 13);
  if (game.police.cruisers[1]) {
    const cop = game.police.cruisers[1];
    cop.x = -40 - 26;
    cop.z = -112 + 7;
    cop.heading = 0;
    cop.speed = 17;
    cop.group.position.set(cop.x, 0, cop.z);
    cop.group.rotation.y = 0;
  }
  if (game.police.heli) {
    game.police.heli.group.position.set(-40, 24, -160);
    game.police.heli.target.position.set(-40, -24, 48);
  }
  setCamera(game, -46, 8, -86, -42, 4, -112);
  return 'cover';
}

export function shotName(param) {
  if (param === 'drive' || param === 'mission' || param === 'vista') return param;
  return 'cover';
}

export { CITY };

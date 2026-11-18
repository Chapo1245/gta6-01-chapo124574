// Azura Bay's city: the road grid, blocks and buildings, the beach and the
// ocean, the park, the plaza fountain, palms, streetlights and the distant
// skyline. Everything is placed from one seeded stream, so the city is the
// same every time the game loads.
import { CITY, PALETTE } from './config.js';
import {
  makeBoardwalkTexture,
  makeFacadeTextures,
  makeRoadTexture,
  makeSandTexture,
  makeSignTexture,
} from './textures.js';

const BLOCK_CENTRES = [];
for (let i = 0; i < CITY.avenues.length - 1; i += 1) {
  BLOCK_CENTRES.push((CITY.avenues[i] + CITY.avenues[i + 1]) / 2);
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function flat(w, d, material, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

// A palm: a leaning trunk and a crown of flat fronds.
function makePalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 7, 6), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = (rng.next() - 0.5) * 0.16;
  trunk.castShadow = true;
  group.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i += 1) {
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2), frondMat);
    const angle = (i / 7) * Math.PI * 2 + rng.next() * 0.4;
    frond.position.set(Math.cos(angle) * 1.1, 7.1, Math.sin(angle) * 1.1);
    frond.rotation.set(Math.sin(angle) * 1.1 - 0.5, angle, Math.cos(angle) * 0.4);
    frond.castShadow = true;
    group.add(frond);
  }
  const nuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 }),
  );
  nuts.position.y = 6.9;
  group.add(nuts);
  return group;
}

function makeStreetlight() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 8), dark);
  pole.position.y = 3.2;
  pole.castShadow = true;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), dark);
  arm.position.set(0.8, 6.35, 0);
  group.add(arm);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc860, emissiveIntensity: 0.9 }),
  );
  lamp.position.set(1.55, 6.3, 0);
  group.add(lamp);
  return group;
}

export function buildWorld(rng) {
  const group = new THREE.Group();
  const facades = makeFacadeTextures(rng.fork(11));
  const roadTex = makeRoadTexture();
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  const sandTex = makeSandTexture();
  sandTex.wrapS = THREE.RepeatWrapping;
  sandTex.wrapT = THREE.RepeatWrapping;
  const boardTex = makeBoardwalkTexture();
  boardTex.wrapS = THREE.RepeatWrapping;
  boardTex.wrapT = THREE.RepeatWrapping;

  const groundMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 });
  const oceanMat = new THREE.MeshStandardMaterial({ color: PALETTE.ocean, roughness: 0.25, metalness: 0.1 });
  const grassMat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 });
  const plazaMat = new THREE.MeshStandardMaterial({ color: PALETTE.plaza, roughness: 1 });
  const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9 });
  const waterMat = new THREE.MeshStandardMaterial({ color: PALETTE.fountain, roughness: 0.15, metalness: 0.2 });

  // Base ground slab under the whole city.
  group.add(flat(600, 600, groundMat, -0.05));
  // Roads: one long strip per avenue and per street.
  const roadLen = 560;
  for (const x of CITY.avenues) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, roadLen / 28);
    const strip = flat(CITY.roadWidth, roadLen, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), 0);
    strip.position.set(x, 0, 0);
    group.add(strip);
  }
  for (const z of CITY.streets) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(roadLen / 28, 1);
    const strip = flat(roadLen, CITY.roadWidth, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), 0);
    strip.position.set(0, 0, z);
    group.add(strip);
  }

  // Beach, boardwalk and ocean to the east.
  const beach = flat(CITY.beachX1 - CITY.beachX0, 600, sandMat, 0.02);
  beach.position.set((CITY.beachX0 + CITY.beachX1) / 2, 0.02, 0);
  beach.material.map.repeat.set(2, 20);
  group.add(beach);
  const boardwalk = flat(10, 560, boardMat, 0.06);
  boardwalk.position.set(CITY.beachX0 - 2, 0.06, 0);
  boardwalk.material.map.repeat.set(1, 40);
  group.add(boardwalk);
  const ocean = flat(260, 700, oceanMat, -0.4);
  ocean.position.set(CITY.oceanX0 + 130, -0.4, 0);
  group.add(ocean);

  // Special blocks: park at the centre, plaza one block east of it.
  const parkCentre = { x: BLOCK_CENTRES[3], z: BLOCK_CENTRES[3] };
  const plazaCentre = { x: BLOCK_CENTRES[5], z: BLOCK_CENTRES[3] };
  const garageCentre = { x: BLOCK_CENTRES[1], z: BLOCK_CENTRES[5] };
  const houseCentre = { x: BLOCK_CENTRES[5], z: BLOCK_CENTRES[5] };

  // Park: lawn, a pond and trees.
  const park = flat(54, 54, grassMat, 0.03);
  park.position.set(parkCentre.x, 0.03, parkCentre.z);
  group.add(park);
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a90b8, roughness: 0.2 }),
  );
  pond.position.set(parkCentre.x + 8, 0.2, parkCentre.z - 6);
  group.add(pond);
  const parkRng = rng.fork(23);
  for (let i = 0; i < 14; i += 1) {
    const tree = makePalm(parkRng);
    tree.position.set(
      parkCentre.x + parkRng.range(-24, 24),
      0,
      parkCentre.z + parkRng.range(-24, 24),
    );
    group.add(tree);
  }

  // Plaza: paved square with a round fountain.
  const plaza = flat(54, 54, plazaMat, 0.03);
  plaza.position.set(plazaCentre.x, 0.03, plazaCentre.z);
  group.add(plaza);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7.6, 1, 24),
    new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.8 }),
  );
  rim.position.set(plazaCentre.x, 0.5, plazaCentre.z);
  rim.castShadow = true;
  group.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.7, 24), waterMat);
  water.position.set(plazaCentre.x, 0.6, plazaCentre.z);
  group.add(water);
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.8 }),
  );
  spout.position.set(plazaCentre.x, 1.8, plazaCentre.z);
  spout.castShadow = true;
  group.add(spout);

  // Buildings on every other block.
  const buildRng = rng.fork(37);
  const shopSigns = [
    ['PIZZA', '#b23a2e', '#ffe9c2'],
    ['TACOS', '#2e6b4f', '#fff2c8'],
    ['DONUTS', '#c26a9a', '#fff'],
    ['BURGERS', '#8a5a2e', '#ffe9c2'],
    ['COFFEE', '#4a3226', '#f2e3c2'],
    ['SURF SHOP', '#2e6b8a', '#fff'],
  ];
  const buildings = [];
  for (let bi = 0; bi < BLOCK_CENTRES.length; bi += 1) {
    for (let bj = 0; bj < BLOCK_CENTRES.length; bj += 1) {
      const cx = BLOCK_CENTRES[bi];
      const cz = BLOCK_CENTRES[bj];
      const isPark = Math.abs(cx - parkCentre.x) < 1 && Math.abs(cz - parkCentre.z) < 1;
      const isPlaza = Math.abs(cx - plazaCentre.x) < 1 && Math.abs(cz - plazaCentre.z) < 1;
      if (isPark || isPlaza) continue;
      const isGarage = Math.abs(cx - garageCentre.x) < 1 && Math.abs(cz - garageCentre.z) < 1;
      const isHouse = Math.abs(cx - houseCentre.x) < 1 && Math.abs(cz - houseCentre.z) < 1;
      const lots = isGarage || isHouse ? 1 : buildRng.int(2, 4);
      for (let l = 0; l < lots; l += 1) {
        const w = buildRng.range(14, 22);
        const d = buildRng.range(14, 22);
        const h = isHouse ? 7 : isGarage ? 9 : buildRng.range(9, 38);
        const ox = cx + buildRng.range(-14, 14) * (lots > 1 ? 0.7 : 0);
        const oz = cz + buildRng.range(-14, 14) * (lots > 1 ? 0.7 : 0);
        const facade = facades[buildRng.int(0, facades.length - 1)];
        const side = new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 0.95 });
        const mats = [side, side, side, side, new THREE.MeshStandardMaterial({ map: facade, roughness: 0.9 }), side];
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        b.position.set(ox, h / 2, oz);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        buildings.push({ x: ox, z: oz, w, d, h });
        if (h > 22 && buildRng.chance(0.6)) {
          const roof = box(buildRng.range(4, 7), 2.5, buildRng.range(4, 7), side);
          roof.position.set(ox + buildRng.range(-3, 3), h + 1.25, oz + buildRng.range(-3, 3));
          group.add(roof);
        }
        if (Math.abs(ox - 28) < 30 && buildRng.chance(0.55)) {
          const [text, bg, fg] = shopSigns[buildRng.int(0, shopSigns.length - 1)];
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(9, 2.25),
            new THREE.MeshStandardMaterial({ map: makeSignTexture(text, bg, fg), roughness: 0.8 }),
          );
          sign.position.set(ox, 5.4, oz + d / 2 + 0.15);
          group.add(sign);
        }
      }
    }
  }

  // Garage: a low wide hall with a big door, on its own block.
  const garageMat = new THREE.MeshStandardMaterial({ color: 0x5a6b7d, roughness: 0.85 });
  const garage = box(26, 8, 18, garageMat);
  garage.position.set(garageCentre.x, 4, garageCentre.z);
  group.add(garage);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 5.5),
    new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.6, metalness: 0.4 }),
  );
  door.position.set(garageCentre.x, 2.9, garageCentre.z + 9.1);
  group.add(door);
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('GARAGE', '#2c3440', '#ffd98a'), roughness: 0.8 }),
  );
  garageSign.position.set(garageCentre.x, 7, garageCentre.z + 9.15);
  group.add(garageSign);

  // Safehouse: a small two-storey house with a warm porch light.
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xd8b48a, roughness: 0.9 });
  const house = box(12, 7, 10, houseMat);
  house.position.set(houseCentre.x, 3.5, houseCentre.z);
  group.add(house);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(9.5, 3.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 }),
  );
  roof.position.set(houseCentre.x, 8.7, houseCentre.z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  const porch = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc860, emissiveIntensity: 1.2 }),
  );
  porch.position.set(houseCentre.x, 3.2, houseCentre.z + 5.2);
  group.add(porch);

  // Palms along the boardwalk and the main avenue.
  const palmRng = rng.fork(51);
  for (let z = -250; z <= 250; z += 28) {
    const palm = makePalm(palmRng);
    palm.position.set(CITY.beachX0 - 8, 0, z + palmRng.range(-4, 4));
    group.add(palm);
  }
  for (let z = -240; z <= 240; z += 56) {
    const p1 = makePalm(palmRng);
    p1.position.set(28 - 10, 0, z);
    group.add(p1);
    const p2 = makePalm(palmRng);
    p2.position.set(28 + 10, 0, z + 28);
    group.add(p2);
  }

  // Streetlights at every intersection.
  for (const x of CITY.avenues) {
    for (const z of CITY.streets) {
      const light = makeStreetlight();
      light.position.set(x + 8.5, 0, z + 8.5);
      light.rotation.y = Math.PI;
      group.add(light);
    }
  }

  // Distant hazy skyline to the north and west.
  const skyRng = rng.fork(77);
  const skyMat = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 1 });
  for (let i = 0; i < 26; i += 1) {
    const w = skyRng.range(18, 34);
    const h = skyRng.range(30, 90);
    const d = skyRng.range(18, 34);
    const tower = box(w, h, d, skyMat);
    const side = skyRng.chance(0.5) ? -1 : 1;
    if (skyRng.chance(0.5)) tower.position.set(skyRng.range(-420, 420), h / 2, -380 - skyRng.range(0, 60));
    else tower.position.set(-380 - skyRng.range(0, 60), h / 2, side * skyRng.range(0, 380));
    tower.castShadow = false;
    group.add(tower);
  }

  return {
    group,
    buildings,
    locations: {
      garage: { x: garageCentre.x, z: garageCentre.z + 14, label: 'Garage' },
      safehouse: { x: houseCentre.x, z: houseCentre.z + 10, label: 'Safehouse' },
      park: { x: parkCentre.x, z: parkCentre.z, label: 'Palm Park' },
      plaza: { x: plazaCentre.x, z: plazaCentre.z, label: 'Fountain Plaza' },
      beach: { x: 282, z: 60, label: 'Azura Beach' },
      boardwalk: { x: 246, z: -60, label: 'Boardwalk' },
      marina: { x: 238, z: -238, label: 'Marina' },
      market: { x: 28, z: -112, label: 'Palm Market' },
    },
  };
}

export function nearestRoadPoint(x, z) {
  let bestX = CITY.avenues[0];
  let bestD = Infinity;
  for (const ax of CITY.avenues) {
    const d = Math.abs(ax - x);
    if (d < bestD) {
      bestD = d;
      bestX = ax;
    }
  }
  let bestZ = CITY.streets[0];
  bestD = Infinity;
  for (const sz of CITY.streets) {
    const d = Math.abs(sz - z);
    if (d < bestD) {
      bestD = d;
      bestZ = sz;
    }
  }
  if (Math.abs(bestX - x) < Math.abs(bestZ - z)) return { x: bestX, z };
  return { x, z: bestZ };
}

export function randomRoadPoint(rng) {
  // Returns a point on a road and which way the road runs: alongX is true on
  // a street (east-west) and false on an avenue (north-south).
  if (rng.chance(0.5)) {
    return { x: rng.pick(CITY.avenues), z: rng.range(-250, 250), alongX: false };
  }
  return { x: rng.range(-250, 250), z: rng.pick(CITY.streets), alongX: true };
}

export function isOnRoad(x, z) {
  const half = CITY.roadWidth / 2;
  for (const ax of CITY.avenues) if (Math.abs(ax - x) < half) return true;
  for (const sz of CITY.streets) if (Math.abs(sz - z) < half) return true;
  return false;
}

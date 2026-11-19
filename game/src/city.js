// Azura Bay — the city itself: ground, roads, 49 blocks of buildings,
// beach, boardwalk, ocean, park, plaza fountain, palms, streetlights and
// a hazy skyline. Returns colliders (building AABBs) and landmarks.
window.AZURA = window.AZURA || {};

const AzuraCity = {
  // One shared canvas texture of lit windows, tinted per building by material color.
  makeWindowTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 256);
    const rng = seed * 9301 + 49297;
    let s = rng % 233280;
    const next = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const lit = next() > 0.55;
        g.fillStyle = lit ? '#ffd98a' : '#3a4a5a';
        g.fillRect(8 + col * 20, 10 + row * 20, 12, 12);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  build(scene) {
    const cfg = AZURA.config;
    const U = AZURA.utils;
    const colliders = [];
    const group = new THREE.Group();
    group.name = 'city';
    scene.add(group);

    // Ground: warm asphalt-grey base for the whole city slab.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.halfCity * 2, cfg.halfCity * 2 + 220),
      new THREE.MeshLambertMaterial({ color: 0x8a7f6a }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 40);
    ground.receiveShadow = true;
    group.add(ground);

    // Roads: dark strips along every avenue and street, with pale centre dashes.
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363d });
    const dashMat = new THREE.MeshLambertMaterial({ color: 0xd8d2a0 });
    const span = cfg.halfCity * 2;
    cfg.roadCenters.forEach((c) => {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(cfg.roadWidth, span), roadMat);
      v.rotation.x = -Math.PI / 2;
      v.position.set(c, 0.02, 0);
      v.receiveShadow = true;
      group.add(v);
      const h = new THREE.Mesh(new THREE.PlaneGeometry(span, cfg.roadWidth), roadMat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.02, c);
      h.receiveShadow = true;
      group.add(h);
      for (let d = -cfg.halfCity + 20; d < cfg.halfCity; d += 28) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(c, 0.04, d);
        group.add(dash);
      }
    });

    // Sidewalk blocks: pale slabs between the roads.
    const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8ab8d });
    cfg.blockCenters.forEach((cx) => {
      cfg.blockCenters.forEach((cz) => {
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(cfg.blockSize, cfg.blockSize), walkMat);
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(cx, 0.03, cz);
        slab.receiveShadow = true;
        group.add(slab);
      });
    });

    // Buildings: 1-4 per block, varied heights and warm colours.
    const windowTex = this.makeWindowTexture(7);
    const isSpecial = (x, z) =>
      (x === 0 && z === 0) || // plaza
      (x === cfg.park.x && z === cfg.park.z) || // park
      (x === cfg.garage.x && z === cfg.garage.z) || // garage
      (x === cfg.safehouse.x && z === cfg.safehouse.z); // safehouse
    cfg.blockCenters.forEach((cx) => {
      cfg.blockCenters.forEach((cz) => {
        if (isSpecial(cx, cz)) return;
        const beachfront = cz === 210;
        const count = beachfront ? 2 : U.randInt(1, 3);
        for (let i = 0; i < count; i += 1) {
          const w = U.rand(12, 22);
          const d = U.rand(12, 22);
          const h = beachfront ? U.rand(24, 44) : U.rand(8, 30);
          const ox = U.rand(-14, 14);
          const oz = U.rand(-14, 14);
          const color = U.pick(cfg.buildingColors);
          const mat = new THREE.MeshLambertMaterial({ color, map: windowTex });
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          b.position.set(cx + ox, h / 2, cz + oz);
          b.castShadow = true;
          b.receiveShadow = true;
          group.add(b);
          colliders.push({
            minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
            minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
          });
          // Flat roof cap.
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6),
            new THREE.MeshLambertMaterial({ color: 0x6b5d4f }),
          );
          roof.position.set(cx + ox, h + 0.3, cz + oz);
          group.add(roof);
        }
      });
    });

    // Central plaza: fountain with animated water disc.
    const plazaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 16, 0.8, 24),
      new THREE.MeshLambertMaterial({ color: 0xcfc4a8 }),
    );
    plazaBase.position.set(0, 0.4, 0);
    plazaBase.receiveShadow = true;
    group.add(plazaBase);
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 1.6, 20),
      new THREE.MeshLambertMaterial({ color: 0x9fb8c8 }),
    );
    fountain.position.set(0, 0.8, 0);
    fountain.castShadow = true;
    group.add(fountain);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.4, 0.3, 20),
      new THREE.MeshLambertMaterial({ color: 0x4fb3d9, transparent: true, opacity: 0.85 }),
    );
    water.position.set(0, 1.7, 0);
    water.name = 'fountainWater';
    group.add(water);
    colliders.push({ minX: -6, maxX: 6, minZ: -6, maxZ: 6 });

    // Park: green lawn, pond, palms.
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.blockSize, cfg.blockSize),
      new THREE.MeshLambertMaterial({ color: 0x5d9b4a }),
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cfg.park.x, 0.04, cfg.park.z);
    lawn.receiveShadow = true;
    group.add(lawn);
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(9, 20),
      new THREE.MeshLambertMaterial({ color: 0x3f8fb5 }),
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(cfg.park.x + 8, 0.06, cfg.park.z - 6);
    group.add(pond);

    // Garage building.
    const garage = new THREE.Mesh(
      new THREE.BoxGeometry(24, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x7a6a8a }),
    );
    garage.position.set(cfg.garage.x, 4, cfg.garage.z);
    garage.castShadow = true;
    garage.receiveShadow = true;
    group.add(garage);
    colliders.push({
      minX: cfg.garage.x - 12, maxX: cfg.garage.x + 12,
      minZ: cfg.garage.z - 8, maxZ: cfg.garage.z + 8,
    });
    const garageSign = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0x664411 }),
    );
    garageSign.position.set(cfg.garage.x, 7, cfg.garage.z - 8.3);
    group.add(garageSign);

    // Safehouse: small warm house with a porch.
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(12, 6, 10),
      new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }),
    );
    house.position.set(cfg.safehouse.x, 3, cfg.safehouse.z);
    house.castShadow = true;
    group.add(house);
    const roofH = new THREE.Mesh(
      new THREE.ConeGeometry(9, 4, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a4a3a }),
    );
    roofH.position.set(cfg.safehouse.x, 8, cfg.safehouse.z);
    roofH.rotation.y = Math.PI / 4;
    group.add(roofH);
    colliders.push({
      minX: cfg.safehouse.x - 6, maxX: cfg.safehouse.x + 6,
      minZ: cfg.safehouse.z - 5, maxZ: cfg.safehouse.z + 5,
    });

    // Shops: small storefronts with bright awnings.
    cfg.shops.forEach((shop) => {
      const store = new THREE.Mesh(
        new THREE.BoxGeometry(14, 6, 10),
        new THREE.MeshLambertMaterial({ color: 0xdfe8ec }),
      );
      store.position.set(shop.x, 3, shop.z);
      store.castShadow = true;
      group.add(store);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.5, 4),
        new THREE.MeshLambertMaterial({ color: 0xe74c3c }),
      );
      awning.position.set(shop.x, 5.2, shop.z - 6);
      group.add(awning);
      colliders.push({
        minX: shop.x - 7, maxX: shop.x + 7,
        minZ: shop.z - 5, maxZ: shop.z + 5,
      });
    });

    // Palms along the avenues and the beach.
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
    const palmSpots = [];
    cfg.roadCenters.forEach((c) => {
      [-196, -126, -56, 14, 84, 154, 224].forEach((d) => {
        palmSpots.push([c + 9, d]);
        palmSpots.push([c - 9, d]);
      });
    });
    palmSpots.forEach(([x, z]) => {
      if (z > 232) return;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
      trunk.position.set(x, 3.5, z);
      trunk.castShadow = true;
      group.add(trunk);
      for (let i = 0; i < 5; i += 1) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 4), leafMat);
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(x + Math.cos(a) * 1.2, 7.4, z + Math.sin(a) * 1.2);
        leaf.rotation.z = Math.cos(a) * 0.9;
        leaf.rotation.x = -Math.sin(a) * 0.9;
        group.add(leaf);
      }
    });

    // Streetlights along the avenues.
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
    const lampMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x776633 });
    cfg.roadCenters.forEach((c) => {
      [-175, -105, -35, 35, 105, 175].forEach((d) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 8, 6), poleMat);
        pole.position.set(c + 8, 4, d);
        group.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat);
        lamp.position.set(c + 8, 8.2, d);
        group.add(lamp);
      });
    });

    // Boardwalk, sand and ocean to the south.
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.halfCity * 2, 12),
      new THREE.MeshLambertMaterial({ color: 0xa9835f }),
    );
    board.rotation.x = -Math.PI / 2;
    board.position.set(0, 0.05, cfg.boardwalkZ);
    board.receiveShadow = true;
    group.add(board);
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.halfCity * 2, cfg.oceanStartZ - cfg.sandStartZ),
      new THREE.MeshLambertMaterial({ color: 0xe8d5a0 }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.04, (cfg.sandStartZ + cfg.oceanStartZ) / 2);
    sand.receiveShadow = true;
    group.add(sand);
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 320),
      new THREE.MeshLambertMaterial({ color: 0x2a7fa8, transparent: true, opacity: 0.95 }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.4, cfg.oceanStartZ + 160);
    ocean.name = 'ocean';
    group.add(ocean);

    // Hazy skyline silhouette to the north.
    const skyMat = new THREE.MeshLambertMaterial({ color: 0xd8a077, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 14; i += 1) {
      const w = U.rand(18, 34);
      const h = U.rand(30, 80);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), skyMat);
      tower.position.set(-260 + i * 40 + U.rand(-6, 6), h / 2 - 2, -268);
      group.add(tower);
    }

    return { colliders, group };
  },
};

AZURA.city = AzuraCity;

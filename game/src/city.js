// Sunvale Heat — procedural Sunvale City (fresh code, round 2).
// 9x9 street grid, downtown towers, plaza with fountain, two parks,
// beach + boardwalk + sea to the south. All textures are canvas-drawn;
// no external assets. Buildings register AABB colliders in SV.colliders.
var City = {
  bounds: 250,
  beachZ: 208,
  waterZ: 252,

  build: function (scene) {
    SV.scene = scene;
    scene.background = new THREE.Color(0x87bfe8);
    scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);
    var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 1.15);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
    sun.position.set(120, 180, 60);
    scene.add(sun);
    SV.sunLight = sun;

    this.ground(scene);
    this.roads(scene);
    this.blocks(scene);
    this.plaza(scene);
    this.parks(scene);
    this.beach(scene);
    this.props(scene);
  },

  ground: function (scene) {
    var g = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 560),
      new THREE.MeshLambertMaterial({ color: 0x5d8a4a })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.set(0, -0.05, 20);
    scene.add(g);
    // Sand strip along the south edge.
    var sand = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 52),
      new THREE.MeshLambertMaterial({ color: 0xe8d49a })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.02, this.beachZ + 20);
    scene.add(sand);
    // Sea.
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 120),
      new THREE.MeshLambertMaterial({ color: 0x2e7fb8, transparent: true, opacity: 0.92 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.05, this.waterZ + 48);
    scene.add(sea);
    SV.sea = sea;
  },

  roads: function (scene) {
    // Asphalt strips on every street line, with dashed centre lines.
    var roadTex = canvasTex(128, 128, function (c, w, h) {
      c.fillStyle = "#3a3d42"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#f5d76e"; c.fillRect(w / 2 - 3, 0, 6, 26);
      c.fillStyle = "#f5d76e"; c.fillRect(w / 2 - 3, 64, 6, 26);
      c.fillStyle = "#c8cdd4";
      c.fillRect(4, 0, 3, h); c.fillRect(w - 7, 0, 3, h);
    });
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    var mat = new THREE.MeshLambertMaterial({ map: roadTex });
    var L = GRID * 8 + 24; // street length
    for (var k = -4; k <= 4; k++) {
      var c = k * GRID;
      var rx = new THREE.Mesh(new THREE.PlaneGeometry(L, 12), mat.clone());
      rx.material.map = roadTex.clone();
      rx.material.map.repeat.set(L / 14, 1);
      rx.material.map.needsUpdate = true;
      rx.rotation.x = -Math.PI / 2;
      rx.position.set(0, 0.03, c);
      scene.add(rx);
      var rz = new THREE.Mesh(new THREE.PlaneGeometry(12, L), mat.clone());
      rz.material.map = roadTex.clone();
      rz.material.map.repeat.set(1, L / 14);
      rz.material.map.needsUpdate = true;
      rz.rotation.x = -Math.PI / 2;
      rz.position.set(c, 0.03, 0);
      scene.add(rz);
    }
    // Sidewalk slabs: one per city block (blocks sit BETWEEN the streets,
    // centred at half-grid offsets, so the roads stay clear for driving).
    var walkMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a3 });
    for (var i = -4; i <= 3; i++) for (var j = -4; j <= 3; j++) {
      var s = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), walkMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(i * GRID + 26, 0.02, j * GRID + 26);
      scene.add(s);
    }
  },

  // One canvas texture reused for all lit windows.
  windowTex: function () {
    if (this._winTex) return this._winTex;
    this._winTex = canvasTex(128, 256, function (c, w, h) {
      c.fillStyle = "#2b2f36"; c.fillRect(0, 0, w, h);
      for (var y = 8; y < h - 10; y += 18) for (var x = 8; x < w - 10; x += 16) {
        var lit = Math.random() < 0.55;
        c.fillStyle = lit ? (Math.random() < 0.7 ? "#ffd98a" : "#bfe3ff") : "#14181d";
        c.fillRect(x, y, 10, 12);
      }
    });
    return this._winTex;
  },

  addBuilding: function (scene, cx, cz, w, d, h, color) {
    var tex = this.windowTex();
    var mat = new THREE.MeshLambertMaterial({ color: color, map: tex });
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(cx, h / 2, cz);
    scene.add(b);
    // Roof slab + rooftop box.
    var roof = boxMesh(w + 1, 1.2, d + 1, 0x4a4d52, cx, h + 0.6, cz);
    scene.add(roof);
    if (h > 34 && Math.random() < 0.6) {
      var ac = boxMesh(4, 3, 4, 0x6a6e73, cx + rand(-w / 4, w / 4), h + 2.4, cz + rand(-d / 4, d / 4));
      scene.add(ac);
    }
    SV.colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
  },

  blocks: function (scene) {
    var palette = [0xcf9a6a, 0xb8c4cc, 0xd8b48a, 0x9fb4c4, 0xc4a484, 0xa8b8a0, 0xd0c0a8];
    for (var i = -4; i <= 3; i++) for (var j = -4; j <= 3; j++) {
      var cx = i * GRID + 26, cz = j * GRID + 26;
      if (cx === 26 && cz === 26) continue; // plaza block
      if ((cx === 182 && cz === -130) || (cx === -130 && cz === 182)) continue; // parks
      var downtown = Math.abs(cx) <= 78 && Math.abs(cz) <= 78;
      var n = downtown ? randi(1, 2) : randi(2, 4);
      for (var k = 0; k < n; k++) {
        var ox = rand(-9, 9), oz = rand(-9, 9);
        var w = rand(11, 18), d = rand(11, 18);
        var h = downtown ? rand(34, 78) : rand(9, 26);
        this.addBuilding(scene, cx + ox, cz + oz, w, d, h, pick(palette));
      }
    }
  },

  plaza: function (scene) {
    var cx = 26, cz = 26; // plaza block, just north-east of the city centre
    SV.plazaPos = { x: cx, z: cz };
    var p = new THREE.Mesh(
      new THREE.CircleGeometry(19, 28),
      new THREE.MeshLambertMaterial({ color: 0xcbb98a })
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(cx, 0.06, cz);
    scene.add(p);
    var basin = cylMesh(6, 7, 1.4, 0x8fa8b8, cx, 0.7, cz);
    scene.add(basin);
    var jet = cylMesh(0.5, 1.6, 4.5, 0x9fd4ff, cx, 3.2, cz);
    scene.add(jet);
    var top = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x7fc4f0, transparent: true, opacity: 0.85 })
    );
    top.position.set(cx, 5.6, cz);
    scene.add(top);
    SV.fountainTop = top;
    // Flag poles around the plaza.
    for (var a = 0; a < 4; a++) {
      var ang = a * Math.PI / 2 + Math.PI / 4;
      var px = cx + Math.cos(ang) * 15, pz = cz + Math.sin(ang) * 15;
      var pole = cylMesh(0.18, 0.18, 9, 0xd8d8d8, px, 4.5, pz, 6);
      scene.add(pole);
      var flag = boxMesh(2.6, 1.6, 0.1, [0xff5a4e, 0x2e9e6b, 0x3a7bd5, 0xffc93c][a], px + 1.3, 8, pz);
      scene.add(flag);
    }
  },

  parks: function (scene) {
    var spots = [[182, -130], [-130, 182]];
    for (var s = 0; s < spots.length; s++) {
      var cx = spots[s][0], cz = spots[s][1];
      var lawn = new THREE.Mesh(
        new THREE.CircleGeometry(18, 24),
        new THREE.MeshLambertMaterial({ color: 0x4f8a3d })
      );
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(cx, 0.05, cz);
      scene.add(lawn);
      for (var t = 0; t < 7; t++) {
        var tx = cx + rand(-14, 14), tz = cz + rand(-14, 14);
        var trunk = cylMesh(0.5, 0.7, 3.5, 0x6b4a2a, tx, 1.75, tz, 7);
        scene.add(trunk);
        var crown = new THREE.Mesh(
          new THREE.ConeGeometry(rand(2.6, 3.8), rand(5, 7.5), 8),
          new THREE.MeshLambertMaterial({ color: 0x2f6b2a })
        );
        crown.position.set(tx, 6, tz);
        scene.add(crown);
      }
      var bench = boxMesh(4, 0.5, 1.4, 0x7a5230, cx + 6, 0.9, cz - 4);
      scene.add(bench);
    }
  },

  beach: function (scene) {
    // Boardwalk planks along the sand.
    var walk = boxMesh(440, 0.8, 8, 0x8a6b42, 0, 0.4, this.beachZ + 2);
    scene.add(walk);
    for (var x = -200; x <= 200; x += 26) {
      var palm = this.palm(x + rand(-4, 4), this.beachZ + 12 + rand(-2, 6));
      scene.add(palm);
    }
    // Lifeguard tower.
    var tower = boxMesh(4, 6, 4, 0xffffff, -60, 3, this.beachZ + 10);
    scene.add(tower);
    var roof = boxMesh(5.5, 0.6, 5.5, 0xff5a4e, -60, 6.4, this.beachZ + 10);
    scene.add(roof);
    // Umbrellas + towels.
    for (var u = 0; u < 6; u++) {
      var ux = -160 + u * 62 + rand(-8, 8);
      var pole = cylMesh(0.12, 0.12, 3, 0xd8d8d8, ux, 1.5, this.beachZ + 16, 6);
      scene.add(pole);
      var umb = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 1.4, 10),
        new THREE.MeshLambertMaterial({ color: [0xff5a4e, 0x2e9e6b, 0xffc93c][u % 3] })
      );
      umb.position.set(ux, 3.4, this.beachZ + 16);
      scene.add(umb);
    }
  },

  palm: function (x, z) {
    var g = new THREE.Group();
    var trunk = cylMesh(0.35, 0.55, 7, 0x7a5a34, 0, 3.5, 0, 7);
    trunk.rotation.z = 0.12;
    g.add(trunk);
    for (var i = 0; i < 5; i++) {
      var leaf = boxMesh(4.2, 0.25, 1.1, 0x2f8a3d, 0, 7, 0);
      leaf.rotation.y = (i / 5) * TAU;
      leaf.position.x = Math.cos((i / 5) * TAU) * 1.8;
      leaf.position.z = Math.sin((i / 5) * TAU) * 1.8;
      leaf.rotation.z = 0.35;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    return g;
  },

  props: function (scene) {
    // Street lamps at intersections.
    for (var i = -4; i <= 4; i++) for (var j = -4; j <= 4; j++) {
      if ((i + j) % 2 !== 0) continue;
      var x = i * GRID + 8, z = j * GRID + 8;
      var pole = cylMesh(0.14, 0.2, 6.5, 0x3a3d42, x, 3.25, z, 6);
      scene.add(pole);
      var bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xaa8833 })
      );
      bulb.position.set(x, 6.6, z);
      scene.add(bulb);
    }
    // Warehouse (mission 4) on the east side + bank (mission 5) downtown.
    // Both sit on their own blocks; the front aprons face the nearest road.
    var whX = 182, whZ = -78;
    var wh = boxMesh(26, 9, 18, 0x8a7f6a, whX, 4.5, whZ);
    scene.add(wh);
    var whRoof = boxMesh(27, 1, 19, 0x5a5248, whX, 9.5, whZ);
    scene.add(whRoof);
    SV.colliders.push({ x0: whX - 13, z0: whZ - 9, x1: whX + 13, z1: whZ + 9 });
    SV.warehousePos = { x: whX, z: whZ };
    SV.warehouseFront = { x: whX, z: whZ + 16 };
    var bkX = -26, bkZ = -26;
    var bank = boxMesh(22, 16, 16, 0xd8cfc0, bkX, 8, bkZ);
    scene.add(bank);
    var bankTop = boxMesh(23, 1.4, 17, 0x6a5a3a, bkX, 16.7, bkZ);
    scene.add(bankTop);
    SV.colliders.push({ x0: bkX - 11, z0: bkZ - 8, x1: bkX + 11, z1: bkZ + 8 });
    SV.bankPos = { x: bkX, z: bkZ + 14 };
    SV.hideoutPos = { x: -130, z: -130 };
  }
};

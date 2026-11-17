// city.js — procedural Sunvale City: street grid, towers, palms, beach, landmarks.
// All geometry is generated at runtime; nothing is loaded from the network.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var U = SV.util;

  var BLOCK = 52;          // pitch of one city block
  var ROAD = 14;           // road width
  var HALF = 4;            // blocks from -HALF..HALF each way
  var WORLD = (HALF + 0.5) * BLOCK + ROAD; // ~250 half-extent
  var BEACH_Z = 252;       // sand starts here (south edge)

  var colliders = [];      // {minX,maxX,minZ,maxZ} building footprints for collision
  var landmarks = {};      // named places missions use
  var roadLines = [];      // road centre lines (x or z) for traffic waypoints

  function signTexture(text, bg, fg) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.fillStyle = fg; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 68);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addCollider(x, z, w, d) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  // Push a circle (player/car) out of every building AABB it overlaps.
  function collideCircle(x, z, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
        var dxl = x - (c.minX - r), dxr = (c.maxX + r) - x;
        var dzl = z - (c.minZ - r), dzr = (c.maxZ + r) - z;
        var m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) x = c.minX - r;
        else if (m === dxr) x = c.maxX + r;
        else if (m === dzl) z = c.minZ - r;
        else z = c.maxZ + r;
      }
    }
    return { x: x, z: z };
  }
  function hitsBuilding(x, z, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
    }
    return false;
  }
  function clampToWorld(x, z) {
    return { x: U.clamp(x, -WORLD, WORLD), z: U.clamp(z, -WORLD, BEACH_Z + 40) };
  }
  function randomRoadPoint() {
    var line = U.pick(roadLines);
    var t = U.rand(-WORLD + 20, WORLD - 20);
    return line.axis === 'x' ? { x: t, z: line.at } : { x: line.at, z: t };
  }
  function randomSidewalkPoint() {
    // a point inside a city block, at least 14m from every road centreline,
    // so palms, lamps and strolling pedestrians never stand on a road
    var bx = U.randInt(-HALF, HALF), bz = U.randInt(-HALF, HALF);
    return {
      x: bx * BLOCK + BLOCK / 2 + U.rand(-12, 12),
      z: bz * BLOCK + BLOCK / 2 + U.rand(-12, 12)
    };
  }

  function buildCity(scene) {
    var palette = ['#e8b48a', '#d9a06f', '#c98f7a', '#f2d5a0', '#a8c4d4', '#d4b8a8', '#e0c090', '#b8a8c8', '#9fb8a0', '#e8c8c8'];
    var glowTex = U.glowTexture();

    // --- lights & sky -------------------------------------------------------
    scene.background = new THREE.Color(0x87bfe8);
    scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);
    var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 0.85);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffe0b0, 1.6);
    sun.position.set(120, 180, 60);
    scene.add(sun);
    // visible sun disc + warm haze sprite
    var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdf8a, transparent: true, opacity: 0.95, depthWrite: false }));
    sunSprite.position.set(300, 160, -320);
    sunSprite.scale.set(90, 90, 1);
    scene.add(sunSprite);

    // --- ground, roads, sidewalks ------------------------------------------
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD * 2 + 200, WORLD * 2 + 260),
      new THREE.MeshLambertMaterial({ color: 0x6a8a5a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 40);
    scene.add(ground);

    var roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3138 });
    var walkMat = new THREE.MeshLambertMaterial({ color: 0x9a938a });
    var lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
    for (var i = -HALF - 1; i <= HALF + 1; i++) {
      var at = i * BLOCK;
      roadLines.push({ axis: 'x', at: at });
      roadLines.push({ axis: 'z', at: at });
      var roadX = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 40, ROAD), roadMat);
      roadX.rotation.x = -Math.PI / 2; roadX.position.set(0, 0, at); scene.add(roadX);
      var roadZ = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, WORLD * 2 + 40), roadMat);
      roadZ.rotation.x = -Math.PI / 2; roadZ.position.set(at, 0, 0); scene.add(roadZ);
      // centre dashes
      for (var d = -WORLD; d < WORLD; d += 16) {
        var dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.7), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.02, at); scene.add(dash);
        var dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), lineMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(at, 0.02, d); scene.add(dash2);
      }
      // sidewalks are placed per-block below; this loop only draws roads
    }

    // --- beach & ocean (south edge) -----------------------------------------
    var sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 200, 70), new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, BEACH_Z + 35); scene.add(sand);
    var ocean = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 400, 220), new THREE.MeshLambertMaterial({ color: 0x1e6fa8 }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -0.1, BEACH_Z + 140); scene.add(ocean);
    // boardwalk strip
    var board = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 40, 8), new THREE.MeshLambertMaterial({ color: 0xa8825a }));
    board.rotation.x = -Math.PI / 2; board.position.set(0, 0.03, BEACH_Z - 4); scene.add(board);

    // --- buildings -----------------------------------------------------------
    var boxGeo = new THREE.BoxGeometry(1, 1, 1);
    var roofGeo = new THREE.BoxGeometry(1, 1, 1);
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4038 });
    var towerCount = 0;
    var landmarkBlocks = { '-78,26': 1, '78,-78': 1, '182,182': 1, '-130,-78': 1 };
    for (var bx = -HALF; bx <= HALF; bx++) {
      for (var bz = -HALF; bz <= HALF; bz++) {
        var cx = bx * BLOCK + BLOCK / 2;
        var cz = bz * BLOCK + BLOCK / 2;
        // landmark blocks keep only their landmark (no random towers crowding it)
        if (landmarkBlocks[cx + ',' + cz]) {
          var plate0 = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - ROAD + 4, BLOCK - ROAD + 4), walkMat);
          plate0.rotation.x = -Math.PI / 2; plate0.position.set(cx, 0.01, cz); scene.add(plate0);
          continue;
        }
        // skip the central plaza + a few random parks
        var isPlaza = (bx === 0 && bz === 0);
        var isPark = !isPlaza && Math.random() < 0.12;
        if (isPlaza) { buildPlaza(scene, cx, cz); continue; }
        if (isPark) { buildPark(scene, cx, cz); continue; }
        var n = U.randInt(1, 2);
        for (var k = 0; k < n; k++) {
          var w = U.rand(16, 26), d = U.rand(16, 26);
          var h = U.rand(14, 62);
          if (Math.abs(cx) < 60 && Math.abs(cz) < 60) h = U.rand(30, 85); // downtown towers
          var ox = U.pick([-9, 9]) * (n === 2 ? 1 : 0) + U.rand(-3, 3);
          var oz = U.pick([-9, 9]) * (n === 2 ? 1 : 0) + U.rand(-3, 3);
          if (n === 2 && k === 1) { ox = -ox; oz = -oz; }
          var px = cx + ox, pz = cz + oz;
          if (Math.abs(px) > WORLD - 12 || Math.abs(pz) > WORLD - 12) continue;
          var color = U.pick(palette);
          var mat = new THREE.MeshLambertMaterial({ map: U.buildingTexture(color, 0.35) });
          var b = new THREE.Mesh(boxGeo, mat);
          b.scale.set(w, h, d);
          b.position.set(px, h / 2, pz);
          scene.add(b);
          var roof = new THREE.Mesh(roofGeo, roofMat);
          roof.scale.set(w + 1, 1.2, d + 1);
          roof.position.set(px, h + 0.6, pz);
          scene.add(roof);
          addCollider(px, pz, w, d);
          towerCount++;
          // rooftop AC box on tall towers
          if (h > 45) {
            var ac = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
            ac.scale.set(4, 3, 4); ac.position.set(px + w / 4, h + 2.5, pz); scene.add(ac);
          }
        }
        // sidewalk plate for the block
        var plate = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - ROAD + 4, BLOCK - ROAD + 4), walkMat);
        plate.rotation.x = -Math.PI / 2; plate.position.set(cx, 0.01, cz); scene.add(plate);
      }
    }

    // --- landmarks (named, signed, mission-critical) -------------------------
    landmarks.garage = makeLandmark(scene, 'MARA\'S GARAGE', '#ff7a2e', '#1a1206', -78, 26, 30, 20, 10);
    landmarks.bank = makeLandmark(scene, 'SUNVALE BANK', '#2e6fb0', '#ffffff', 78, -78, 26, 22, 16);
    landmarks.warehouse = makeLandmark(scene, 'DOCK 9 WAREHOUSE', '#5a7a5a', '#ffffff', 182, 182, 34, 20, 12);
    landmarks.hospital = makeLandmark(scene, 'SUNVALE GENERAL', '#e8e8e8', '#c22e2e', -130, -78, 26, 22, 14);
    landmarks.pier = { x: 0, z: BEACH_Z + 10 };

    // --- palms, lamps, traffic lights ---------------------------------------
    var trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 7, 6);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
    var leafGeo = new THREE.ConeGeometry(3.2, 4.5, 6);
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8a3e });
    var lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
    var lampMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    var bulbGeo = new THREE.SphereGeometry(0.5, 8, 8);
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (var p = 0; p < 90; p++) {
      var pos = randomSidewalkPoint();
      if (hitsBuilding(pos.x, pos.z, 3)) continue;
      if (Math.random() < 0.55) {
        var trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(pos.x, 3.5, pos.z); scene.add(trunk);
        var leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(pos.x, 8.5, pos.z); scene.add(leaf);
      } else {
        var pole = new THREE.Mesh(lampGeo, lampMat);
        pole.position.set(pos.x, 3, pos.z); scene.add(pole);
        var bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(pos.x, 6.2, pos.z); scene.add(bulb);
      }
    }
    // beach palms row
    for (var bp = -WORLD; bp < WORLD; bp += 26) {
      var trunk2 = new THREE.Mesh(trunkGeo, trunkMat);
      trunk2.position.set(bp, 3.5, BEACH_Z - 12); scene.add(trunk2);
      var leaf2 = new THREE.Mesh(leafGeo, leafMat);
      leaf2.position.set(bp, 8.5, BEACH_Z - 12); scene.add(leaf2);
    }

    SV.city = {
      colliders: colliders, landmarks: landmarks, roadLines: roadLines,
      worldHalf: WORLD, beachZ: BEACH_Z, towerCount: towerCount,
      collideCircle: collideCircle, hitsBuilding: hitsBuilding, clampToWorld: clampToWorld,
      randomRoadPoint: randomRoadPoint, randomSidewalkPoint: randomSidewalkPoint
    };
  }

  function buildPlaza(scene, cx, cz) {
    var mat = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
    var plate = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - 4, BLOCK - 4), mat);
    plate.rotation.x = -Math.PI / 2; plate.position.set(cx, 0.02, cz); scene.add(plate);
    var fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.6, 20), new THREE.MeshLambertMaterial({ color: 0x8a97a8 }));
    fountain.position.set(cx, 0.8, cz); scene.add(fountain);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.4, 20), new THREE.MeshLambertMaterial({ color: 0x3a9ad8 }));
    water.position.set(cx, 1.5, cz); scene.add(water);
    var obelisk = new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), new THREE.MeshLambertMaterial({ color: 0xd8c8a0 }));
    obelisk.position.set(cx, 11, cz); scene.add(obelisk);
    addCollider(cx, cz, 3.5, 3.5);
  }

  function buildPark(scene, cx, cz) {
    var mat = new THREE.MeshLambertMaterial({ color: 0x4a8a4a });
    var plate = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - 8, BLOCK - 8), mat);
    plate.rotation.x = -Math.PI / 2; plate.position.set(cx, 0.02, cz); scene.add(plate);
    var trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 7, 6);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
    var leafGeo = new THREE.ConeGeometry(3.2, 4.5, 6);
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8a3e });
    for (var i = 0; i < 5; i++) {
      var px = cx + U.rand(-14, 14), pz = cz + U.rand(-14, 14);
      var t = new THREE.Mesh(trunkGeo, trunkMat); t.position.set(px, 3.5, pz); scene.add(t);
      var l = new THREE.Mesh(leafGeo, leafMat); l.position.set(px, 8.5, pz); scene.add(l);
    }
  }

  function makeLandmark(scene, name, color, fg, x, z, w, d, h) {
    var mat = new THREE.MeshLambertMaterial({ map: U.buildingTexture(color, 0.5) });
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    scene.add(b);
    var sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(w, 30), 6),
      new THREE.MeshBasicMaterial({ map: signTexture(name, color, fg) })
    );
    sign.position.set(x, h + 3.5, z + d / 2 + 0.2);
    scene.add(sign);
    var sign2 = sign.clone();
    sign2.rotation.y = Math.PI;
    sign2.position.set(x, h + 3.5, z - d / 2 - 0.2);
    scene.add(sign2);
    addCollider(x, z, w, d);
    return { x: x, z: z, name: name };
  }

  SV.cityBuild = buildCity;
})();

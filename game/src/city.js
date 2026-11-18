// city.js — procedural Sunvale: sun-soaked coastal city. One job: build the world
// (roads, buildings, beach, parks, plaza, lamps, palms, traffic lights, sky, sea)
// and answer collision + layout queries for the rest of the game.
const THREE = window.THREE;
export const BLOCK = 40, STREET = 12, PITCH = 52, HALF = 240;

function facadeTexture(base, lit) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 10);
  for (let y = 18; y < 246; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const isLit = Math.random() < lit;
      g.fillStyle = isLit ? '#ffd98a' : 'rgba(20,30,50,0.85)';
      g.fillRect(x, y, 12, 14);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textSignTexture(text, sub, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg; g.font = 'bold 64px Arial'; g.textAlign = 'center';
  g.fillText(text, 256, 62);
  g.font = 'bold 30px Arial'; g.fillText(sub, 256, 104);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene) {
  const buildings = []; // {minX,maxX,minZ,maxZ,h}
  const landmarks = {};
  const group = new THREE.Group();
  scene.add(group);

  // --- lights, sky, fog ---
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0xffd9a0, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe7b0, 1.7);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.far = 500;
  scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xffd9a8, 260, 900);

  // sky dome (gradient) + sun disc + clouds
  const skyGeo = new THREE.SphereGeometry(880, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.25,0.55,0.95); vec3 mid = vec3(0.65,0.82,1.0); vec3 low = vec3(1.0,0.78,0.5); vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25,0.8,h)) : mix(low, mid, smoothstep(-0.05,0.25,h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
  sunDisc.position.set(420, 320, -500); sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
    cl.scale.set(26 + Math.random() * 22, 5 + Math.random() * 3, 12 + Math.random() * 8);
    cl.position.set(-500 + Math.random() * 1000, 130 + Math.random() * 60, -420 + Math.random() * 700);
    scene.add(cl); clouds.push(cl);
  }

  // --- ground: concrete base, asphalt streets, sand + sea to the south ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 60);
  ground.receiveShadow = true;
  scene.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33343a });
  const streetCenters = [];
  for (let i = 0; i < 10; i++) streetCenters.push(-HALF + STREET / 2 + i * PITCH);
  for (const c of streetCenters) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(STREET, HALF * 2), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0); v.receiveShadow = true; group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, STREET), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c); h.receiveShadow = true; group.add(h);
  }
  // dashed center lines on the two main avenues
  const dashTex = (() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#33343a'; g.fillRect(0, 0, 8, 64);
    g.fillStyle = '#f7c948'; g.fillRect(3, 6, 2, 28);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 60);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  for (const c of [-26, 26]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.2, HALF * 2),
      new THREE.MeshLambertMaterial({ map: dashTex }));
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0.02, 0); group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 1.2),
      new THREE.MeshLambertMaterial({ map: dashTex }));
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.02, c); group.add(h);
  }
  // beach sand + boardwalk + sea (south edge, z > HALF)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 90),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.0, HALF + 45); sand.receiveShadow = true;
  scene.add(sand);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(480, 10),
    new THREE.MeshLambertMaterial({ color: 0x9a6b4a }));
  board.rotation.x = -Math.PI / 2; board.position.set(0, 0.05, HALF + 4); board.receiveShadow = true;
  scene.add(board);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 320),
    new THREE.MeshPhongMaterial({ color: 0x1e7fb8, transparent: true, opacity: 0.92, shininess: 120 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, HALF + 90 + 160);
  scene.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(560, 3),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.1, HALF + 88);
  scene.add(foam);

  // --- buildings ---
  const texA = facadeTexture('#8a7f72', 0.25); // residential
  const texB = facadeTexture('#5f7488', 0.35); // office
  const texC = facadeTexture('#3d4c63', 0.45); // tower glass
  const matA = new THREE.MeshLambertMaterial({ map: texA });
  const matB = new THREE.MeshLambertMaterial({ map: texB });
  const matC = new THREE.MeshLambertMaterial({ map: texC });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4440 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  function addBuilding(cx, cz, w, d, h, mat) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(w, h, d);
    m.position.set(cx, h / 2, cz);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    const roof = new THREE.Mesh(boxGeo, roofMat);
    roof.scale.set(w * 0.3, 1.2, d * 0.3);
    roof.position.set(cx + w * 0.15, h + 0.6, cz);
    group.add(roof);
    buildings.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
    return m;
  }
  const isDowntown = (i, j) => Math.abs(i - 4) <= 1 && Math.abs(j - 4) <= 1;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cx = -208 + i * PITCH, cz = -208 + j * PITCH;
      if (i === 4 && j === 4) continue; // plaza
      if ((i === 1 && j === 1) || (i === 7 && j === 6)) continue; // parks
      if (isDowntown(i, j)) {
        const h = 38 + Math.random() * 52;
        addBuilding(cx, cz, 26 + Math.random() * 8, 26 + Math.random() * 8, h, texC);
      } else {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) {
          const ox = (k % 2 === 0 ? -9 : 9), oz = (k < 2 ? -9 : 9);
          const h = 8 + Math.random() * (isDowntown(i, j) ? 20 : 12);
          addBuilding(cx + ox, cz + oz, 15 + Math.random() * 5, 15 + Math.random() * 5, h, Math.random() < 0.5 ? matA : matB);
        }
      }
    }
  }

  // --- plaza (fountain) + parks (grass + palms) ---
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 24),
    new THREE.MeshLambertMaterial({ color: 0xcfc8bd }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.03, 0); group.add(plaza);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 1.2, 20),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
  basin.position.set(0, 0.6, 0); basin.castShadow = true; group.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.4, 20),
    new THREE.MeshPhongMaterial({ color: 0x3fa8d8, shininess: 140 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 1.25, 0); group.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.4, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c8 }));
  jet.position.set(0, 2.4, 0); group.add(jet);

  function makePark(cx, cz) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK, BLOCK),
      new THREE.MeshLambertMaterial({ color: 0x5da24a }));
    g.rotation.x = -Math.PI / 2; g.position.set(cx, 0.04, cz); g.receiveShadow = true;
    group.add(g);
    for (let k = 0; k < 6; k++) addPalm(cx + (Math.random() - 0.5) * 28, cz + (Math.random() - 0.5) * 28);
  }
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
    trunk.position.set(x, 2.5, z); trunk.castShadow = true; group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 7),
      new THREE.MeshLambertMaterial({ color: 0x2e8b3a }));
    crown.position.set(x, 6, z); crown.castShadow = true; group.add(crown);
  }
  makePark(-208 + 1 * PITCH, -208 + 1 * PITCH);
  makePark(-208 + 7 * PITCH, -208 + 6 * PITCH);
  for (let k = 0; k < 14; k++) addPalm(-220 + k * 34, HALF + 12);

  // --- signs ---
  function addSign(text, sub, x, y, z, ry, w = 26) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshLambertMaterial({ map: textSignTexture(text, sub, '#123a5c', '#ffd94a'), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
  }
  addSign('SUNVALE', 'BEACH  •  BOARDWALK', 0, 9, HALF + 2, 0);
  addSign("MARA'S GARAGE", '24H  •  NO QUESTIONS', -208 + 5 * PITCH, 6, -208 + 5 * PITCH + 22, Math.PI, 20);

  // --- street lamps (instanced) ---
  const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 6);
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const lampHeadGeo = new THREE.BoxGeometry(0.9, 0.25, 0.35);
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffdf80, emissiveIntensity: 0.7 });
  const lampSpots = [];
  for (const c of [-26, 26]) for (let s = -220; s <= 220; s += 44) {
    lampSpots.push([c + 7, s]); lampSpots.push([s, c + 7]);
  }
  const poles = new THREE.InstancedMesh(lampPoleGeo, lampPoleMat, lampSpots.length);
  const heads = new THREE.InstancedMesh(lampHeadGeo, lampHeadMat, lampSpots.length);
  const dummy = new THREE.Object3D();
  lampSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 3, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 6.1, z); dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  group.add(poles); group.add(heads);

  // --- traffic lights at the 4 central intersections ---
  const lightPoles = [];
  const lightState = { nsGreen: true, timer: 0 };
  for (const [x, z] of [[-26, -26], [-26, 26], [26, -26], [26, 26]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x222226 }));
    pole.position.set(x + 7, 2.7, z + 7); group.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x18181c }));
    box.position.set(x + 7, 5.6, z + 7); group.add(box);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    lamp.position.set(x + 7, 6.2, z + 7); group.add(lamp);
    lightPoles.push(lamp);
  }

  // --- landmarks ---
  landmarks.policeStation = { x: -208 + 3 * PITCH, z: -208 + 2 * PITCH, name: 'Police HQ' };
  landmarks.hospital = { x: -208 + 6 * PITCH, z: -208 + 3 * PITCH, name: 'General Hospital' };
  // garage + bank sit on the street edge of their block so a car can reach them
  landmarks.garage = { x: -208 + 5 * PITCH, z: -208 + 5 * PITCH + 26, name: "Mara's Garage" };
  landmarks.warehouse = { x: -208 + 1 * PITCH, z: -208 + 6 * PITCH, name: 'Harbor Warehouse' };
  landmarks.bank = { x: -208 + 4 * PITCH, z: -208 + 3 * PITCH + 16, name: 'Sunvale Bank' };
  landmarks.beach = { x: 0, z: HALF + 40, name: 'Sunvale Beach' };
  landmarks.plaza = { x: 0, z: 0, name: 'Plaza' };

  function collides(x, z, r) {
    for (const b of buildings) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return b;
    }
    return null;
  }
  function clampToWorld(x, z) {
    return {
      x: Math.max(-HALF - 8, Math.min(HALF + 8, x)),
      z: Math.max(-HALF - 8, Math.min(HALF + 120, z)),
    };
  }
  function randomStreetPoint() {
    const c = streetCenters[Math.floor(Math.random() * streetCenters.length)];
    const along = -HALF + 20 + Math.random() * (HALF * 2 - 40);
    return Math.random() < 0.5 ? { x: c, z: along } : { x: along, z: c };
  }
  function randomSidewalkPoint() {
    const p = randomStreetPoint();
    const off = (Math.random() < 0.5 ? -1 : 1) * (STREET / 2 + 2.5);
    return Math.random() < 0.5 ? { x: p.x + off, z: p.z } : { x: p.x, z: p.z + off };
  }

  return {
    group, buildings, landmarks, streetCenters, sun, clouds, sea,
    lightState, lightPoles,
    collides, clampToWorld, randomStreetPoint, randomSidewalkPoint,
    update(dt) {
      // traffic light cycle: NS green 9s, yellow 2s, EW green 9s, yellow 2s
      lightState.timer += dt;
      const t = lightState.timer % 22;
      const ns = t < 9; // NS green [0,9); EW green [11,20); yellow [9,11) and [20,22)
      const yellow = (t >= 9 && t < 11) || (t >= 20);
      lightState.nsGreen = ns;
      const col = yellow ? 0xffcc22 : (ns ? 0x22ff66 : 0xff3333);
      for (const l of lightPoles) l.material.color.setHex(col);
      for (const c of clouds) { c.position.x += dt * 1.5; if (c.position.x > 560) c.position.x = -560; }
      water.position.y = 1.25 + Math.sin(performance.now() * 0.002) * 0.06;
    },
  };
}

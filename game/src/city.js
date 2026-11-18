// city.js — procedural Sunvale: sun-soaked coastal city. One job: build the world
// (roads, buildings, beach, parks, plaza, lamps, palms, traffic lights, sky, sea)
// and answer collision + layout queries for the rest of the game.
const THREE = window.THREE;
export const BLOCK = 40, STREET = 12, PITCH = 52, HALF = 240;

function facadeTexture(base, lit, style) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  // subtle vertical grime + floor banding so the wall is not one flat color
  for (let y = 0; y < 256; y += 4) {
    g.fillStyle = `rgba(0,0,0,${0.02 + (y % 32 === 0 ? 0.05 : 0)})`;
    g.fillRect(0, y, 128, 2);
  }
  // cornice band at the top
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 128, 12);
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 12, 128, 3);
  // ground floor: storefront glass + awning on shop style, lobby on others
  if (style === 'shop') {
    g.fillStyle = '#1a2c44'; g.fillRect(8, 196, 112, 52);
    g.fillStyle = 'rgba(255,217,138,0.85)';
    for (let x = 12; x < 120; x += 14) g.fillRect(x, 200, 8, 44);
    g.fillStyle = '#c0392b'; g.fillRect(0, 186, 128, 10);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 186, 128, 2);
  } else {
    g.fillStyle = 'rgba(20,30,50,0.9)'; g.fillRect(48, 214, 32, 34);
    g.fillStyle = 'rgba(255,217,138,0.7)'; g.fillRect(52, 218, 24, 26);
  }
  // windows: framed, varied sizes, some lit, a few with AC boxes
  for (let y = 20; y < 180; y += 24) {
    for (let x = 10; x < 118; x += 22) {
      const isLit = Math.random() < lit;
      // frame
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 2, y - 2, 16, 18);
      g.fillStyle = isLit ? '#ffd98a' : 'rgba(20,30,50,0.85)';
      g.fillRect(x, y, 12, 14);
      // mullion cross on lit windows
      if (isLit) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 5, y, 2, 14); }
      if (Math.random() < 0.14) {
        g.fillStyle = 'rgba(40,40,40,0.9)'; g.fillRect(x + 2, y + 15, 8, 5);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function asphaltTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#33343a'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + Math.random() * 0.06})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 1.5, 1.5);
  }
  // faint tire-wear bands
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(14, 0, 10, 64); g.fillRect(40, 0, 10, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 40);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function concreteTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#b8b0a4'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,50,40'},${0.02 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10);
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
  // warm dusk rig: two point lights that follow the player once the sun
  // drops (game clock past 17:00) — a pool of sodium light on the street.
  const duskLights = [];
  for (let i = 0; i < 2; i++) {
    const pl = new THREE.PointLight(0xffb45e, 0, 55, 1.6);
    scene.add(pl);
    duskLights.push(pl);
  }

  // sky dome (gradient) + sun disc + clouds — the gradient lerps to a
  // golden-hour dusk via the uDusk uniform (0 = noon, 1 = full dusk).
  const skyGeo = new THREE.SphereGeometry(880, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uDusk: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uDusk;
      void main(){ float h = normalize(vP).y;
        vec3 top = mix(vec3(0.25,0.55,0.95), vec3(0.18,0.12,0.35), uDusk);
        vec3 mid = mix(vec3(0.65,0.82,1.0), vec3(0.95,0.45,0.25), uDusk);
        vec3 low = mix(vec3(1.0,0.78,0.5), vec3(1.0,0.35,0.15), uDusk);
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25,0.8,h)) : mix(low, mid, smoothstep(-0.05,0.25,h));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
  sunDisc.position.set(420, 320, -500); sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const clouds = [];
  // unlit warm white: Lambert undersides went black against the dusk sky
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe9c4, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMat);
    cl.scale.set(26 + Math.random() * 22, 5 + Math.random() * 3, 12 + Math.random() * 8);
    cl.position.set(-500 + Math.random() * 1000, 130 + Math.random() * 60, -420 + Math.random() * 700);
    scene.add(cl); clouds.push(cl);
  }

  // --- ground: textured concrete base, asphalt streets, sand + sea to the south ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ map: concreteTexture() }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 60);
  ground.receiveShadow = true;
  scene.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ map: asphaltTexture() });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9d968c });
  const streetCenters = [];
  for (let i = 0; i < 10; i++) streetCenters.push(-HALF + STREET / 2 + i * PITCH);
  for (const c of streetCenters) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(STREET, HALF * 2), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0); v.receiveShadow = true; group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, STREET), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c); h.receiveShadow = true; group.add(h);
    // sidewalks: pale strips flanking every street
    for (const s of [-1, 1]) {
      const sv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, HALF * 2), walkMat);
      sv.rotation.x = -Math.PI / 2; sv.position.set(c + s * (STREET / 2 + 1.2), 0.01, 0); group.add(sv);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 2.4), walkMat);
      sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.01, c + s * (STREET / 2 + 1.2)); group.add(sh);
    }
  }
  // zebra crosswalks at the 4 central intersections
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const [ix, iz] of [[-26, -26], [-26, 26], [26, -26], [26, 26]]) {
    for (let k = -2; k <= 2; k++) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.4), zebraMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(ix + k * 2.4, 0.03, iz - 8.5); group.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), zebraMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(ix - 8.5, 0.03, iz + k * 2.4); group.add(s2);
    }
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

  // --- buildings: 4 facade styles, setbacks, parapets, rooftop clutter ---
  const texA = facadeTexture('#8a7f72', 0.25, 'res'); // residential
  const texB = facadeTexture('#5f7488', 0.35, 'office'); // office
  const texC = facadeTexture('#3d4c63', 0.45, 'tower'); // tower glass
  const texS = facadeTexture('#7a5c40', 0.4, 'shop'); // storefront
  const matA = new THREE.MeshLambertMaterial({ map: texA });
  const matB = new THREE.MeshLambertMaterial({ map: texB });
  const matC = new THREE.MeshLambertMaterial({ map: texC });
  const matS = new THREE.MeshLambertMaterial({ map: texS });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4440 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x2e2a26 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  function addBuilding(cx, cz, w, d, h, mat, tower = false) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(w, h, d);
    m.position.set(cx, h / 2, cz);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    // base trim: a darker plinth so the tower meets the street cleanly
    const trim = new THREE.Mesh(boxGeo, trimMat);
    trim.scale.set(w * 1.04, 1.1, d * 1.04);
    trim.position.set(cx, 0.55, cz);
    group.add(trim);
    // parapet rim on the roofline
    const rim = new THREE.Mesh(boxGeo, roofMat);
    rim.scale.set(w + 0.4, 0.7, d + 0.4);
    rim.position.set(cx, h + 0.35, cz);
    group.add(rim);
    if (tower) {
      // setback top floor + rooftop AC boxes + antenna
      const top = new THREE.Mesh(boxGeo, mat);
      top.scale.set(w * 0.55, h * 0.22, d * 0.55);
      top.position.set(cx, h + h * 0.11, cz);
      top.castShadow = true;
      group.add(top);
      const ac = new THREE.Mesh(boxGeo, roofMat);
      ac.scale.set(3, 1.4, 2.4);
      ac.position.set(cx + w * 0.22, h + 1.4, cz - d * 0.18);
      group.add(ac);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 6), trimMat);
      ant.position.set(cx - w * 0.2, h + 4.2, cz + d * 0.15);
      group.add(ant);
    } else {
      // low rooftop: AC box or water tower on some roofs
      if (Math.random() < 0.5) {
        const ac = new THREE.Mesh(boxGeo, roofMat);
        ac.scale.set(2.4, 1.1, 1.8);
        ac.position.set(cx + w * 0.15, h + 1.2, cz);
        group.add(ac);
      } else if (Math.random() < 0.4) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10), roofMat);
        tank.position.set(cx - w * 0.18, h + 2.2, cz + d * 0.12);
        tank.castShadow = true;
        group.add(tank);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 10), trimMat);
        cone.position.set(cx - w * 0.18, h + 4.1, cz + d * 0.12);
        group.add(cone);
      }
    }
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
        addBuilding(cx, cz, 26 + Math.random() * 8, 26 + Math.random() * 8, h, texC, true);
      } else {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) {
          const ox = (k % 2 === 0 ? -9 : 9), oz = (k < 2 ? -9 : 9);
          const h = 8 + Math.random() * (isDowntown(i, j) ? 20 : 12);
          const mat = Math.random() < 0.22 ? matS : (Math.random() < 0.5 ? matA : matB);
          addBuilding(cx + ox, cz + oz, 15 + Math.random() * 5, 15 + Math.random() * 5, h, mat);
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
  // beach life: umbrellas + a lifeguard tower on the sand
  const umbrellaCols = [0xe84a5f, 0x2a9d8f, 0xf4a261, 0x3a86ff, 0xffd94a];
  for (let k = 0; k < 5; k++) {
    const ux = -160 + k * 80, uz = HALF + 55 + (k % 2) * 12;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a7a66 }));
    pole.position.set(ux, 1.3, uz); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaCols[k % umbrellaCols.length] }));
    top.position.set(ux, 3.0, uz); top.castShadow = true; group.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1),
      new THREE.MeshLambertMaterial({ color: umbrellaCols[(k + 2) % umbrellaCols.length] }));
    towel.rotation.x = -Math.PI / 2; towel.position.set(ux + 2.6, 0.06, uz + 1); group.add(towel);
  }
  const lgBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.0),
    new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }));
  lgBase.position.set(40, 1.6, HALF + 60); lgBase.castShadow = true; group.add(lgBase);
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.4, 4),
    new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  lgRoof.position.set(40, 3.9, HALF + 60); lgRoof.rotation.y = Math.PI / 4; group.add(lgRoof);

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
  // shops + safehouse: street-edge spots the player can walk to
  landmarks.shopArms = { x: -208 + 3 * PITCH, z: -208 + 5 * PITCH + 26, name: 'Sunvale Arms' };
  landmarks.shopMedi = { x: -208 + 6 * PITCH, z: -208 + 2 * PITCH + 26, name: 'MediCare Clinic' };
  landmarks.shopMart = { x: -208 + 2 * PITCH, z: -208 + 7 * PITCH - 26, name: 'Corner Mart' };
  landmarks.safehouse = { x: 120, z: HALF + 14, name: 'Safehouse' };
  // shop storefronts: a low shop box + awning at each shop spot
  for (const [key, awn] of [['shopArms', 0xc0392b], ['shopMedi', 0x2a9d8f], ['shopMart', 0xe67e22]]) {
    const lm = landmarks[key];
    const shop = new THREE.Mesh(boxGeo, matS);
    shop.scale.set(12, 5.5, 8);
    shop.position.set(lm.x, 2.75, lm.z + 6);
    shop.castShadow = true; shop.receiveShadow = true;
    group.add(shop);
    const awning = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: awn }));
    awning.scale.set(12.6, 0.35, 2.2);
    awning.position.set(lm.x, 4.4, lm.z + 1.6);
    group.add(awning);
    buildings.push({ minX: lm.x - 6, maxX: lm.x + 6, minZ: lm.z, maxZ: lm.z + 12, h: 5.5 });
  }
  // safehouse: a small beach house with a pitched roof by the boardwalk
  {
    const sh = landmarks.safehouse;
    const house = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xe8dcc0 }));
    house.scale.set(9, 4.5, 7);
    house.position.set(sh.x, 2.25, sh.z + 8);
    house.castShadow = true; house.receiveShadow = true;
    group.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a4a2a }));
    roof.position.set(sh.x, 5.8, sh.z + 8); roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.15, 1, 0.9);
    group.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x2c4a6b }));
    door.position.set(sh.x, 1.3, sh.z + 4.45); group.add(door);
    buildings.push({ minX: sh.x - 4.5, maxX: sh.x + 4.5, minZ: sh.z + 4.5, maxZ: sh.z + 11.5, h: 4.5 });
  }

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

  // dusk state: 0 = bright noon, 1 = golden hour. main.js drives it from
  // the game clock; the sky, sun and lamps all follow.
  let dusk = 0;
  const sunDay = new THREE.Color(0xffe7b0), sunDusk = new THREE.Color(0xff9a3c);
  const fogDay = new THREE.Color(0xffd9a8), fogDusk = new THREE.Color(0xe8906a);
  return {
    group, buildings, landmarks, streetCenters, sun, clouds, sea,
    lightState, lightPoles, duskLights,
    collides, clampToWorld, randomStreetPoint, randomSidewalkPoint,
    setDusk(f, px, pz) {
      dusk = Math.max(0, Math.min(1, f));
      skyMat.uniforms.uDusk.value = dusk;
      sun.color.copy(sunDay).lerp(sunDusk, dusk);
      sun.intensity = 1.7 - dusk * 0.5;
      hemi.intensity = 1.15 - dusk * 0.35;
      scene.fog.color.copy(fogDay).lerp(fogDusk, dusk);
      // streetlights glow harder at dusk; the two warm pools track the player
      for (const l of duskLights) l.intensity = dusk * 55;
      if (px !== undefined) {
        duskLights[0].position.set(px + 14, 9, pz + 8);
        duskLights[1].position.set(px - 14, 9, pz - 8);
      }
    },
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

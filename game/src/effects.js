// effects.js — particle bursts, muzzle flashes, smoke and camera shake.
// One job: everything that explodes, sparks or smokes.
const THREE = window.THREE;
const MAX = 900;
let scene = null, points = null, geo = null;
let posArr, colArr, lifeArr, velArr, sizeArr;
let alive = 0, shakeAmt = 0;

export const Effects = {
  init(s) {
    scene = s;
    geo = new THREE.BufferGeometry();
    posArr = new Float32Array(MAX * 3);
    colArr = new Float32Array(MAX * 3);
    sizeArr = new Float32Array(MAX);
    lifeArr = new Float32Array(MAX);
    velArr = new Float32Array(MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.6, vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false,
    });
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
  },
  _spawn(x, y, z, vx, vy, vz, r, g, b, life) {
    if (alive >= MAX) return;
    const i = alive++;
    posArr[i * 3] = x; posArr[i * 3 + 1] = y; posArr[i * 3 + 2] = z;
    velArr[i * 3] = vx; velArr[i * 3 + 1] = vy; velArr[i * 3 + 2] = vz;
    colArr[i * 3] = r; colArr[i * 3 + 1] = g; colArr[i * 3 + 2] = b;
    lifeArr[i] = life; sizeArr[i] = 1;
  },
  burst(p, n, color, speed, life, up = 2) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this._spawn(p.x, p.y, p.z,
        Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + up, Math.sin(a) * Math.cos(e) * s,
        color[0], color[1], color[2], life * (0.6 + Math.random() * 0.7));
    }
  },
  explosion(p) {
    this.burst(p, 70, [1.0, 0.55, 0.1], 9, 0.9, 4);
    this.burst(p, 40, [1.0, 0.9, 0.3], 5, 0.5, 3);
    this.burst(p, 30, [0.25, 0.25, 0.25], 3, 1.6, 5);
    shakeAmt = Math.min(1.2, shakeAmt + 0.9);
  },
  muzzle(p, dir) {
    this.burst(p, 6, [1.0, 0.85, 0.4], 4, 0.12, 0);
    for (let k = 0; k < 3; k++) {
      this._spawn(p.x + dir.x * k * 0.4, p.y + dir.y * k * 0.4, p.z + dir.z * k * 0.4,
        dir.x * 18, dir.y * 18, dir.z * 18, 1, 0.9, 0.5, 0.1);
    }
  },
  sparks(p) { this.burst(p, 12, [1.0, 0.8, 0.3], 6, 0.4, 2); },
  smoke(p) { this.burst(p, 3, [0.3, 0.3, 0.3], 1.2, 1.4, 2.5); },
  skid(p) { this.burst(p, 2, [0.55, 0.55, 0.55], 0.8, 0.7, 0.8); },
  blood(p) { this.burst(p, 10, [0.7, 0.05, 0.05], 3, 0.5, 1); },
  heal(p) { // green rising sparkles for medkits / safehouse rest
    this.burst(p, 18, [0.3, 1.0, 0.5], 1.5, 0.9, 3.5);
    this.burst(p, 8, [0.9, 1.0, 0.6], 1, 0.7, 4);
  },
  cashBurst(p) { // gold coin spray for a purchase
    this.burst(p, 22, [1.0, 0.85, 0.2], 4, 0.7, 3);
    this.burst(p, 8, [1.0, 0.95, 0.6], 2, 0.5, 2);
  },
  rotorWash(p) { // dust kicked up under the police helicopter — few, dim,
    // short-lived: the shared 1.6pt squares read as glitchy white boxes else
    this.burst(p, 2, [0.5, 0.47, 0.4], 2.0, 0.6, 0.6);
  },
  shake(a) { shakeAmt = Math.min(1.2, shakeAmt + a); },
  getShake() { return shakeAmt; },
  update(dt) {
    shakeAmt = Math.max(0, shakeAmt - dt * 1.8);
    let i = 0;
    while (i < alive) {
      lifeArr[i] -= dt;
      if (lifeArr[i] <= 0) {
        const last = --alive;
        for (let c = 0; c < 3; c++) {
          posArr[i * 3 + c] = posArr[last * 3 + c];
          velArr[i * 3 + c] = velArr[last * 3 + c];
          colArr[i * 3 + c] = colArr[last * 3 + c];
        }
        lifeArr[i] = lifeArr[last];
        continue;
      }
      posArr[i * 3] += velArr[i * 3] * dt;
      posArr[i * 3 + 1] += velArr[i * 3 + 1] * dt;
      posArr[i * 3 + 2] += velArr[i * 3 + 2] * dt;
      velArr[i * 3 + 1] -= 6 * dt; // gravity on particles
      i++;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, alive);
  },
};

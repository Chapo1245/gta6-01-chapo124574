// Sunvale Heat — shared state + small helpers (fresh code, round 2).
// Every module reads/writes the single game state object SV below.
var TAU = Math.PI * 2;

var SV = {
  mode: "menu", // menu | play | paused | busted | wasted
  time: 0, // seconds since play started
  clockMin: 8 * 60 + 24, // in-game clock, minutes since midnight (starts 08:24)
  cash: 250,
  health: 100,
  maxHealth: 100,
  wanted: 0, // 0..5 stars
  wantedHeat: 0, // 0..1, builds on crimes, drains when unseen
  lastCrimeAt: -999,
  missionIndex: 0, // 0..4 story missions, 5 = all done
  mission: null, // active mission runtime {id, phase, timer, ...}
  player: null, // on-foot rig {group, mesh, pos, vel, yaw, speed, grounded}
  car: null, // car object currently driven, or null
  cars: [], // every car {group, kind, pos, yaw, speed, color, hp, ...}
  peds: [], // pedestrians {group, pos, yaw, speed, state, ...}
  officers: [], // foot police {group, pos, yaw, speed, arrestT}
  guards: [], // warehouse guards {group, pos, hp, shootT}
  colliders: [], // building AABBs {x0, z0, x1, z1}
  camYaw: 0.6, camPitch: 0.32, camDist: 8,
  camPos: null, // THREE.Vector3 smoothed camera position
  scene: null, camera: null, renderer: null,
  beacon: null, // mission waypoint beacon {group, pillar, ring, x, z}
  audio: null, hud: null,
  keys: {},
  pointerLocked: false,
  shot: null, // staged-screenshot hook name (?shot=chase|street|mission|menu)
  stats: { shots: 0, hits: 0, carsStolen: 0, pedsHit: 0, missionsDone: 0 },
  saveSlot: "sunvale-heat-save-v1",
  muted: false,
  timeScale: 1
};

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
function angDiff(a, b) {
  var d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function angLerp(a, b, t) { return a + angDiff(a, b) * t; }
function el(id) { return document.getElementById(id); }

// Canvas texture helper: draw with a callback, get a THREE.CanvasTexture.
function canvasTex(w, h, draw) {
  var c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function boxMesh(w, h, d, color, x, y, z, rough) {
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: color, roughness: rough == null ? 0.9 : rough })
  );
  m.position.set(x, y, z);
  return m;
}

function cylMesh(rt, rb, h, color, x, y, z, seg) {
  var m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg || 10),
    new THREE.MeshLambertMaterial({ color: color, roughness: 0.85 })
  );
  m.position.set(x, y, z);
  return m;
}

// Push a circle (x,z,r) out of every building AABB it overlaps.
function resolveBuildingCollision(x, z, r) {
  for (var i = 0; i < SV.colliders.length; i++) {
    var c = SV.colliders[i];
    var nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
    var dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 0.0001) { x = c.x1 + r; continue; }
      var d = Math.sqrt(d2);
      x = nx + (dx / d) * r; z = nz + (dz / d) * r;
    }
  }
  return { x: x, z: z };
}

function insideBuilding(x, z, pad) {
  for (var i = 0; i < SV.colliders.length; i++) {
    var c = SV.colliders[i];
    if (x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad) return true;
  }
  return false;
}

// Nearest street-line coordinate (streets run at multiples of GRID).
var GRID = 52;
function nearestStreet(v) { return Math.round(v / GRID) * GRID; }
function onRoad(x, z) {
  var fx = Math.abs(x - nearestStreet(x)), fz = Math.abs(z - nearestStreet(z));
  return fx < 7 || fz < 7;
}

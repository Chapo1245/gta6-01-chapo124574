// Azura Bay — small math and random helpers shared by every system.
window.AZURA = window.AZURA || {};

const AzuraUtils = {
  clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  },
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  // Shortest signed turn from angle `from` toward angle `to` (radians).
  angleDelta(from, to) {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  angleLerp(from, to, t) {
    return from + AzuraUtils.angleDelta(from, to) * t;
  },
  dist2D(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  },
  rand(min, max) {
    return min + Math.random() * (max - min);
  },
  randInt(min, max) {
    return Math.floor(AzuraUtils.rand(min, max + 1));
  },
  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },
  // Push a circle (x, z, radius) out of an axis-aligned box collider.
  // Returns true when a push happened.
  pushCircleOutOfBox(x, z, radius, box) {
    const cx = AzuraUtils.clamp(x, box.minX, box.maxX);
    const cz = AzuraUtils.clamp(z, box.minZ, box.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) return null;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const push = (radius - d) / d;
      return { x: x + dx * push, z: z + dz * push };
    }
    // Centre inside the box: push out along the smallest penetration axis.
    const pl = x - box.minX + radius;
    const pr = box.maxX - x + radius;
    const pt = z - box.minZ + radius;
    const pb = box.maxZ - z + radius;
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) return { x: box.minX - radius, z };
    if (m === pr) return { x: box.maxX + radius, z };
    if (m === pt) return { x, z: box.minZ - radius };
    return { x, z: box.maxZ + radius };
  },
};

AZURA.utils = AzuraUtils;

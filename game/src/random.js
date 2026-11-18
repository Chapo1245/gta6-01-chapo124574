// A deterministic seeded random source. The same seed always builds the same
// city, the same traffic and the same screenshot frames, so a staged shot is
// repeatable and the live game is stable across reloads.
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // A shuffled copy of a list, for dealing out varied traffic and crowds.
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance(p) {
      return next() < p;
    },
    // A fresh stream derived from this one, so subsystems stay independent.
    fork(salt) {
      return makeRng((state ^ Math.imul(salt | 0, 2654435761)) >>> 0);
    },
  };
}

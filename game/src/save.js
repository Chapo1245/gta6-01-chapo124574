// save.js — localStorage persistence for Sunvale Heat. One job: save + load.
const KEY = 'sunvale-heat-save-v3';

export const SaveSys = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return null;
      return {
        cash: typeof d.cash === 'number' ? d.cash : 0,
        missionsDone: Array.isArray(d.missionsDone) ? d.missionsDone : [],
        health: typeof d.health === 'number' ? d.health : 100,
        ammo: typeof d.ammo === 'number' ? d.ammo : 48,
        playMinutes: typeof d.playMinutes === 'number' ? d.playMinutes : 0,
        armor: typeof d.armor === 'number' ? d.armor : 0,
        garage: d.garage && typeof d.garage === 'object'
          ? { speed: d.garage.speed | 0, armor: d.garage.armor | 0, nos: d.garage.nos | 0 }
          : { speed: 0, armor: 0, nos: 0 },
      };
    } catch (_) { return null; }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cash: data.cash | 0,
        missionsDone: data.missionsDone || [],
        health: data.health | 0,
        ammo: data.ammo | 0,
        playMinutes: data.playMinutes | 0,
        armor: data.armor | 0,
        garage: data.garage || { speed: 0, armor: 0, nos: 0 },
        savedAt: Date.now(),
      }));
      return true;
    } catch (_) { return false; }
  },
  clear() { try { localStorage.removeItem(KEY); } catch (_) {} },
};

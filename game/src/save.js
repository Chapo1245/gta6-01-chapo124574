// Azura Bay — safehouse saves: cash, jobs and upgrades in localStorage.
window.AZURA = window.AZURA || {};

const AzuraSave = {
  key: 'azura-bay-save-v1',

  load() {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.cash !== 'number') return null;
      return data;
    } catch {
      return null;
    }
  },

  save(game) {
    try {
      window.localStorage.setItem(this.key, JSON.stringify({
        cash: game.cash,
        missionIndex: game.missions.index,
        upgrades: game.upgrades,
        savedAt: Date.now(),
      }));
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // Storage off: nothing to clear.
    }
  },
};

AZURA.save = AzuraSave;

// Sunvale Heat — localStorage save (fresh code, round 2).
// Saves cash, health, mission progress, position and clock. Loaded from the
// start screen's Continue button.
var Save = {
  save: function () {
    try {
      var data = {
        cash: Math.floor(SV.cash),
        health: Math.round(SV.health),
        missionIndex: SV.missionIndex,
        clockMin: Math.round(SV.clockMin),
        px: SV.player ? Math.round(SV.player.pos.x) : 0,
        pz: SV.player ? Math.round(SV.player.pos.z) : 26,
        time: Math.round(SV.time)
      };
      localStorage.setItem(SV.saveSlot, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  },

  load: function () {
    try {
      var raw = localStorage.getItem(SV.saveSlot);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (typeof d.cash !== "number" || typeof d.missionIndex !== "number") return null;
      return d;
    } catch (e) { return null; }
  },

  has: function () { return this.load() !== null; },

  clear: function () {
    try { localStorage.removeItem(SV.saveSlot); } catch (e) {}
  },

  apply: function (d) {
    SV.cash = d.cash;
    SV.health = d.health;
    SV.missionIndex = d.missionIndex;
    SV.clockMin = d.clockMin;
    SV.time = d.time || 0;
    SV.player.pos.set(d.px, 0, d.pz);
    SV.wanted = 0;
    SV.wantedHeat = 0;
  }
};

// save.js — localStorage save/load for Sunvale Heat (cash, story progress, position).
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var KEY = 'sunvale-heat-save-v1';

  function readSave() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (typeof s !== 'object' || s === null) return null;
      return s;
    } catch (e) { return null; }
  }
  function writeSave() {
    try {
      var p = SV.player ? SV.player.position() : { x: 0, z: 0 };
      var data = {
        cash: SV.cash || 0,
        rep: SV.rep || 0,
        missionIndex: SV.missions ? SV.missions.index : 0,
        missionsDone: SV.missions ? SV.missions.doneCount() : 0,
        x: p.x, z: p.z,
        health: SV.health || 100,
        day: SV.day || 1,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }

  SV.save = { read: readSave, write: writeSave, clear: clearSave, key: KEY };
})();

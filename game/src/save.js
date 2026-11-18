// The safehouse save: money, completed jobs, upgrades and best stats, kept
// in localStorage between visits. A save only happens at the safehouse, never
// in the middle of a chase.
import { SAVE_KEY } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        money: Math.floor(state.money),
        jobsDone: state.jobsDone,
        upgrades: state.upgrades,
        bestMoney: state.bestMoney,
        savedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

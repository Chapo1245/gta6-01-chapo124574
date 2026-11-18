// radio.js — in-car radio for Sunvale Heat. One job: music while you drive.
// Three stations of synthesized WebAudio, cycled with R while driving. The
// radio only plays in a car; on foot the game falls back to the ambient
// synthwave loop. The station name shows on the HUD so a screenshot of a
// drive reads as a radio, not a silent car.
import { AudioSys } from './audio.js';

export const STATIONS = [
  { name: 'SUNWAVE FM', tag: 'synthwave', desc: 'Neon nights, endless summer' },
  { name: 'PALM 98.5', tag: 'island groove', desc: 'Slow tide, warm breeze' },
  { name: 'TALK 88', tag: 'talk radio', desc: 'Sunvale after dark — call in!' },
];

export const Radio = {
  station: 0,
  el: null,
  init(world) {
    this.world = world;
    this.station = 0;
    this.el = document.getElementById('radio');
    AudioSys.setRadioStation(0);
    this._render();
  },
  cycle() {
    // R only does something while driving; on foot R is reload.
    if (!this.world.playerCar) return;
    this.station = (this.station + 1) % STATIONS.length;
    AudioSys.setRadioStation(this.station);
    const s = STATIONS[this.station];
    if (this.world.hud) this.world.hud.toast(`♪ ${s.name} — ${s.desc}`, 3);
    AudioSys.click();
    this._render();
  },
  setStation(i) {
    this.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    AudioSys.setRadioStation(this.station);
    this._render();
  },
  current() { return STATIONS[this.station]; },
  _render() {
    if (!this.el) return;
    const s = STATIONS[this.station];
    this.el.textContent = `♪ ${s.name}`;
  },
  update(dt, world) {
    // label visible only while driving; the music engine follows the car too.
    if (this.el) {
      this.el.style.display = world.playerCar ? 'block' : 'none';
    }
    AudioSys.radioOn(!!world.playerCar);
    void dt;
  },
};

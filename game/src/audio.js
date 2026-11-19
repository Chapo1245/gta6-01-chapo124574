// Azura Bay — generative audio: three radio stations, engine hum, sirens.
// Everything is synthesized with WebAudio; no audio files are loaded.
window.AZURA = window.AZURA || {};

const AzuraAudio = {
  ctx: null,
  master: null,
  station: 0,
  muted: false,
  engineOsc: null,
  engineOsc2: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenTimer: 0,
  step: 0,
  nextStepTime: 0,
  noiseBuffer: null,

  // 16-step patterns per station: bass roots (MIDI), lead notes, tempo.
  stations: [
    {
      name: 'Sunset FM',
      bpm: 112,
      bass: [45, 45, 48, 43, 45, 45, 50, 48],
      lead: [69, 72, 76, 79, 76, 72, 69, 67],
      wave: 'sawtooth',
    },
    {
      name: 'Coast 98.2',
      bpm: 84,
      bass: [41, 48, 45, 43, 41, 48, 52, 50],
      lead: [64, 67, 71, 74, 71, 67, 64, 62],
      wave: 'triangle',
    },
    {
      name: 'Bay Talk 710',
      bpm: 96,
      bass: [38, 38, 41, 38, 43, 41, 38, 36],
      lead: [62, 62, 65, 62, 60, 62, 65, 67],
      wave: 'square',
    },
  ],

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    // Shared noise buffer for hi-hats.
    const len = this.ctx.sampleRate * 0.05;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    // Engine hum: two detuned saws through a lowpass.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.value = 90;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter);
    this.engineOsc2.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();
    // Police siren: one square osc, pitch flipped by a timer in update().
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.step = 0;
  },

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  note(freq, time, dur, wave, vol) {
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  },

  hat(time, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(time);
  },

  // Call every frame: schedules the sequencer ahead of the playhead.
  update() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const st = this.stations[this.station];
    const stepDur = 60 / st.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      const t = this.nextStepTime;
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % 8;
      const bassNote = st.bass[bar % st.bass.length];
      if (s % 4 === 0) this.note(this.midiToFreq(bassNote), t, stepDur * 3.5, 'sine', 0.22);
      if (s % 8 === 4) this.note(this.midiToFreq(st.lead[bar % st.lead.length]), t, stepDur * 2, st.wave, 0.08);
      if (s % 2 === 0) this.hat(t, 0.05);
      this.step += 1;
      this.nextStepTime += stepDur;
    }
  },

  setEngine(speedNorm) {
    if (!this.ctx) return;
    const f = 55 + speedNorm * 140;
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 1.5 + 4, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.02 + speedNorm * 0.05, this.ctx.currentTime, 0.1);
  },

  setSiren(on, near) {
    if (!this.ctx) return;
    if (!on) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    this.sirenTimer += 1;
    const high = Math.floor(this.sirenTimer / 22) % 2 === 0;
    this.sirenOsc.frequency.setTargetAtTime(high ? 950 : 700, this.ctx.currentTime, 0.05);
    this.sirenGain.gain.setTargetAtTime(0.02 + near * 0.04, this.ctx.currentTime, 0.2);
  },

  setStation(i) {
    this.station = ((i % 3) + 3) % 3;
    this.step = 0;
    if (this.ctx) this.nextStepTime = this.ctx.currentTime + 0.05;
  },

  stationName() {
    return this.stations[this.station].name;
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },
};

AZURA.audio = AzuraAudio;

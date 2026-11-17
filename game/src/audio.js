// Sunvale Heat — synthesized WebAudio (fresh code, round 2).
// No audio assets: engine hum, sirens, gunshots, punches, explosions,
// pickups and mission stings are all built from oscillators + filtered noise.
var AudioSys = {
  ctx: null, master: null, engineOsc: null, engineGain: null, sirenOn: false,
  sirenTimer: 0, sirenOsc: null, sirenGain: null, noiseBuf: null,

  init: function () {
    if (this.ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = SV.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      var len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var d = this.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Engine hum: two detuned saws through a lowpass.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = "sawtooth";
      this.engineOsc.frequency.value = 42;
      var osc2 = this.ctx.createOscillator();
      osc2.type = "sawtooth"; osc2.frequency.value = 63;
      var lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(lp); osc2.connect(lp);
      lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start(); osc2.start();
      this._engineOsc2 = osc2;
      // Siren: alternating triangle tone.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = "triangle";
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  },

  resume: function () { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  setMuted: function (m) { if (this.master) this.master.gain.value = m ? 0 : 0.5; },

  engine: function (speed01, driving) {
    if (!this.ctx) return;
    var target = driving ? 0.05 + speed01 * 0.11 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    var f = 42 + speed01 * 130;
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.06);
    this._engineOsc2.frequency.setTargetAtTime(f * 1.5, this.ctx.currentTime, 0.06);
  },

  siren: function (on) {
    if (!this.ctx) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.15);
  },

  update: function (dt) {
    if (!this.ctx || !this.sirenOn) return;
    this.sirenTimer += dt;
    var f = (Math.floor(this.sirenTimer * 2.4) % 2 === 0) ? 720 : 980;
    this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  },

  blip: function (freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    var o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise: function (dur, vol, filterFreq, type) {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    var src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    var flt = this.ctx.createBiquadFilter();
    flt.type = type || "lowpass"; flt.frequency.value = filterFreq || 1200;
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },

  shot: function () { this.noise(0.09, 0.5, 2600, "highpass"); this.blip(180, 0.08, "square", 0.18, 60); },
  punch: function () { this.noise(0.08, 0.35, 500); this.blip(120, 0.07, "sine", 0.3, 50); },
  explosion: function () { this.noise(0.9, 0.7, 420); this.blip(90, 0.7, "sine", 0.5, 28); },
  pickup: function () { this.blip(660, 0.09, "sine", 0.22); setTimeout(function () { AudioSys.blip(990, 0.12, "sine", 0.22); }, 90); },
  click: function () { this.blip(440, 0.05, "square", 0.1); },
  sting: function () {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      (function (n, d) { setTimeout(function () { AudioSys.blip(n, 0.22, "triangle", 0.2); }, d); })(notes[i], i * 110);
    }
  },
  fail: function () { this.blip(220, 0.4, "sawtooth", 0.16, 110); },
  sirenBlip: function () { this.blip(880, 0.12, "square", 0.08, 660); }
};

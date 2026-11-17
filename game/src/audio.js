// audio.js — fully synthesized WebAudio sound for Sunvale Heat: no audio files, no network.
// Engine hum, siren, gunshots, punches, pickups, mission stings and a soft beach ambience.
(function () {
  'use strict';
  var SV = window.SV || (window.SV = {});
  var ctx = null, master = null, muted = false;
  var engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }
  function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }
  function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.45; }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 3000;
    var g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function gunshot() { noiseBurst(0.14, 0.5, 4200); blip(160, 0.1, 'square', 0.18, 50); }
  function punch() { noiseBurst(0.09, 0.3, 900); }
  function pickup() { blip(660, 0.09, 'sine', 0.22); setTimeout(function () { blip(990, 0.14, 'sine', 0.22); }, 90); }
  function cashSound() { blip(880, 0.08, 'triangle', 0.2); setTimeout(function () { blip(1174, 0.08, 'triangle', 0.2); }, 80); setTimeout(function () { blip(1568, 0.16, 'triangle', 0.22); }, 160); }
  function missionDone() { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.22, 'triangle', 0.22); }, i * 110); }); }
  function missionFail() { blip(220, 0.35, 'sawtooth', 0.18, 110); }
  function sirenWhoop() { blip(700, 0.5, 'sine', 0.12, 1100); }
  function horn() { blip(370, 0.25, 'square', 0.12); blip(466, 0.25, 'square', 0.1); }
  function explosion() { noiseBurst(0.7, 0.6, 900); blip(90, 0.6, 'sine', 0.35, 30); }
  function doorSlam() { noiseBurst(0.08, 0.25, 500); }

  // Continuous engine loop whose pitch follows speed; call every frame.
  function engine(speed01, on) {
    if (!ensure()) return;
    if (!on) {
      if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      return;
    }
    if (!engineOsc) {
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
    }
    engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.06, ctx.currentTime, 0.1);
  }
  // Two-tone police siren loop; call every frame with wanted > 0.
  function siren(on) {
    if (!ensure()) return;
    if (!on) {
      if (sirenGain) sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      return;
    }
    if (!sirenOsc) {
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
    }
    var t = ctx.currentTime;
    var phase = (t % 1.2) < 0.6 ? 750 : 1050;
    sirenOsc.frequency.setTargetAtTime(phase, t, 0.05);
    sirenGain.gain.setTargetAtTime(0.045, t, 0.1);
  }

  SV.audio = { unlock: unlock, setMuted: setMuted, gunshot: gunshot, punch: punch, pickup: pickup, cashSound: cashSound, missionDone: missionDone, missionFail: missionFail, sirenWhoop: sirenWhoop, horn: horn, explosion: explosion, doorSlam: doorSlam, engine: engine, siren: siren };
})();

// audio.js — synthesized WebAudio for Sunvale Heat. No audio files, everything
// is generated: engine hum, sirens, gunshots, stings and a synthwave music loop.
let ctx = null, master = null, musicGain = null, engineNodes = null, sirenNodes = null;
let muted = false, musicOn = false, musicTimer = null;
let noteStep = 0;
let radioStation = 0, radioMode = false, rotorNodes = null;

// Radio stations: each a 4-bar chord loop the music scheduler reads.
// 0 SUNWAVE FM — synthwave (Am–F–C–G). 1 PALM 98.5 — island groove
// (C–G–Am–F, slower, offbeat stabs). 2 TALK 88 — talk radio: voice blips.
const RADIO = [
  { roots: [110, 87.31, 130.81, 98],
    chords: [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]],
    barLen: 1.9, offbeat: false },
  { roots: [130.81, 98, 110, 87.31],
    chords: [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 261.63]],
    barLen: 2.4, offbeat: true },
  { roots: [0, 0, 0, 0], chords: [[], [], [], []], barLen: 2.2, talk: true },
];

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    return true;
  } catch (_) { return false; }
}
function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  if (!ensure() || muted) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noiseBurst(dur, vol, filterFreq) {
  if (!ensure() || muted) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export const AudioSys = {
  unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
  isMuted() { return muted; },
  click() { tone(880, 0.06, 'square', 0.12); },
  shot() { noiseBurst(0.14, 0.5, 1800); tone(160, 0.1, 'square', 0.2, 0, 60); },
  punch() { noiseBurst(0.08, 0.3, 500); tone(120, 0.08, 'sine', 0.25, 0, 70); },
  explosion() {
    noiseBurst(0.7, 0.7, 400); tone(90, 0.6, 'sine', 0.5, 0, 30);
    tone(55, 0.9, 'triangle', 0.4, 0.05, 28);
  },
  crash() { noiseBurst(0.2, 0.35, 900); tone(70, 0.15, 'square', 0.2, 0, 45); },
  sting(win) {
    const seq = win ? [523, 659, 784, 1047] : [392, 330, 262, 196];
    seq.forEach((f, i) => tone(f, 0.28, 'triangle', 0.22, i * 0.11));
  },
  pickup() { tone(660, 0.08, 'sine', 0.18); tone(990, 0.12, 'sine', 0.18, 0.08); },
  busted() { [440, 415, 392, 370].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.15, i * 0.16)); },
  purchase() {
    // cash register cha-ching: two bright pings + a coin tick
    tone(1320, 0.09, 'sine', 0.22); tone(1760, 0.16, 'sine', 0.2, 0.09);
    noiseBurst(0.05, 0.12, 6000);
  },
  heal() { tone(523, 0.2, 'sine', 0.18); tone(659, 0.2, 'sine', 0.18, 0.12); tone(784, 0.3, 'sine', 0.18, 0.24); },
  rotor(on) {
    if (!ensure()) return;
    if (!on) {
      if (rotorNodes) { try { rotorNodes.o.stop(); } catch (_) {} try { rotorNodes.n.stop(); } catch (_) {} rotorNodes = null; }
      return;
    }
    if (rotorNodes) return;
    // rotor thump: low square wave chopped by an LFO + filtered noise wash
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 13;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    g.gain.value = 0.11;
    o.connect(f); f.connect(g); g.connect(master); o.start();
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    n.connect(nf); nf.connect(ng); ng.connect(master); n.start();
    rotorNodes = { o, n };
  },
  setRadioStation(i) { radioStation = ((i % RADIO.length) + RADIO.length) % RADIO.length; },
  radioStation() { return radioStation; },
  radioOn(on) { radioMode = !!on; },
  engine(speed01, on) {
    if (!ensure()) return;
    if (!on) { if (engineNodes) { try { engineNodes.o.stop(); } catch (_) {} engineNodes = null; } return; }
    if (!engineNodes) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.value = 0.0; o.connect(f); f.connect(g); g.connect(master); o.start();
      engineNodes = { o, g };
    }
    const rpm = 50 + speed01 * 160;
    engineNodes.o.frequency.setTargetAtTime(rpm, ctx.currentTime, 0.08);
    engineNodes.g.gain.setTargetAtTime(0.05 + speed01 * 0.06, ctx.currentTime, 0.1);
  },
  siren(on) {
    if (!ensure()) return;
    if (!on) { if (sirenNodes) { clearInterval(sirenNodes.iv); try { sirenNodes.o.stop(); } catch (_) {} sirenNodes = null; } return; }
    if (sirenNodes) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 700; g.gain.value = 0.045;
    o.connect(g); g.connect(master); o.start();
    let hi = false;
    const iv = setInterval(() => { hi = !hi; o.frequency.setValueAtTime(hi ? 950 : 650, ctx.currentTime); }, 380);
    sirenNodes = { o, iv };
  },
  startMusic() {
    if (musicOn || !ensure()) return;
    musicOn = true;
    // The scheduler reads the live station: on foot it plays the ambient
    // synthwave loop (station 0); in a car it plays the radio station.
    const scheduleBar = () => {
      if (!musicOn || muted) return;
      const st = radioMode ? RADIO[radioStation] : RADIO[0];
      const barLen = st.barLen;
      const bar = noteStep++ % 4;
      const t0 = ctx.currentTime + 0.05;
      if (st.talk) {
        // TALK 88: a "host" murmuring — short voice-like blips + static
        for (let k = 0; k < 5; k++) {
          const f = 170 + Math.random() * 160;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          const at = t0 + Math.random() * (barLen - 0.3);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.linearRampToValueAtTime(0.06, at + 0.05);
          g.gain.linearRampToValueAtTime(0.0001, at + 0.16 + Math.random() * 0.12);
          o.connect(g); g.connect(musicGain); o.start(at); o.stop(at + 0.4);
        }
        noiseBurst(0.3, 0.015, 3000);
        return;
      }
      st.chords[bar].forEach((f) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 0.3);
        g.gain.setValueAtTime(0.05, t0 + barLen - 0.4);
        g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
        o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + barLen + 0.05);
      });
      if (st.offbeat) {
        // island offbeat: a short chord stab halfway through the bar
        const at = t0 + barLen / 2;
        st.chords[bar].forEach((f) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'square'; o.frequency.value = f * 2;
          g.gain.setValueAtTime(0.0001, at);
          g.gain.linearRampToValueAtTime(0.025, at + 0.03);
          g.gain.linearRampToValueAtTime(0.0001, at + 0.18);
          o.connect(g); g.connect(musicGain); o.start(at); o.stop(at + 0.25);
        });
      }
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = st.roots[bar];
      g.gain.setValueAtTime(0.09, t0);
      g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
      o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + barLen + 0.05);
    };
    scheduleBar();
    // reschedule on the current station's bar length, so switching
    // stations changes the tempo at the next bar
    const reschedule = () => {
      if (!musicOn) return;
      scheduleBar();
      const st = radioMode ? RADIO[radioStation] : RADIO[0];
      musicTimer = setTimeout(reschedule, st.barLen * 1000);
    };
    musicTimer = setTimeout(reschedule, RADIO[0].barLen * 1000);
  },
  stopMusic() { musicOn = false; if (musicTimer) { clearTimeout(musicTimer); clearInterval(musicTimer); } musicTimer = null; },
};

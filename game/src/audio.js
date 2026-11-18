// All sound is synthesized with WebAudio: three generative radio stations,
// an engine hum tied to speed, a two-tone siren, and one-shot effects.
// Nothing is loaded from a file.
import { RADIO_STATIONS } from './config.js';

const SCALES = {
  synthwave: [0, 3, 5, 7, 10],
  funk: [0, 3, 5, 6, 10],
  chill: [0, 2, 4, 7, 9],
};
const ROOTS = { synthwave: 110, funk: 98, chill: 130 };
const TEMPOS = { synthwave: 96, funk: 112, chill: 76 };

export function createAudio() {
  return {
    ctx: null,
    station: 0,
    musicTimer: 0,
    musicStep: 0,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenOn: false,
    muted: false,
  };
}

function ensureCtx(audio) {
  if (!audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audio.ctx = new Ctx();
    // Engine hum: a low sawtooth through a low-pass filter.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    const engineFilter = audio.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    // Siren: a sine that swings between two notes.
    audio.sirenOsc = audio.ctx.createOscillator();
    audio.sirenOsc.type = 'sine';
    audio.sirenOsc.frequency.value = 720;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.ctx.destination);
    audio.sirenOsc.start();
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return true;
}

export function startAudio(audio) {
  ensureCtx(audio);
}

function noteFreq(root, scale, degree) {
  const octave = Math.floor(degree / scale.length);
  const step = scale[degree % scale.length];
  return root * 2 ** (octave + step / 12);
}

function pluck(audio, freq, when, dur, type, gain) {
  const osc = audio.ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(g);
  g.connect(audio.ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

export function stepAudio(audio, dt, speed, wanted) {
  if (!audio.ctx || audio.muted) return;
  const station = RADIO_STATIONS[audio.station];
  const hue = station.hue;
  const scale = SCALES[hue];
  const root = ROOTS[hue];
  const beat = 60 / TEMPOS[hue] / 2;
  audio.musicTimer -= dt;
  while (audio.musicTimer <= 0) {
    audio.musicTimer += beat;
    const when = audio.ctx.currentTime + 0.02;
    const step = audio.musicStep;
    audio.musicStep += 1;
    // Bass on the beat, a sparse lead every other step.
    if (step % 2 === 0) pluck(audio, root / 2, when, beat * 1.8, 'triangle', 0.16);
    if (step % 4 === 2) pluck(audio, noteFreq(root, scale, 7 + (step % 5)), when, beat * 1.4, 'square', 0.05);
    if (step % 8 === 6) pluck(audio, noteFreq(root * 2, scale, (step * 3) % 9), when, beat * 2, 'sine', 0.09);
    if (hue === 'funk' && step % 2 === 1) pluck(audio, noteFreq(root, scale, 3), when, beat * 0.9, 'sawtooth', 0.04);
  }
  // Engine pitch follows speed.
  if (audio.engineOsc) {
    audio.engineOsc.frequency.value = 48 + Math.abs(speed) * 3.2;
    audio.engineGain.gain.value = Math.min(0.06, Math.abs(speed) * 0.0022);
  }
  // Siren swings while wanted.
  if (audio.sirenOsc) {
    const on = wanted > 0;
    audio.sirenGain.gain.value = on ? 0.028 : 0;
    if (on) audio.sirenOsc.frequency.value = 660 + Math.sin(performance.now() / 320) * 140;
  }
}

export function nextStation(audio) {
  audio.station = (audio.station + 1) % RADIO_STATIONS.length;
  audio.musicStep = 0;
  return RADIO_STATIONS[audio.station].name;
}

export function playSfx(audio, kind) {
  if (!ensureCtx(audio) || audio.muted) return;
  const when = audio.ctx.currentTime + 0.01;
  if (kind === 'pickup') {
    pluck(audio, 880, when, 0.18, 'sine', 0.16);
    pluck(audio, 1318, when + 0.09, 0.24, 'sine', 0.14);
  } else if (kind === 'crash') {
    const osc = audio.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.25);
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.25, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    osc.connect(g);
    g.connect(audio.ctx.destination);
    osc.start(when);
    osc.stop(when + 0.32);
  } else if (kind === 'punch') {
    const osc = audio.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, when);
    osc.frequency.exponentialRampToValueAtTime(90, when + 0.08);
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.12, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.connect(g);
    g.connect(audio.ctx.destination);
    osc.start(when);
    osc.stop(when + 0.12);
  } else if (kind === 'cash') {
    pluck(audio, 1046, when, 0.14, 'sine', 0.14);
    pluck(audio, 1568, when + 0.07, 0.2, 'sine', 0.12);
  } else if (kind === 'fail') {
    pluck(audio, 220, when, 0.3, 'sawtooth', 0.08);
    pluck(audio, 175, when + 0.15, 0.4, 'sawtooth', 0.08);
  }
}

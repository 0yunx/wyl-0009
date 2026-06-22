// Audio — Web Audio API with pre-rendered AudioBuffer sound effects.
//
// All SFX are synthesized once into AudioBuffers at init time, so playback
// has zero latency and no per-shot oscillator allocation overhead.
// Music uses a long pre-rendered loop buffer for the same reason.

const SFX_DEFS = {
  shoot: {
    duration: 0.06,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.06);
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / 0.06, 2);
        const phase = (880 * t) % 1;
        const square = phase < 0.5 ? 1 : -1;
        buf[i] = square * env * 0.08;
      }
      return buf;
    },
  },
  hit: {
    duration: 0.4,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.4);
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / 0.4, 1.5);
        const sawPhase = (100 * t) % 1;
        const saw = 2 * sawPhase - 1;
        const sqPhase = (60 * t) % 1;
        const sq = sqPhase < 0.5 ? 1 : -1;
        buf[i] = (saw * 0.55 + sq * 0.45) * env * 0.2;
      }
      return buf;
    },
  },
  explode: {
    duration: 0.4,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.4);
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / 0.4, 2);
        buf[i] = (Math.random() * 2 - 1) * env * 0.28;
      }
      return buf;
    },
  },
  pickup: {
    duration: 0.2,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.2);
      const buf = new Float32Array(n);
      const switchAt = Math.floor(sampleRate * 0.07);
      for (let i = 0; i < n; i++) {
        const tLocal = i < switchAt ? i / sampleRate : (i - switchAt) / sampleRate;
        const dur = i < switchAt ? 0.07 : 0.13;
        const freq = i < switchAt ? 600 : 900;
        const env = Math.pow(1 - tLocal / dur, 1.8);
        const phase = (freq * (i / sampleRate)) % 1;
        const sine = Math.sin(phase * Math.PI * 2);
        const vol = i < switchAt ? 0.18 : 0.14;
        buf[i] = sine * env * vol;
      }
      return buf;
    },
  },
  waveStart: {
    duration: 0.45,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.45);
      const buf = new Float32Array(n);
      const notes = [
        { f: 440, start: 0,    dur: 0.15, vol: 0.12 },
        { f: 550, start: 0.1,  dur: 0.15, vol: 0.10 },
        { f: 660, start: 0.2,  dur: 0.25, vol: 0.10 },
      ];
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        let s = 0;
        for (const note of notes) {
          if (t >= note.start && t < note.start + note.dur) {
            const lt = t - note.start;
            const env = Math.pow(1 - lt / note.dur, 1.5);
            const phase = (note.f * t) % 1;
            s += Math.sin(phase * Math.PI * 2) * env * note.vol;
          }
        }
        buf[i] = s;
      }
      return buf;
    },
  },
  bossAppear: {
    duration: 0.6,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.6);
      const buf = new Float32Array(n);
      const switchAt = Math.floor(sampleRate * 0.15);
      for (let i = 0; i < n; i++) {
        const tLocal = i < switchAt ? i / sampleRate : (i - switchAt) / sampleRate;
        const dur = i < switchAt ? 0.3 : 0.45;
        const freq = i < switchAt ? 200 : 150;
        const env = Math.pow(1 - tLocal / dur, 1.5);
        const phase = (freq * (i / sampleRate)) % 1;
        const saw = 2 * (phase - Math.floor(phase + 0.5));
        buf[i] = saw * env * 0.18;
      }
      return buf;
    },
  },
  combo: {
    duration: 0.08,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.08);
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / 0.08, 2);
        const phase = (800 * t) % 1;
        buf[i] = Math.sin(phase * Math.PI * 2) * env * 0.1;
      }
      return buf;
    },
  },
  shieldBreak: {
    duration: 0.25,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.25);
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const env = Math.pow(1 - t / 0.25, 1.5);
        const p1 = (300 * t) % 1;
        const p2 = (200 * t) % 1;
        const sq1 = p1 < 0.5 ? 1 : -1;
        const sq2 = p2 < 0.5 ? 1 : -1;
        buf[i] = (sq1 * 0.6 + sq2 * 0.4) * env * 0.15;
      }
      return buf;
    },
  },
  playerDeath: {
    duration: 0.65,
    build(sampleRate) {
      const n = Math.floor(sampleRate * 0.65);
      const buf = new Float32Array(n);
      const notes = [
        { f: 440, start: 0,    dur: 0.15, vol: 0.2 },
        { f: 330, start: 0.15, dur: 0.15, vol: 0.2 },
        { f: 220, start: 0.3,  dur: 0.35, vol: 0.2 },
      ];
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        let s = 0;
        for (const note of notes) {
          if (t >= note.start && t < note.start + note.dur) {
            const lt = t - note.start;
            const env = Math.pow(1 - lt / note.dur, 1.2);
            const phase = (note.f * t) % 1;
            const saw = 2 * (phase - Math.floor(phase + 0.5));
            s += saw * env * note.vol;
          }
        }
        buf[i] = s;
      }
      return buf;
    },
  },
};

function _buildMusicBuffer(sampleRate) {
  const dur = 4.0;
  const n = Math.floor(sampleRate * dur);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const phase1 = (55 * t) % 1;
    const phase2 = (82.5 * t) % 1;
    const sine = Math.sin(phase1 * Math.PI * 2);
    const tri = 1 - 4 * Math.abs(Math.round(phase2) - phase2);
    const fadeIn = Math.min(1, t / 0.5);
    buf[i] = (sine * 0.55 + tri * 0.45) * 0.18 * fadeIn;
  }
  return { buffer: buf, duration: dur };
}

export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;
    this._sfxGain = null;
    this._musicGain = null;
    this._musicSource = null;
    this._buffers = {};
    this._musicBuffer = null;
    this._initialized = false;
    this._built = false;
  }

  init() {
    this._ensureCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this._built) {
      this._buildAllBuffers();
    }
  }

  _ensureCtx() {
    if (this._initialized) return;
    this._initialized = true;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._sfxGain = this.ctx.createGain();
    this._sfxGain.gain.value = this.sfxVolume;
    this._sfxGain.connect(this.ctx.destination);
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.18 : 0;
    this._musicGain.connect(this.ctx.destination);
  }

  _buildAllBuffers() {
    if (this._built) return;
    this._built = true;
    const sr = this.ctx.sampleRate;
    for (const [name, def] of Object.entries(SFX_DEFS)) {
      const channelData = def.build(sr);
      const ab = this.ctx.createBuffer(1, channelData.length, sr);
      ab.getChannelData(0).set(channelData);
      this._buffers[name] = ab;
    }
    const { buffer: musicData, duration } = _buildMusicBuffer(sr);
    const mb = this.ctx.createBuffer(1, musicData.length, sr);
    mb.getChannelData(0).set(musicData);
    this._musicBuffer = mb;
    this._musicDuration = duration;
  }

  _playBuffer(name, volScale = 1) {
    if (!this.sfxEnabled || !this._buffers[name]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._buffers[name];
    const gain = this.ctx.createGain();
    gain.gain.value = volScale;
    src.connect(gain);
    gain.connect(this._sfxGain);
    src.start();
  }

  pickup()      { this._playBuffer('pickup'); }
  shoot()       { this._playBuffer('shoot'); }
  hit()         { this._playBuffer('hit'); }
  explode()     { this._playBuffer('explode'); }
  waveStart()   { this._playBuffer('waveStart'); }
  bossAppear()  { this._playBuffer('bossAppear'); }
  combo()       { this._playBuffer('combo'); }
  shieldBreak() { this._playBuffer('shieldBreak'); }
  playerDeath() { this._playBuffer('playerDeath'); }

  startMusic() {
    if (!this.musicEnabled) return;
    this._ensureCtx();
    if (!this._built) this._buildAllBuffers();
    if (this._musicSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._musicBuffer;
    src.loop = true;
    src.connect(this._musicGain);
    src.start();
    this._musicSource = src;
  }

  stopMusic() {
    if (this._musicSource) {
      try { this._musicSource.stop(); } catch {}
      this._musicSource = null;
    }
  }

  updateMusicVolume() {
    if (this._musicGain) {
      this._musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.18 : 0;
    }
  }

  set sfxVolume(v) {
    this._sfxVolumeValue = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }
  get sfxVolume() {
    return this._sfxVolumeValue !== undefined ? this._sfxVolumeValue : 0.7;
  }

  set musicVolume(v) {
    this._musicVolumeValue = v;
    if (this._musicGain && this.musicEnabled) {
      this._musicGain.gain.value = v * 0.18;
    }
  }
  get musicVolume() {
    return this._musicVolumeValue !== undefined ? this._musicVolumeValue : 0.4;
  }
}

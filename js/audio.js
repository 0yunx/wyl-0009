// Audio — Web Audio API with volume control

export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;
    this._musicGain = null;
    this._musicOsc = null;
    this._musicOsc2 = null;
    this._initialized = false;
  }

  _ensureCtx() {
    if (this._initialized) return;
    this._initialized = true;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.value = this.musicVolume * 0.15;
    this._musicGain.connect(this.ctx.destination);
  }

  _tone(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.sfxEnabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const v = volume * this.sfxVolume;
    gain.gain.setValueAtTime(v, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  pickup() {
    this._tone(600, 0.1, 'sine', 0.18);
    setTimeout(() => this._tone(900, 0.12, 'sine', 0.14), 60);
  }

  shoot() {
    this._tone(880, 0.06, 'square', 0.08);
  }

  hit() {
    this._tone(100, 0.3, 'sawtooth', 0.2);
    this._tone(60, 0.4, 'square', 0.15);
  }

  explode() {
    if (!this.sfxEnabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.25 * this.sfxVolume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  waveStart() {
    this._tone(440, 0.15, 'sine', 0.12);
    setTimeout(() => this._tone(550, 0.15, 'sine', 0.10), 100);
    setTimeout(() => this._tone(660, 0.2,  'sine', 0.10), 200);
  }

  bossAppear() {
    this._tone(200, 0.3, 'sawtooth', 0.18);
    setTimeout(() => this._tone(150, 0.4, 'sawtooth', 0.18), 150);
  }

  combo() {
    this._tone(800, 0.08, 'sine', 0.1);
  }

  shieldBreak() {
    this._tone(300, 0.15, 'square', 0.15);
    this._tone(200, 0.2,  'square', 0.1);
  }

  playerDeath() {
    this._tone(440, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this._tone(330, 0.15, 'sawtooth', 0.2), 150);
    setTimeout(() => this._tone(220, 0.3, 'sawtooth', 0.2), 300);
  }

  startMusic() {
    if (!this.musicEnabled) return;
    this._ensureCtx();
    if (this._musicOsc) return;
    this._musicGain.gain.value = this.musicVolume * 0.15;
    this._musicOsc = this.ctx.createOscillator();
    this._musicOsc.type = 'sine';
    this._musicOsc.frequency.value = 55;
    this._musicOsc.connect(this._musicGain);
    this._musicOsc.start();
    this._musicOsc2 = this.ctx.createOscillator();
    this._musicOsc2.type = 'triangle';
    this._musicOsc2.frequency.value = 82.5;
    this._musicOsc2.connect(this._musicGain);
    this._musicOsc2.start();
  }

  stopMusic() {
    if (this._musicOsc) { this._musicOsc.stop(); this._musicOsc = null; }
    if (this._musicOsc2) { this._musicOsc2.stop(); this._musicOsc2 = null; }
  }

  updateMusicVolume() {
    if (this._musicGain) {
      this._musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.15 : 0;
    }
  }

  init() {
    this._ensureCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

// UI — DOM interaction, HUD updates, settings panels, overlays, toasts.
// Pure presentational layer: callers pass data in, UI pushes DOM updates out.
// No game state owned here.

import { getHighScore } from './leaderboard.js';

const LEVEL_DURATION = 60000;

export class UIManager {
  constructor() {
    this._els = {};
  }

  // ====== Element caching ======
  $(id) {
    if (!this._els[id]) this._els[id] = document.getElementById(id);
    return this._els[id];
  }
  qs(sel) { return document.querySelector(sel); }

  // ====== Button binding ======
  // handlers = { onPlay, onSettings, onHelp, onCloseSettings, onCloseHelp,
  //              onPause, onRestartGame, onBackToMenu, onResume, onPauseRestart,
  //              onGoRestart, onGoMenu, onResetHighScore }
  bindButtons(handlers) {
    const click = (id, fn) => { const el = this.$(id); if (el && fn) el.onclick = fn; };
    click('btnPlay',           handlers.onPlay);
    click('btnSettings',       handlers.onSettings);
    click('btnHelp',           handlers.onHelp);
    click('btnCloseSettings',  handlers.onCloseSettings);
    click('btnCloseHelp',      handlers.onCloseHelp);
    click('btnPause',          handlers.onPause);
    click('btnRestartGame',    handlers.onRestartGame);
    click('btnBackToMenu',     handlers.onBackToMenu);
    click('btnResume',         handlers.onResume);
    click('btnPauseRestart',   handlers.onPauseRestart);
    click('btnGoRestart',      handlers.onGoRestart);
    click('btnGoMenu',         handlers.onGoMenu);
    click('btnResetHighScore', handlers.onResetHighScore);
    click('btnResetSettings',  handlers.onResetSettings);
  }

  // ====== Settings binding ======
  // settingsChange = { onSfx(v), onMusic(v), onParticles(v), onShake(v), onShip(v),
  //                    onSfxVolume(v), onMusicVolume(v), onParticleDensity(v),
  //                    onCollisionQuality(v) }
  bindSettings(settings, settingsChange) {
    const sfx        = this.$('settSfx');
    const music      = this.$('settMusic');
    const particles  = this.$('settParticles');
    const shake      = this.$('settShake');
    const ship       = this.$('settShipStyle');
    const collQual   = this.$('settCollisionQuality');

    if (sfx)       { sfx.checked       = settings.sfx;       sfx.onchange       = () => settingsChange.onSfx?.(sfx.checked); }
    if (music)     { music.checked     = settings.music;     music.onchange     = () => settingsChange.onMusic?.(music.checked); }
    if (particles) { particles.checked = settings.particles; particles.onchange = () => settingsChange.onParticles?.(particles.checked); }
    if (shake)     { shake.checked     = settings.shake;     shake.onchange     = () => settingsChange.onShake?.(shake.checked); }
    if (ship)      { ship.value        = settings.shipStyle; ship.onchange      = () => settingsChange.onShip?.(ship.value); }
    if (collQual)  { collQual.value    = settings.collisionQuality || 'auto'; collQual.onchange = () => settingsChange.onCollisionQuality?.(collQual.value); }

    const bindSlider = (id, value, onChange) => {
      const el = this.$(id);
      if (!el) return;
      el.value = value;
      this._updateSliderLabel(el);
      el.oninput = () => {
        const v = parseFloat(el.value);
        this._updateSliderLabel(el);
        onChange?.(v);
      };
    };
    bindSlider('settSfxVolume',       settings.sfxVolume,       v => settingsChange.onSfxVolume?.(v));
    bindSlider('settMusicVolume',     settings.musicVolume,     v => settingsChange.onMusicVolume?.(v));
    bindSlider('settParticleDensity', settings.particleDensity, v => settingsChange.onParticleDensity?.(v));
  }

  // Re-apply settings object values to every DOM control in the panel.
  // Used after "restore defaults" to refresh the UI without re-binding handlers.
  reflectSettingsToControls(settings) {
    const sfx       = this.$('settSfx');
    const music     = this.$('settMusic');
    const particles = this.$('settParticles');
    const shake     = this.$('settShake');
    const ship      = this.$('settShipStyle');
    const collQual  = this.$('settCollisionQuality');
    if (sfx)       sfx.checked       = settings.sfx;
    if (music)     music.checked     = settings.music;
    if (particles) particles.checked = settings.particles;
    if (shake)     shake.checked     = settings.shake;
    if (ship)      ship.value        = settings.shipStyle;
    if (collQual)  collQual.value    = settings.collisionQuality || 'auto';

    const reflectSlider = (id, value) => {
      const el = this.$(id);
      if (!el) return;
      el.value = value;
      this._updateSliderLabel(el);
    };
    reflectSlider('settSfxVolume',       settings.sfxVolume);
    reflectSlider('settMusicVolume',     settings.musicVolume);
    reflectSlider('settParticleDensity', settings.particleDensity);
  }

  _updateSliderLabel(el) {
    const label = el.parentElement?.querySelector('.slider-val');
    if (label) label.textContent = Math.round(parseFloat(el.value) * 100) + '%';
  }

  // ====== Panels / Overlays / Screens ======
  showPanel(id)    { const el = this.$(id); if (el) el.style.display = 'flex'; }
  hidePanel(id)    { const el = this.$(id); if (el) el.style.display = 'none'; }
  showOverlay(id)  { const el = this.$(id); if (el) el.style.display = 'flex'; }
  hideOverlay(id)  { const el = this.$(id); if (el) el.style.display = 'none'; }
  showScreen(id) {
    ['mainMenu', 'gameScreen'].forEach(s => {
      const el = this.$(s);
      if (el) el.style.display = s === id ? 'flex' : 'none';
    });
  }

  // ====== Toasts ======
  showToast(msg, type = '') {
    const container = this.$('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  shakeScreen(power = 6) {
    const wrap = this.$('canvasWrapper');
    if (!wrap) return;
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
  }

  // ====== HUD updates ======
  updateHUD(state) {
    const { score, level, combo, maxCombo, levelTimer, player } = state;
    this._setText('hudScore',      score);
    this._setText('hudWave',       `第 ${level} 关`);
    this._setText('hudHighScore',  getHighScore());
    this._setText('hudCombo',      combo);

    const waveBar = this.$('waveBar');
    if (waveBar) waveBar.style.width = Math.min(100, (levelTimer / LEVEL_DURATION) * 100) + '%';

    const multi = 1 + Math.floor(combo / 5) * 0.5;
    this._setText('hudMultiplier', 'x' + multi.toFixed(1));

    this._updateHpBar(player);
    this._updatePowerupBar(player);
  }

  _setText(id, value) {
    const el = this.$(id);
    if (el) el.textContent = value;
  }

  _updateHpBar(player) {
    let bar = this.$('hpBar');
    if (!bar) {
      const hudLeft = this.qs('.hud-left');
      if (!hudLeft) return;
      const stat = document.createElement('div');
      stat.className = 'hud-stat';
      stat.innerHTML = '<span class="stat-label">生命</span><div id="hpBar" class="hp-bar"></div>';
      hudLeft.appendChild(stat);
      bar = this.$('hpBar');
    }
    if (!bar || !player) return;
    bar.innerHTML = '';
    for (let i = 0; i < player.maxHp; i++) {
      const heart = document.createElement('span');
      heart.className = 'hp-heart' + (i < player.hp ? ' full' : ' empty');
      heart.textContent = i < player.hp ? '❤' : '♡';
      bar.appendChild(heart);
    }
  }

  _updatePowerupBar(player) {
    const bar = this.$('powerupBar');
    if (!bar || !player) return;
    bar.innerHTML = '';
    const items = [
      { key: 'shield',  emoji: '🛡', time: player.shield,             max: 10000, color: '#69f0ae' },
      { key: 'slow',    emoji: '⏳', time: player.timeSlowTime,       max: 6000,  color: '#4ea8ff' },
      { key: 'scatter', emoji: '💥', time: player.scatterLaserTime,   max: 8000,  color: '#ffd54f' },
    ];
    for (const it of items) {
      if (it.time <= 0) continue;
      const pct = Math.max(0, Math.min(100, (it.time / it.max) * 100));
      const secs = (it.time / 1000).toFixed(1) + 's';
      const el = document.createElement('div');
      el.className = 'pu-indicator';
      el.innerHTML = `
        <span class="pu-emoji">${it.emoji}</span>
        <div class="pu-timer"><div class="pu-timer-fill" style="width:${pct}%;background:${it.color}"></div></div>
        <span class="pu-seconds">${secs}</span>
      `;
      bar.appendChild(el);
    }
  }

  setCollisionDegradation(active) {
    const el = this.$('collisionDegradation');
    if (el) el.style.display = active ? 'flex' : 'none';
  }

  // ====== High score display ======
  updateHighScoreDisplay() {
    const hs = getHighScore();
    this._setText('menuHighScore', hs);
    this._setText('hudHighScore',  hs);
  }

  // ====== Game Over screen ======
  showGameOver(entry, isNewHigh) {
    this._setText('goScore',     entry.score);
    this._setText('goTime',      entry.time + 's');
    this._setText('goWave',      entry.level);
    this._setText('goCombo',     entry.maxCombo);
    this._setText('goHighScore', getHighScore());
    this._setText('goKills',     entry.kills);
    this._setText('gameOverTitle', isNewHigh ? '🎉 新纪录！' : '游戏结束');
    this.showOverlay('gameOverOverlay');
  }
}

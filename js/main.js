// Main — Game controller tying all modules together

import Input from './input.js';
import AudioManager from './audio.js';
import Particles from './particles.js';
import Renderer from './renderer.js';
import { Player } from './player.js';
import { SmallMeteor, MediumMeteor, Boss, BossBullet, spawnEnemy } from './enemies.js';
import { createPlayerBullets } from './bullets.js';
import { PowerUp, randomDrop } from './powerups.js';
import {
  getLeaderboard, addToLeaderboard, clearLeaderboard,
  getHighScore, loadSettings, saveSettings
} from './storage.js';

const LEVEL_DURATION = 60000;
const BOSS_INTERVAL = 30000;

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.input = new Input();
    this.audio = new AudioManager();
    this.particles = new Particles();
    this.renderer = new Renderer(this.canvas, this.particles);
    this.W = this.renderer.W;
    this.H = this.renderer.H;

    this.settings = loadSettings();
    this.audio.sfxEnabled = this.settings.sfx;
    this.audio.musicEnabled = this.settings.music;
    this.audio.sfxVolume = this.settings.sfxVolume;
    this.audio.musicVolume = this.settings.musicVolume;
    this.particles.setDensity(this.settings.particles ? this.settings.particleDensity : 0);
    this.renderer.shipStyle = this.settings.shipStyle;

    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.bossBullets = [];
    this.powerUps = [];
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.level = 1;
    this.levelTimer = 0;
    this.bossTimer = 0;
    this.survivalTime = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 1200;
    this.running = false;
    this.paused = false;
    this.gameOver = false;
    this._lastTime = 0;
    this._rafId = null;

    this._bindUI();
    this._updateHighScoreDisplay();
    this._applySettingsToUI();
    this._renderLeaderboardMenu();
  }

  _bindUI() {
    document.getElementById('btnPlay').onclick = () => { this.audio.init(); this.start(); };
    document.getElementById('btnSettings').onclick = () => this._showPanel('settingsPanel');
    document.getElementById('btnHelp').onclick = () => this._showPanel('helpPanel');
    document.getElementById('btnCloseSettings').onclick = () => this._hidePanel('settingsPanel');
    document.getElementById('btnCloseHelp').onclick = () => this._hidePanel('helpPanel');

    document.getElementById('btnPause').onclick = () => this.togglePause();
    document.getElementById('btnRestartGame').onclick = () => { this.stop(); this.start(); };
    document.getElementById('btnBackToMenu').onclick = () => this.backToMenu();
    document.getElementById('btnResume').onclick = () => this.togglePause();
    document.getElementById('btnPauseRestart').onclick = () => { this.paused = false; this._hideOverlay('pauseOverlay'); this.stop(); this.start(); };

    document.getElementById('btnGoRestart').onclick = () => { this._hideOverlay('gameOverOverlay'); this.start(); };
    document.getElementById('btnGoMenu').onclick = () => { this._hideOverlay('gameOverOverlay'); this.backToMenu(); };
    document.getElementById('btnResetHighScore').onclick = () => {
      if (confirm('确定要清除排行榜吗？')) {
        clearLeaderboard();
        this._updateHighScoreDisplay();
        this._renderLeaderboardMenu();
      }
    };

    this._bindSettingsInputs();
  }

  _bindSettingsInputs() {
    const sfx = document.getElementById('settSfx');
    const music = document.getElementById('settMusic');
    const particles = document.getElementById('settParticles');
    const shake = document.getElementById('settShake');
    const ship = document.getElementById('settShipStyle');

    sfx.checked = this.settings.sfx;
    music.checked = this.settings.music;
    particles.checked = this.settings.particles;
    shake.checked = this.settings.shake;
    ship.value = this.settings.shipStyle;

    sfx.onchange = () => { this.settings.sfx = sfx.checked; this.audio.sfxEnabled = sfx.checked; saveSettings(this.settings); };
    music.onchange = () => { this.settings.music = music.checked; this.audio.musicEnabled = music.checked; this.audio.updateMusicVolume(); if (music.checked) this.audio.startMusic(); else this.audio.stopMusic(); saveSettings(this.settings); };
    particles.onchange = () => {
      this.settings.particles = particles.checked;
      this.particles.setDensity(particles.checked ? this.settings.particleDensity : 0);
      saveSettings(this.settings);
    };
    shake.onchange = () => { this.settings.shake = shake.checked; saveSettings(this.settings); };
    ship.onchange = () => { this.settings.shipStyle = ship.value; this.renderer.shipStyle = ship.value; saveSettings(this.settings); };

    const sfxVol = document.getElementById('settSfxVolume');
    const musicVol = document.getElementById('settMusicVolume');
    const partDens = document.getElementById('settParticleDensity');
    if (sfxVol) { sfxVol.value = this.settings.sfxVolume; sfxVol.oninput = () => { this.settings.sfxVolume = parseFloat(sfxVol.value); this.audio.sfxVolume = this.settings.sfxVolume; saveSettings(this.settings); this._updateSliderLabel(sfxVol); }; this._updateSliderLabel(sfxVol); }
    if (musicVol) { musicVol.value = this.settings.musicVolume; musicVol.oninput = () => { this.settings.musicVolume = parseFloat(musicVol.value); this.audio.musicVolume = this.settings.musicVolume; this.audio.updateMusicVolume(); saveSettings(this.settings); this._updateSliderLabel(musicVol); }; this._updateSliderLabel(musicVol); }
    if (partDens) { partDens.value = this.settings.particleDensity; partDens.oninput = () => { this.settings.particleDensity = parseFloat(partDens.value); if (this.settings.particles) this.particles.setDensity(this.settings.particleDensity); saveSettings(this.settings); this._updateSliderLabel(partDens); }; this._updateSliderLabel(partDens); }
  }

  _updateSliderLabel(el) {
    const label = el.parentElement.querySelector('.slider-val');
    if (label) label.textContent = Math.round(parseFloat(el.value) * 100) + '%';
  }

  _applySettingsToUI() {}

  _showPanel(id) { document.getElementById(id).style.display = 'flex'; }
  _hidePanel(id) { document.getElementById(id).style.display = 'none'; }
  _showOverlay(id) { document.getElementById(id).style.display = 'flex'; }
  _hideOverlay(id) { document.getElementById(id).style.display = 'none'; }
  _showScreen(id) {
    ['mainMenu', 'gameScreen'].forEach(s => {
      document.getElementById(s).style.display = s === id ? 'flex' : 'none';
    });
  }

  showToast(msg, type = '') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  start() {
    this.W = this.renderer.W;
    this.H = this.renderer.H;
    this.player = new Player(this.W, this.H);
    this.enemies = [];
    this.bullets = [];
    this.bossBullets = [];
    this.powerUps = [];
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.level = 1;
    this.levelTimer = 0;
    this.bossTimer = BOSS_INTERVAL;
    this.survivalTime = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 1200;
    this.gameOver = false;
    this.paused = false;
    this.particles.clear();
    this.renderer.setLevel(1);
    this._showScreen('gameScreen');
    this._hideOverlay('gameOverOverlay');
    this._hideOverlay('pauseOverlay');
    this.audio.startMusic();
    this.running = true;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.audio.stopMusic();
  }

  backToMenu() {
    this.stop();
    this._showScreen('mainMenu');
    this._updateHighScoreDisplay();
    this._renderLeaderboardMenu();
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this._showOverlay('pauseOverlay');
    } else {
      this._hideOverlay('pauseOverlay');
      this._lastTime = performance.now();
      this._loop(this._lastTime);
    }
  }

  _loop(now) {
    if (!this.running) return;
    if (this.paused) return;
    const dt = Math.min(50, now - this._lastTime);
    this._lastTime = now;
    this._update(dt);
    this._render();
    this.input.endFrame();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.survivalTime += dt;
    this.levelTimer += dt;
    this.bossTimer -= dt;

    if (this.input.wasPressed(' ') || this.input.wasPressed('Escape')) {
      this.togglePause();
      return;
    }
    if (this.input.wasPressed('r') || this.input.wasPressed('R')) {
      this.stop(); this.start();
      return;
    }

    this.renderer.W = this.renderer.W;
    this.renderer.H = this.renderer.H;

    // Level progression every 60s
    if (this.levelTimer >= LEVEL_DURATION) {
      this.levelTimer = 0;
      this.level++;
      this.renderer.setLevel(this.level);
      this.audio.waveStart();
      this.showToast(`第 ${this.level} 关！`, 'gold');
      this.enemySpawnInterval = Math.max(350, 1200 - (this.level - 1) * 90);
      for (let i = 0; i < 40; i++) {
        this.particles.emit(
          Math.random() * this.W,
          Math.random() * this.H,
          1,
          { colors: ['#4ea8ff', '#b388ff', '#ffd54f'], speedMin: 1, speedMax: 3, lifeMin: 30, lifeMax: 60, gravity: 0 }
        );
      }
    }

    // Boss every 30s
    if (this.bossTimer <= 0) {
      this.bossTimer = BOSS_INTERVAL;
      if (!this.enemies.some(e => e.type === 'boss')) {
        const boss = new Boss(this.W, this.level);
        this.enemies.push(boss);
        this.audio.bossAppear();
        this.showToast('⚠ 警告：Boss来袭！', 'red');
      }
    }

    // Enemy spawning
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = this.enemySpawnInterval * (0.7 + Math.random() * 0.6);
      const count = 1 + (Math.random() < Math.min(0.4, (this.level - 1) * 0.07) ? 1 : 0);
      for (let i = 0; i < count; i++) {
        this.enemies.push(spawnEnemy(this));
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Player
    if (this.player && !this.player.dead) {
      this.player.update(dt, this.input, this);
    }

    // Bullets
    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter(b => !b.dead && b.y > -20 && b.x > -20 && b.x < this.W + 20);

    // Enemies
    for (const e of this.enemies) e.update(dt, this);
    for (const e of this.enemies) {
      if (e.type === 'boss') continue;
      if (e.x < -e.size) e.vx = Math.abs(e.vx);
      if (e.x + e.size > this.W) e.vx = -Math.abs(e.vx);
    }

    // Boss bullets
    for (const b of this.bossBullets) b.update(dt, this);
    this.bossBullets = this.bossBullets.filter(b => !b.dead);

    // Power-ups
    for (const pu of this.powerUps) pu.update(dt, this);
    this.powerUps = this.powerUps.filter(p => !p.dead);

    // Particles
    this.particles.update(dt);
    this.renderer.updateStars(1.5 + this.level * 0.3, dt);

    // Collisions
    this._collide();

    // Clean dead enemies (after processing onDestroy)
    this.enemies = this.enemies.filter(e => !e.dead);

    // Update HUD
    this._updateHUD();
  }

  _collide() {
    if (!this.player || this.player.dead) return;
    const p = this.player;
    const pCx = p.x + p.w / 2;
    const pCy = p.y + p.h / 2;
    const pR = Math.min(p.w, p.h) * 0.4;

    // Player bullets vs enemies
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || e.type === 'bossBullet') continue;
        const ex = e.x + e.size / 2;
        const ey = e.y + e.size / 2;
        const er = e.size * 0.42;
        const dx = b.x - ex;
        const dy = b.y - ey;
        if (dx * dx + dy * dy < er * er) {
          b.dead = true;
          const killed = e.hit(1);
          this.particles.emit(b.x, b.y, 6, { color: '#ffcc00', speedMin: 0.5, speedMax: 2, lifeMin: 10, lifeMax: 25, gravity: 0 });
          if (killed) {
            this._onEnemyKilled(e);
          }
          break;
        }
      }
    }

    // Player vs enemies
    for (const e of this.enemies) {
      if (e.dead || e.type === 'bossBullet') continue;
      if (e.type === 'boss' && !e.entered) continue;
      const ex = e.x + e.size / 2;
      const ey = e.y + e.size / 2;
      const er = e.size * (e.type === 'boss' ? 0.38 : 0.4);
      const dx = pCx - ex;
      const dy = pCy - ey;
      if (dx * dx + dy * dy < (er + pR) * (er + pR)) {
        const damaged = p.takeDamage(this);
        if (damaged && this.settings.shake) this._shakeScreen();
        if (e.type !== 'boss') {
          this.particles.emit(ex, ey, 20, { colors: ['#ff6600', '#ffcc00', '#ff3300'], speedMin: 1, speedMax: 4, lifeMin: 20, lifeMax: 50 });
          e.dead = true;
          if (e.onDestroy) e.onDestroy(this);
        }
        break;
      }
    }

    // Player vs boss bullets
    for (const b of this.bossBullets) {
      if (b.dead) continue;
      const dx = pCx - b.x;
      const dy = pCy - b.y;
      const r = pR + b.size * 0.4;
      if (dx * dx + dy * dy < r * r) {
        b.dead = true;
        const damaged = p.takeDamage(this);
        if (damaged && this.settings.shake) this._shakeScreen();
        this.particles.emit(b.x, b.y, 12, { colors: ['#ff5252', '#ff8a80', '#fff'], speedMin: 1, speedMax: 3, lifeMin: 15, lifeMax: 35, gravity: 0 });
        break;
      }
    }

    // Player vs power-ups
    for (const pu of this.powerUps) {
      if (pu.dead) continue;
      const px = pu.x + pu.size / 2;
      const py = pu.y + pu.size / 2;
      const dx = pCx - px;
      const dy = pCy - py;
      const r = pR + pu.size * 0.45;
      if (dx * dx + dy * dy < r * r) {
        pu.dead = true;
        pu.apply(p, this);
        this.audio.pickup();
        this.particles.emit(px, py, 18, { color: PowerUp.getColor(pu.type), speedMin: 0.5, speedMax: 2.5, lifeMin: 20, lifeMax: 45, gravity: 0 });
      }
    }

    // Check game over
    if (this.player.dead && !this.gameOver) {
      this._onGameOver();
    }
  }

  _onEnemyKilled(e) {
    this.kills++;
    this.combo++;
    this.comboTimer = 2500;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = 1 + Math.floor(this.combo / 5) * 0.5;
    this.score += Math.floor(e.scoreValue * multiplier);
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.audio.combo();
      this.showToast(`${this.combo} 连击！`, 'gold');
    }

    const ex = e.x + e.size / 2;
    const ey = e.y + e.size / 2;
    const colors = e.type === 'boss'
      ? ['#ff1744', '#ff5252', '#ff8a80', '#ffd54f']
      : ['#ff6600', '#ffcc00', '#ff3300'];
    this.particles.emit(ex, ey, e.type === 'boss' ? 80 : (e.type === 'medium' ? 30 : 16), {
      colors, speedMin: 1, speedMax: e.type === 'boss' ? 6 : 4,
      lifeMin: 20, lifeMax: e.type === 'boss' ? 70 : 50
    });
    this.audio.explode();
    if (this.settings.shake && e.type === 'boss') this._shakeScreen(12);
    else if (this.settings.shake && e.type === 'medium') this._shakeScreen(4);

    if (e.onDestroy) e.onDestroy(this);

    if (Math.random() < e.dropChance) {
      const type = randomDrop();
      this.powerUps.push(new PowerUp(ex - 14, ey - 14, type));
    }
  }

  _shakeScreen(power = 6) {
    const wrap = document.getElementById('canvasWrapper');
    if (!wrap) return;
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
  }

  playerShoot(player) {
    const newBullets = createPlayerBullets(player);
    this.bullets.push(...newBullets);
    this.audio.shoot();
  }

  spawnBossBullet(boss) {
    if (!this.player || this.player.dead) return;
    const bx = boss.x + boss.size / 2;
    const by = boss.y + boss.size * 0.7;
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    this.bossBullets.push(new BossBullet(bx, by, px, py, this.level));
  }

  emitExplosion(x, y, count = 30) {
    this.particles.emit(x, y, count, {
      colors: ['#ff6600', '#ffcc00', '#ff3300', '#fff'],
      speedMin: 1, speedMax: 5, lifeMin: 25, lifeMax: 60
    });
  }
  emitDamage(x, y) {
    this.particles.emit(x, y, 15, { color: '#ff5252', speedMin: 0.5, speedMax: 2.5, lifeMin: 15, lifeMax: 35, gravity: 0 });
  }
  emitShieldBreak(x, y) {
    this.particles.emit(x, y, 25, { color: '#69f0ae', speedMin: 1, speedMax: 3, lifeMin: 20, lifeMax: 45, gravity: 0 });
  }

  _updateHUD() {
    document.getElementById('hudScore').textContent = this.score;
    document.getElementById('hudWave').textContent = `第 ${this.level} 关`;
    document.getElementById('hudHighScore').textContent = getHighScore();
    document.getElementById('hudCombo').textContent = this.combo;
    document.getElementById('waveBar').style.width = Math.min(100, (this.levelTimer / LEVEL_DURATION) * 100) + '%';

    const multi = 1 + Math.floor(this.combo / 5) * 0.5;
    document.getElementById('hudMultiplier').textContent = 'x' + multi.toFixed(1);

    this._updatePowerupHUD();
    this._updateHpBar();
  }

  _updateHpBar() {
    let bar = document.getElementById('hpBar');
    if (!bar) {
      const hudLeft = document.querySelector('.hud-left');
      if (!hudLeft) return;
      const stat = document.createElement('div');
      stat.className = 'hud-stat';
      stat.innerHTML = '<span class="stat-label">生命</span><div id="hpBar" class="hp-bar"></div>';
      hudLeft.appendChild(stat);
    }
    bar = document.getElementById('hpBar');
    bar.innerHTML = '';
    if (!this.player) return;
    for (let i = 0; i < this.player.maxHp; i++) {
      const heart = document.createElement('span');
      heart.className = 'hp-heart' + (i < this.player.hp ? ' full' : ' empty');
      heart.textContent = i < this.player.hp ? '❤' : '♡';
      bar.appendChild(heart);
    }
  }

  _updatePowerupHUD() {
    const bar = document.getElementById('powerupBar');
    if (!bar || !this.player) return;
    bar.innerHTML = '';
    const items = [
      { key: 'shield', label: '护盾', emoji: '🛡', time: this.player.shield, max: 10000, color: '#69f0ae' },
      { key: 'slow', label: '减速', emoji: '⏳', time: this.player.timeSlowTime, max: 6000, color: '#4ea8ff' },
      { key: 'scatter', label: '散射', emoji: '💥', time: this.player.scatterLaserTime, max: 8000, color: '#ffd54f' },
    ];
    for (const it of items) {
      if (it.time <= 0) continue;
      const el = document.createElement('div');
      el.className = 'pu-indicator';
      const pct = Math.max(0, Math.min(100, (it.time / it.max) * 100));
      el.innerHTML = `
        <span class="pu-emoji">${it.emoji}</span>
        <div class="pu-timer"><div class="pu-timer-fill" style="width:${pct}%;background:${it.color}"></div></div>
      `;
      bar.appendChild(el);
    }
  }

  _render() {
    this.renderer.render({
      ship: this.player,
      enemies: this.enemies,
      bullets: this.bullets,
      bossBullets: this.bossBullets,
      powerUps: this.powerUps,
    });
  }

  _onGameOver() {
    this.gameOver = true;
    this.stop();
    const timeSec = Math.floor(this.survivalTime / 1000);
    const entry = {
      score: this.score,
      kills: this.kills,
      level: this.level,
      time: timeSec,
      date: new Date().toLocaleDateString(),
    };
    const board = addToLeaderboard(entry);
    const isNewHigh = board[0] && board[0].score === this.score && board[0].time === timeSec;

    document.getElementById('goScore').textContent = this.score;
    document.getElementById('goTime').textContent = timeSec + 's';
    document.getElementById('goWave').textContent = this.level;
    document.getElementById('goCombo').textContent = this.maxCombo;
    document.getElementById('goHighScore').textContent = getHighScore();
    document.getElementById('goKills').textContent = this.kills;
    document.getElementById('gameOverTitle').textContent = isNewHigh ? '🎉 新纪录！' : '游戏结束';

    this._renderLeaderboardGameOver();
    this._showOverlay('gameOverOverlay');
  }

  _updateHighScoreDisplay() {
    const hs = getHighScore();
    document.getElementById('menuHighScore').textContent = hs;
    const hh = document.getElementById('hudHighScore');
    if (hh) hh.textContent = hs;
  }

  _renderLeaderboardMenu() {
    this._renderLeaderboardTo('menuLeaderboard');
  }
  _renderLeaderboardGameOver() {
    this._renderLeaderboardTo('gameOverLeaderboard');
  }
  _renderLeaderboardTo(id) {
    const container = document.getElementById(id);
    if (!container) return;
    const board = getLeaderboard();
    if (board.length === 0) {
      container.innerHTML = '<div class="lb-empty">暂无记录</div>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    container.innerHTML = board.map((e, i) => `
      <div class="lb-row">
        <span class="lb-medal">${medals[i]}</span>
        <span class="lb-score">${e.score}</span>
        <span class="lb-detail">${e.level}关 · ${e.time}s · ${e.kills}杀</span>
      </div>
    `).join('');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

// Main — thin game orchestrator.
// Responsibilities: game state, entity lifecycle, wiring modules together,
// running the game loop. Pure logic + coordination only; rendering, UI,
// collision math, leaderboard scoring, and error handling live elsewhere.

import Input          from './input.js';
import AudioManager   from './audio.js';
import Particles      from './particles.js';
import Renderer       from './renderer.js';
import { Player }     from './player.js';
import { SmallMeteor, MediumMeteor, Boss, BossBullet, spawnEnemy } from './enemies.js';
import { createPlayerBullets } from './bullets.js';
import { PowerUp, randomDrop } from './powerups.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './storage.js';
import { runCollisions }   from './collision.js';
import { UIManager }       from './ui.js';
import monitor             from './monitor.js';
import {
  addToLeaderboard, clearLeaderboard, isNewHigh,
  renderLeaderboardTo, getHighScore
} from './leaderboard.js';

const LEVEL_DURATION = 60000;
const BOSS_INTERVAL  = 30000;

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ui       = new UIManager();
    this.input    = new Input();
    this.audio    = new AudioManager();
    this.particles = new Particles();
    this.renderer = new Renderer(this.canvas, this.particles);
    this.W = this.renderer.W;
    this.H = this.renderer.H;

    // Error + perf safety net: install as early as possible
    monitor.install({
      onToast: (msg, type) => this.ui.showToast(msg, type),
    });

    this.settings = loadSettings();
    this._applySettings();

    this._resetState();
    this.running = false;
    this.paused  = false;
    this.gameOver = false;
    this._lastTime = 0;
    this._rafId = null;
    this._collisionQuality = 'high';
    this._fpsSmooth = 60;

    this._bindAllUI();
    this.ui.updateHighScoreDisplay();
    renderLeaderboardTo('menuLeaderboard');
  }

  // ====== Settings wiring ======
  _applySettings() {
    this.audio.sfxEnabled    = this.settings.sfx;
    this.audio.musicEnabled  = this.settings.music;
    this.audio.sfxVolume     = this.settings.sfxVolume;
    this.audio.musicVolume   = this.settings.musicVolume;
    this.particles.setDensity(this.settings.particles ? this.settings.particleDensity : 0);
    this.renderer.shipStyle  = this.settings.shipStyle;
  }

  _resetSettingsToDefault() {
    const changed = JSON.stringify(this.settings) !== JSON.stringify(DEFAULT_SETTINGS);
    if (!changed) {
      this.ui.showToast('已是默认设置', 'gold');
      return;
    }
    const ok = confirm('确定恢复所有设置为默认值？\n不会影响排行榜记录。');
    if (!ok) return;
    this.settings = { ...DEFAULT_SETTINGS };
    saveSettings(this.settings);
    this._applySettings();
    if (this.settings.music) this.audio.startMusic(); else this.audio.stopMusic();
    this.audio.updateMusicVolume();
    this.ui.reflectSettingsToControls(this.settings);
    this.ui.showToast('设置已恢复默认', 'gold');
  }

  // ====== UI wiring ======
  _bindAllUI() {
    this.ui.bindButtons({
      onPlay:           () => { this.audio.init(); this.start(); },
      onSettings:       () => this.ui.showPanel('settingsPanel'),
      onHelp:           () => this.ui.showPanel('helpPanel'),
      onCloseSettings:  () => this.ui.hidePanel('settingsPanel'),
      onCloseHelp:      () => this.ui.hidePanel('helpPanel'),
      onPause:          () => this.togglePause(),
      onRestartGame:    () => { this.stop(); this.start(); },
      onBackToMenu:     () => this.backToMenu(),
      onResume:         () => this.togglePause(),
      onPauseRestart:   () => { this.paused = false; this.ui.hideOverlay('pauseOverlay'); this.stop(); this.start(); },
      onGoRestart:      () => { this.ui.hideOverlay('gameOverOverlay'); this.start(); },
      onGoMenu:         () => { this.ui.hideOverlay('gameOverOverlay'); this.backToMenu(); },
      onResetHighScore: () => {
        if (confirm('确定要清除排行榜吗？')) {
          clearLeaderboard();
          this.ui.updateHighScoreDisplay();
          renderLeaderboardTo('menuLeaderboard');
        }
      },
      onResetSettings: () => this._resetSettingsToDefault(),
    });

    this.ui.bindSettings(this.settings, {
      onSfx:            v => { this.settings.sfx = v; this.audio.sfxEnabled = v; saveSettings(this.settings); },
      onMusic:          v => {
        this.settings.music = v; this.audio.musicEnabled = v;
        this.audio.updateMusicVolume();
        if (v) this.audio.startMusic(); else this.audio.stopMusic();
        saveSettings(this.settings);
      },
      onParticles:      v => {
        this.settings.particles = v;
        this.particles.setDensity(v ? this.settings.particleDensity : 0);
        saveSettings(this.settings);
      },
      onShake:          v => { this.settings.shake = v; saveSettings(this.settings); },
      onShip:           v => { this.settings.shipStyle = v; this.renderer.shipStyle = v; saveSettings(this.settings); },
      onSfxVolume:      v => { this.settings.sfxVolume = v; this.audio.sfxVolume = v; saveSettings(this.settings); },
      onMusicVolume:    v => {
        this.settings.musicVolume = v; this.audio.musicVolume = v;
        this.audio.updateMusicVolume(); saveSettings(this.settings);
      },
      onParticleDensity: v => {
        this.settings.particleDensity = v;
        if (this.settings.particles) this.particles.setDensity(v);
        saveSettings(this.settings);
      },
    });
  }

  // ====== State ======
  _resetState() {
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
  }

  // ====== Lifecycle ======
  start() {
    this.W = this.renderer.W;
    this.H = this.renderer.H;
    this._resetState();
    this.player = new Player(this.W, this.H);
    this.level = 1;
    this.levelTimer = 0;
    this.bossTimer = BOSS_INTERVAL;
    this.gameOver = false;
    this.paused = false;
    this.particles.clear();
    this.renderer.setLevel(1);
    this.ui.showScreen('gameScreen');
    this.ui.hideOverlay('gameOverOverlay');
    this.ui.hideOverlay('pauseOverlay');
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
    this.ui.showScreen('mainMenu');
    this.ui.updateHighScoreDisplay();
    renderLeaderboardTo('menuLeaderboard');
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.ui.showOverlay('pauseOverlay');
    } else {
      this.ui.hideOverlay('pauseOverlay');
      this._lastTime = performance.now();
      this._loop(this._lastTime);
    }
  }

  // ====== Loop ======
  _loop(now) {
    if (!this.running || this.paused) return;
    const dt = Math.min(50, now - this._lastTime);
    this._lastTime = now;
    monitor.tickFrame();

    monitor.safe(() => this._update(dt))();
    monitor.safe(() => this._render())();

    this.input.endFrame();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.survivalTime += dt;
    this.levelTimer   += dt;
    this.bossTimer    -= dt;

    // Global hotkeys
    if (this.input.wasPressed(' ') || this.input.wasPressed('Escape')) { this.togglePause(); return; }
    if (this.input.wasPressed('r') || this.input.wasPressed('R'))        { this.stop(); this.start(); return; }

    // Level progression
    if (this.levelTimer >= LEVEL_DURATION) {
      this.levelTimer = 0;
      this.level++;
      this.renderer.setLevel(this.level);
      this.audio.waveStart();
      this.ui.showToast(`第 ${this.level} 关！`, 'gold');
      this.enemySpawnInterval = Math.max(350, 1200 - (this.level - 1) * 90);
      for (let i = 0; i < 40; i++) {
        this.particles.emit(
          Math.random() * this.W, Math.random() * this.H, 1,
          { colors: ['#4ea8ff', '#b388ff', '#ffd54f'], speedMin: 1, speedMax: 3, lifeMin: 30, lifeMax: 60, gravity: 0 }
        );
      }
    }

    // Boss
    if (this.bossTimer <= 0) {
      this.bossTimer = BOSS_INTERVAL;
      if (!this.enemies.some(e => e.type === 'boss')) {
        const boss = new Boss(this.W, this.level);
        this.enemies.push(boss);
        this.audio.bossAppear();
        this.ui.showToast('⚠ 警告：Boss来袭！', 'red');
      }
    }

    // Enemy spawn
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = this.enemySpawnInterval * (0.7 + Math.random() * 0.6);
      const count = 1 + (Math.random() < Math.min(0.4, (this.level - 1) * 0.07) ? 1 : 0);
      for (let i = 0; i < count; i++) this.enemies.push(spawnEnemy(this));
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Entity updates
    if (this.player && !this.player.dead) this.player.update(dt, this.input, this);
    for (const b of this.bullets)    b.update(dt);
    for (const e of this.enemies)    e.update(dt, this);
    for (const e of this.enemies) {
      if (e.type === 'boss') continue;
      if (e.x < -e.size)                     e.vx =  Math.abs(e.vx);
      if (e.x + e.size > this.W)             e.vx = -Math.abs(e.vx);
    }
    for (const b of this.bossBullets) b.update(dt, this);
    for (const pu of this.powerUps)   pu.update(dt, this);

    // Entity cleanup
    this.bullets     = this.bullets.filter(b => !b.dead && b.y > -20 && b.x > -20 && b.x < this.W + 20);
    this.bossBullets = this.bossBullets.filter(b => !b.dead);
    this.powerUps    = this.powerUps.filter(p => !p.dead);

    this.particles.update(dt);
    this.renderer.updateStars(1.5 + this.level * 0.3, dt);

    // Adaptive collision quality — degrades SAT to circles on slow devices
    this._fpsSmooth = this._fpsSmooth * 0.9 + monitor.fps * 0.1;
    if (this._collisionQuality === 'high' && this._fpsSmooth < 32) {
      this._collisionQuality = 'low';
    } else if (this._collisionQuality === 'low' && this._fpsSmooth > 48) {
      this._collisionQuality = 'high';
    }

    // Collisions — all side effects injected via callbacks
    runCollisions(
      { player: this.player, bullets: this.bullets, enemies: this.enemies,
        bossBullets: this.bossBullets, powerUps: this.powerUps },
      {
        onBulletEnemyHit:   (b, e)  => this._fxBulletHit(b, e),
        onEnemyKilled:      (e)     => this._onEnemyKilled(e),
        onPlayerEnemyHit:   (p, e)  => this._onPlayerEnemyHit(p, e),
        onPlayerBossBulletHit: (p, b) => this._onPlayerBossBulletHit(p, b),
        onPlayerPowerupHit: (p, pu) => this._onPlayerPowerupHit(p, pu),
        onPlayerDead:       ()      => this._onGameOver(),
      },
      { quality: this._collisionQuality }
    );

    this.enemies = this.enemies.filter(e => !e.dead);
    this.ui.updateHUD({
      score: this.score, level: this.level, combo: this.combo,
      maxCombo: this.maxCombo, levelTimer: this.levelTimer, player: this.player,
    });
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

  // ====== Collision callbacks — orchestrate side effects ======
  _fxBulletHit(b) {
    this.particles.emit(b.x, b.y, 6, {
      color: '#ffcc00', speedMin: 0.5, speedMax: 2, lifeMin: 10, lifeMax: 25, gravity: 0,
    });
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
      this.ui.showToast(`${this.combo} 连击！`, 'gold');
    }

    const ex = e.x + e.size / 2;
    const ey = e.y + e.size / 2;
    const colors = e.type === 'boss'
      ? ['#ff1744', '#ff5252', '#ff8a80', '#ffd54f']
      : ['#ff6600', '#ffcc00', '#ff3300'];
    this.particles.emit(ex, ey, e.type === 'boss' ? 80 : (e.type === 'medium' ? 30 : 16), {
      colors, speedMin: 1, speedMax: e.type === 'boss' ? 6 : 4,
      lifeMin: 20, lifeMax: e.type === 'boss' ? 70 : 50,
    });
    this.audio.explode();
    if (this.settings.shake && e.type === 'boss')   this.ui.shakeScreen(12);
    else if (this.settings.shake && e.type === 'medium') this.ui.shakeScreen(4);

    if (e.onDestroy) e.onDestroy(this);

    if (Math.random() < e.dropChance) {
      this.powerUps.push(new PowerUp(ex - 14, ey - 14, randomDrop()));
    }
  }

  _onPlayerEnemyHit(player, e) {
    const damaged = player.takeDamage(this);
    if (damaged && this.settings.shake) this.ui.shakeScreen();
    if (e.type !== 'boss') {
      const ex = e.x + e.size / 2, ey = e.y + e.size / 2;
      this.particles.emit(ex, ey, 20, {
        colors: ['#ff6600', '#ffcc00', '#ff3300'], speedMin: 1, speedMax: 4, lifeMin: 20, lifeMax: 50,
      });
      e.dead = true;
      if (e.onDestroy) e.onDestroy(this);
    }
  }

  _onPlayerBossBulletHit(player, b) {
    const damaged = player.takeDamage(this);
    if (damaged && this.settings.shake) this.ui.shakeScreen();
    this.particles.emit(b.x, b.y, 12, {
      colors: ['#ff5252', '#ff8a80', '#fff'], speedMin: 1, speedMax: 3, lifeMin: 15, lifeMax: 35, gravity: 0,
    });
  }

  _onPlayerPowerupHit(player, pu) {
    pu.apply(player, this);
    this.audio.pickup();
    const px = pu.x + pu.size / 2, py = pu.y + pu.size / 2;
    this.particles.emit(px, py, 18, {
      color: PowerUp.getColor(pu.type), speedMin: 0.5, speedMax: 2.5, lifeMin: 20, lifeMax: 45, gravity: 0,
    });
  }

  // ====== Shooting callbacks used by Player / Boss ======
  playerShoot(player) {
    this.bullets.push(...createPlayerBullets(player));
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

  // ====== Particle helper API used by Player ======
  emitExplosion(x, y, count = 30) {
    this.particles.emit(x, y, count, {
      colors: ['#ff6600', '#ffcc00', '#ff3300', '#fff'],
      speedMin: 1, speedMax: 5, lifeMin: 25, lifeMax: 60,
    });
  }
  emitDamage(x, y) {
    this.particles.emit(x, y, 15, { color: '#ff5252', speedMin: 0.5, speedMax: 2.5, lifeMin: 15, lifeMax: 35, gravity: 0 });
  }
  emitShieldBreak(x, y) {
    this.particles.emit(x, y, 25, { color: '#69f0ae', speedMin: 1, speedMax: 3, lifeMin: 20, lifeMax: 45, gravity: 0 });
  }

  // ====== Game over — post to leaderboard + show summary ======
  _onGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.stop();
    const timeSec = Math.floor(this.survivalTime / 1000);
    const entry = {
      score: this.score, kills: this.kills, level: this.level,
      maxCombo: this.maxCombo, time: timeSec,
    };
    const board = addToLeaderboard(entry);
    const entryWithRank = { ...entry, rankScore: board.find(b => b.score === entry.score && b.time === entry.time)?.rankScore || 0 };
    const topEntry = {
      score: entry.score, kills: entry.kills, level: entry.level,
      maxCombo: entry.maxCombo, time: entry.time,
    };
    const newHigh = isNewHigh(topEntry, board);

    this.ui.showGameOver({ ...entry, maxCombo: this.maxCombo }, newHigh);
    renderLeaderboardTo('gameOverLeaderboard');
    this.ui.updateHighScoreDisplay();
    this.audio.playerDeath();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

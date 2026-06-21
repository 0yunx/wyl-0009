// Player — ship with 4-direction movement, shooting, power-ups

export class Player {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.w = 40;
    this.h = 44;
    this.x = W / 2 - this.w / 2;
    this.y = H - this.h - 40;
    this.speed = 4.5;
    this.hp = 3;
    this.maxHp = 3;
    this.invincible = 0;
    this.shield = 0;
    this.shootCooldown = 0;
    this.shootInterval = 180;
    this.scatterLaserTime = 0;
    this.timeSlowTime = 0;
    this.flash = 0;
    this.dead = false;
  }

  update(dt, input, game) {
    if (this.dead) return;
    const frameScale = dt / 16.67;

    if (input.left)  this.x -= this.speed * frameScale;
    if (input.right) this.x += this.speed * frameScale;
    if (input.up)    this.y -= this.speed * frameScale;
    if (input.down)  this.y += this.speed * frameScale;

    this.x = Math.max(0, Math.min(this.W - this.w, this.x));
    this.y = Math.max(20, Math.min(this.H - this.h - 10, this.y));

    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0) {
      game.playerShoot(this);
      this.shootCooldown = this.shootInterval;
    }

    if (this.invincible > 0) this.invincible -= dt;
    if (this.shield > 0) this.shield -= dt;
    if (this.scatterLaserTime > 0) this.scatterLaserTime -= dt;
    if (this.timeSlowTime > 0) this.timeSlowTime -= dt;
    if (this.flash > 0) this.flash -= dt;
  }

  addShield(duration = 10000) {
    this.shield = Math.max(this.shield, duration);
  }

  addTimeSlow(duration = 6000) {
    this.timeSlowTime = Math.max(this.timeSlowTime, duration);
  }

  addScatterLaser(duration = 8000) {
    this.scatterLaserTime = Math.max(this.scatterLaserTime, duration);
  }

  takeDamage(game) {
    if (this.invincible > 0 || this.dead) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invincible = 1200;
      this.flash = 200;
      game.audio.shieldBreak();
      game.emitShieldBreak(this.x + this.w / 2, this.y + this.h / 2);
      return false;
    }
    this.hp--;
    this.invincible = 1500;
    this.flash = 300;
    game.audio.hit();
    game.emitDamage(this.x + this.w / 2, this.y + this.h / 2);
    if (this.hp <= 0) {
      this.dead = true;
      game.emitExplosion(this.x + this.w / 2, this.y + this.h / 2, 60);
      game.audio.playerDeath();
    }
    return true;
  }

  get hasShield() { return this.shield > 0; }
  get hasScatterLaser() { return this.scatterLaserTime > 0; }
  get hasTimeSlow() { return this.timeSlowTime > 0; }
}

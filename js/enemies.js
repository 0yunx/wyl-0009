// Enemies — small fast meteors, medium splitting meteors, boss with tracking bullets

export class EnemyBase {
  constructor(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level;
    this.dead = false;
    this.rot = 0;
    this.rotSpeed = (Math.random() - 0.5) * 0.08;
    this.hp = 1;
    this.scoreValue = 10;
    this.dropChance = 0.15;
  }
  update(dt, game) {
    this.rot += this.rotSpeed;
  }
  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }
}

export class SmallMeteor extends EnemyBase {
  constructor(x, y, level) {
    super(x, y, 'small', level);
    this.size = 24 + Math.random() * 10;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = 3 + Math.random() * 2 + level * 0.3;
    this.hp = 1;
    this.scoreValue = 15;
    this.dropChance = 0.12;
  }
  update(dt, game) {
    super.update(dt, game);
    const frameScale = dt / 16.67;
    const slow = game.player && game.player.hasTimeSlow ? 0.4 : 1;
    this.x += this.vx * frameScale * slow;
    this.y += this.vy * frameScale * slow;
    if (this.y > game.H + this.size) this.dead = true;
  }
}

export class MediumMeteor extends EnemyBase {
  constructor(x, y, level, fromSplit = false) {
    super(x, y, 'medium', level);
    this.size = 44 + Math.random() * 14;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = 2 + Math.random() * 1.2 + level * 0.2;
    this.hp = fromSplit ? 1 : 3;
    this.scoreValue = 40;
    this.dropChance = 0.22;
    this._fromSplit = fromSplit;
  }
  update(dt, game) {
    super.update(dt, game);
    const frameScale = dt / 16.67;
    const slow = game.player && game.player.hasTimeSlow ? 0.4 : 1;
    this.x += this.vx * frameScale * slow;
    this.y += this.vy * frameScale * slow;
    if (this.y > game.H + this.size) this.dead = true;
  }
  onDestroy(game) {
    if (this._fromSplit) return;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 10;
      const m = new MediumMeteor(
        cx - this.size / 4 + Math.cos(angle) * dist,
        cy - this.size / 4 + Math.sin(angle) * dist,
        this.level,
        true
      );
      m.size = this.size * 0.45;
      m.vx = Math.cos(angle) * 2.5 + (Math.random() - 0.5);
      m.vy = Math.sin(angle) * 2.5 + 1.5;
      m.hp = 1;
      m.scoreValue = 15;
      m.dropChance = 0.05;
      game.enemies.push(m);
    }
  }
}

export class Boss extends EnemyBase {
  constructor(W, level) {
    super(W / 2 - 60, -140, 'boss', level);
    this.W = W;
    this.size = 120;
    this.hp = 40 + level * 15;
    this.maxHp = this.hp;
    this.scoreValue = 500;
    this.dropChance = 1.0;
    this.targetY = 70;
    this.moveDir = 1;
    this.shootTimer = 1500;
    this.shootInterval = Math.max(900, 1800 - level * 80);
    this.entered = false;
  }
  update(dt, game) {
    super.update(dt, game);
    const frameScale = dt / 16.67;
    const slow = game.player && game.player.hasTimeSlow ? 0.4 : 1;

    if (!this.entered) {
      this.y += 1.2 * frameScale * slow;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.entered = true;
      }
    } else {
      this.x += 1.5 * this.moveDir * frameScale * slow;
      if (this.x <= 10) this.moveDir = 1;
      if (this.x + this.size >= this.W - 10) this.moveDir = -1;

      this.shootTimer -= dt * slow;
      if (this.shootTimer <= 0 && game.player && !game.player.dead) {
        this.shootTimer = this.shootInterval;
        game.spawnBossBullet(this);
      }
    }
  }
}

export class BossBullet {
  constructor(x, y, targetX, targetY, level) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.size = 14;
    this.speed = 2.8 + level * 0.15;
    this._targetX = targetX;
    this._targetY = targetY;
    this._trackingTime = 1800;
    this._trackingTotal = 1800;
    this._warningTime = 600;
    this._turnRateMin = 0.012;
    this._turnRateMax = 0.09;
    this.dead = false;
    const dx = targetX - x;
    const dy = targetY - y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / d) * this.speed;
    this.vy = (dy / d) * this.speed;
    this.type = 'bossBullet';
  }
  update(dt, game) {
    const frameScale = dt / 16.67;
    const slow = game.player && game.player.hasTimeSlow ? 0.4 : 1;

    if (this._warningTime > 0) {
      this._warningTime -= dt * slow;
      if (game.player && !game.player.dead) {
        const px = game.player.x + game.player.w / 2;
        const py = game.player.y + game.player.h / 2;
        this._targetX = px;
        this._targetY = py;
        const dx = px - this.x;
        const dy = py - this.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / d) * this.speed;
        this.vy = (dy / d) * this.speed;
      }
      return;
    }

    this._trackingTime -= dt;
    if (this._trackingTime > 0 && game.player && !game.player.dead) {
      const px = game.player.x + game.player.w / 2;
      const py = game.player.y + game.player.h / 2;
      const dx = px - this.x;
      const dy = py - this.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetVx = (dx / d) * this.speed;
      const targetVy = (dy / d) * this.speed;
      const progress = 1 - Math.max(0, this._trackingTime / this._trackingTotal);
      const turnRate = this._turnRateMin + (this._turnRateMax - this._turnRateMin) * Math.pow(progress, 1.5);
      this.vx += (targetVx - this.vx) * turnRate;
      this.vy += (targetVy - this.vy) * turnRate;
    }
    this.x += this.vx * frameScale * slow;
    this.y += this.vy * frameScale * slow;
    if (this.x < -30 || this.x > game.W + 30 || this.y < -30 || this.y > game.H + 30) {
      this.dead = true;
    }
  }
  get isWarning() { return this._warningTime > 0; }
  get warningTarget() { return { x: this._targetX, y: this._targetY }; }
}

export function spawnEnemy(game) {
  const W = game.W;
  const level = game.level;
  const r = Math.random();
  const mediumChance = Math.min(0.35, 0.1 + level * 0.03);
  if (r < mediumChance) {
    return new MediumMeteor(Math.random() * (W - 60) + 10, -60, level);
  }
  return new SmallMeteor(Math.random() * (W - 40) + 10, -40, level);
}

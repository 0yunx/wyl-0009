// Particles — lightweight particle system with density control

export default class Particles {
  constructor() {
    this.pool = [];
    this.density = 1.0;
  }

  setDensity(d) {
    this.density = Math.max(0.1, Math.min(2.0, d));
  }

  emit(x, y, count, opts = {}) {
    if (this.density < 0.15) return;
    const adjustedCount = Math.max(1, Math.floor(count * this.density));
    const {
      color = '#fff',
      speedMin = 1,
      speedMax = 4,
      lifeMin = 20,
      lifeMax = 50,
      sizeMin = 1.5,
      sizeMax = 4,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
      gravity = 0.04,
      colors,
    } = opts;

    for (let i = 0; i < adjustedCount; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      this.pool.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        maxLife: 0,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: colors ? colors[Math.floor(Math.random() * colors.length)] : color,
        gravity,
      });
      this.pool[this.pool.length - 1].maxLife = this.pool[this.pool.length - 1].life;
    }
  }

  update(dt) {
    const frameScale = dt / 16.67;
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= frameScale;
      if (p.life <= 0) {
        this.pool.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * frameScale;
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
    }
  }

  draw(ctx) {
    for (const p of this.pool) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.length = 0;
  }
}

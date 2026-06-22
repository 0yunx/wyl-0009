// Renderer — all canvas drawing with level backgrounds

const LEVEL_THEMES = [
  { bg1: '#070b18', bg2: '#0c1025', bg3: '#0a0818', star: '#ffffff', nebula: 'rgba(20, 60, 120, 0.4)' },
  { bg1: '#1a0820', bg2: '#2a0c35', bg3: '#150418', star: '#ffd6ff', nebula: 'rgba(140, 40, 160, 0.35)' },
  { bg1: '#082015', bg2: '#0a3025', bg3: '#041008', star: '#aaffcc', nebula: 'rgba(30, 160, 100, 0.3)' },
  { bg1: '#201008', bg2: '#351a0c', bg3: '#180804', star: '#ffddaa', nebula: 'rgba(200, 100, 30, 0.35)' },
  { bg1: '#081828', bg2: '#0c2540', bg3: '#041018', star: '#cce7ff', nebula: 'rgba(60, 120, 200, 0.4)' },
  { bg1: '#18081a', bg2: '#2a0c20', bg3: '#0e0410', star: '#ffbbee', nebula: 'rgba(180, 50, 120, 0.35)' },
];

export default class Renderer {
  constructor(canvas, particles) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particles;
    this.W = 0;
    this.H = 0;
    this.stars = [];
    this.flashAlpha = 0;
    this.shipStyle = 'classic';
    this.levelTheme = LEVEL_THEMES[0];
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  setLevel(level) {
    this.levelTheme = LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];
  }

  _resize() {
    const wrapper = document.getElementById('canvasWrapper');
    if (!wrapper) return;
    const maxW = Math.min(520, window.innerWidth - 24);
    const maxH = Math.min(700, window.innerHeight - 160);
    const aspect = 520 / 700;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    this.W = Math.floor(w);
    this.H = Math.floor(h);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this._initStars();
  }

  _initStars() {
    const count = Math.floor((this.W * this.H) / 3000);
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: 0.3 + Math.random() * 1.3,
        depth: 0.2 + Math.random() * 0.8,
      });
    }
  }

  updateStars(speedFactor, dt) {
    const frameScale = dt / 16.67;
    for (const s of this.stars) {
      s.y += s.depth * speedFactor * 0.5 * frameScale;
      if (s.y > this.H) {
        s.y = -2;
        s.x = Math.random() * this.W;
      }
    }
  }

  flash(a = 0.6) {
    this.flashAlpha = a;
  }

  drawBackground() {
    const { ctx, W, H } = this;
    if (W <= 0 || H <= 0) return;
    const t = this.levelTheme;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, t.bg1);
    grad.addColorStop(0.5, t.bg2);
    grad.addColorStop(1, t.bg3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Nebula glow
    const nebR = Math.max(10, W * 0.7);
    const nebula = ctx.createRadialGradient(W * 0.5, H * 0.3, 1, W * 0.5, H * 0.3, nebR);
    nebula.addColorStop(0, t.nebula);
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);
  }

  drawStars() {
    const { ctx } = this;
    ctx.fillStyle = this.levelTheme.star;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.25 + s.depth * 0.45;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawShip(ship) {
    const { ctx } = this;
    const { x, y, w, h, invincible, shield, flash: flashOn } = ship;
    const style = this.shipStyle;

    ctx.save();
    if (invincible > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.015) * 0.3;
    }

    // Engine flame
    const flameH = 12 + Math.random() * 10;
    const fGrad = ctx.createLinearGradient(x + w / 2, y + h, x + w / 2, y + h + flameH);
    fGrad.addColorStop(0, '#ffcc00');
    fGrad.addColorStop(0.4, '#ff6600');
    fGrad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.32, y + h);
    ctx.lineTo(x + w * 0.5, y + h + flameH);
    ctx.lineTo(x + w * 0.68, y + h);
    ctx.closePath();
    ctx.fill();

    // Side flames
    const sFlameH = 6 + Math.random() * 5;
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.78);
    ctx.lineTo(x + w * 0.15, y + h * 0.78 + sFlameH);
    ctx.lineTo(x + w * 0.22, y + h * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.78, y + h * 0.78);
    ctx.lineTo(x + w * 0.85, y + h * 0.78 + sFlameH);
    ctx.lineTo(x + w * 0.88, y + h * 0.78);
    ctx.closePath();
    ctx.fill();

    if (style === 'sleek') {
      this._drawSleekShip(ctx, x, y, w, h);
    } else if (style === 'angular') {
      this._drawAngularShip(ctx, x, y, w, h);
    } else {
      this._drawClassicShip(ctx, x, y, w, h);
    }

    if (flashOn > 0) {
      ctx.fillStyle = 'rgba(255,82,82,0.4)';
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    }

    ctx.restore();

    if (shield > 0) {
      const sAlpha = 0.15 + Math.sin(Date.now() * 0.004) * 0.1;
      const sr = Math.max(w, h) * 0.8;
      ctx.save();
      ctx.strokeStyle = `rgba(105, 240, 174, ${sAlpha + 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, sr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(105, 240, 174, ${sAlpha})`;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawClassicShip(ctx, x, y, w, h) {
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h * 0.72);
    ctx.lineTo(x + w * 0.82, y + h);
    ctx.lineTo(x + w * 0.18, y + h);
    ctx.lineTo(x, y + h * 0.72);
    ctx.closePath();
    ctx.fill();
    const cg = ctx.createRadialGradient(x + w / 2, y + h * 0.38, 0, x + w / 2, y + h * 0.38, w * 0.2);
    cg.addColorStop(0, '#e3f2fd');
    cg.addColorStop(1, '#81d4fa');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.38, w * 0.14, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0288d1';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.72);
    ctx.lineTo(x - w * 0.12, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.72);
    ctx.lineTo(x + w + w * 0.12, y + h);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.closePath();
    ctx.fill();
  }

  _drawSleekShip(ctx, x, y, w, h) {
    ctx.fillStyle = '#64b5f6';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.quadraticCurveTo(x + w * 0.9, y + h * 0.4, x + w * 0.85, y + h);
    ctx.lineTo(x + w * 0.15, y + h);
    ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.4, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    const cg = ctx.createRadialGradient(x + w / 2, y + h * 0.35, 0, x + w / 2, y + h * 0.35, w * 0.18);
    cg.addColorStop(0, '#e1f5fe');
    cg.addColorStop(1, '#90caf9');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.12, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawAngularShip(ctx, x, y, w, h) {
    ctx.fillStyle = '#7c4dff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.95, y + h * 0.55);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x + w * 0.05, y + h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b388ff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h * 0.15);
    ctx.lineTo(x + w * 0.65, y + h * 0.45);
    ctx.lineTo(x + w * 0.35, y + h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.55);
    ctx.lineTo(x - w * 0.08, y + h * 0.85);
    ctx.lineTo(x + w * 0.15, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.55);
    ctx.lineTo(x + w + w * 0.08, y + h * 0.85);
    ctx.lineTo(x + w * 0.85, y + h);
    ctx.closePath();
    ctx.fill();
  }

  drawEnemy(e) {
    const { ctx } = this;
    if (e.type === 'bossBullet') {
      this._drawBossBullet(e);
      return;
    }
    ctx.save();
    ctx.translate(e.x + e.size / 2, e.y + e.size / 2);
    ctx.rotate(e.rot);

    const isBoss = e.type === 'boss';
    const isMedium = e.type === 'medium';
    let baseColor1, baseColor2, baseColor3, trailColor;
    if (isBoss) {
      baseColor1 = '#e53935'; baseColor2 = '#b71c1c'; baseColor3 = '#4a0000';
      trailColor = 'rgba(255, 80, 80, 0.6)';
    } else if (isMedium) {
      baseColor1 = '#8d6e63'; baseColor2 = '#5d4037'; baseColor3 = '#3e2723';
      trailColor = 'rgba(255, 140, 40, 0.5)';
    } else {
      baseColor1 = '#ff9800'; baseColor2 = '#e65100'; baseColor3 = '#3e1a00';
      trailColor = 'rgba(255, 180, 60, 0.6)';
    }

    // Fire trail
    const tAlpha = Math.min(1, (e.vy || 2) / 6) * 0.4;
    if (tAlpha > 0.05 && !isBoss) {
      const tg = ctx.createLinearGradient(0, -e.size * 0.3, 0, -e.size * 1.2);
      tg.addColorStop(0, trailColor);
      tg.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-e.size * 0.25, -e.size * 0.2);
      ctx.lineTo(0, -e.size * 1.1);
      ctx.lineTo(e.size * 0.25, -e.size * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(
      -e.size * 0.15, -e.size * 0.15, e.size * 0.08,
      0, 0, e.size / 2
    );
    grad.addColorStop(0, baseColor1);
    grad.addColorStop(0.5, baseColor2);
    grad.addColorStop(1, baseColor3);
    ctx.fillStyle = grad;

    ctx.beginPath();
    const n = isBoss ? 12 : (isMedium ? 9 : 7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = (e.size / 2) * (0.72 + Math.sin(i * 2.7 + e.rot) * 0.28);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(-e.size * 0.12, e.size * 0.08, e.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.size * 0.16, -e.size * 0.1, e.size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    if (isBoss) {
      ctx.strokeStyle = 'rgba(255,82,82,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.size / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(0, 0, e.size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (isBoss && e.maxHp) {
      const barW = e.size * 0.9;
      const barH = 6;
      const bx = e.x + e.size / 2 - barW / 2;
      const by = e.y - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
      ctx.fillStyle = '#4a0000';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
    }
  }

  _drawBossBullet(b) {
    const { ctx } = this;

    if (b.isWarning) {
      const target = b.warningTarget;
      const flash = Math.sin(Date.now() * 0.025) * 0.3 + 0.7;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 60, 60, ${flash * 0.8})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(255, 80, 80, ${flash * 0.6})`;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 200, 200, ${flash})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', target.x, target.y + 1);
      ctx.restore();
      return;
    }

    const cx = b.x;
    const cy = b.y;
    const r = b.size / 2;
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
    glow.addColorStop(0, 'rgba(255,82,82,0.5)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, '#fff');
    core.addColorStop(0.4, '#ff8a80');
    core.addColorStop(1, '#d50000');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBullet(b) {
    const { ctx } = this;
    const isScatter = b.type === 'scatter';
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    if (isScatter) {
      grad.addColorStop(0, '#fff59d');
      grad.addColorStop(1, '#ff6f00');
    } else {
      grad.addColorStop(0, '#e1f5fe');
      grad.addColorStop(1, '#00b0ff');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
    ctx.shadowColor = isScatter ? '#ffd54f' : '#4ea8ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }

  drawPowerUp(pu) {
    const { ctx } = this;
    const cx = pu.x + pu.size / 2;
    const cy = pu.y + pu.size / 2;
    const pulse = 1 + Math.sin(Date.now() * 0.005 + pu.bobOffset) * 0.12;
    const r = (pu.size / 2) * pulse;
    const color = pu.color || { shield: '#69f0ae', slow: '#4ea8ff', scatter: '#ffd54f' }[pu.type] || '#fff';
    const emoji = { shield: '🛡', slow: '⏳', scatter: '💥' }[pu.type] || '?';

    const blinkAlpha = pu.life < 3000 ? (Math.sin(Date.now() * 0.02) * 0.3 + 0.7) : 1;

    ctx.save();
    ctx.globalAlpha = blinkAlpha;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
    glow.addColorStop(0, color + '60');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color + '30';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.floor(pu.size * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(emoji, cx, cy + 1);
    ctx.restore();
  }

  drawFlash() {
    if (this.flashAlpha <= 0) return;
    this.ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.flashAlpha = Math.max(0, this.flashAlpha - 0.04);
  }

  render(state) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this.drawBackground();
    this.drawStars();

    if (state.powerUps) for (const pu of state.powerUps) this.drawPowerUp(pu);
    if (state.bullets) for (const b of state.bullets) this.drawBullet(b);
    if (state.enemies) for (const e of state.enemies) this.drawEnemy(e);
    if (state.bossBullets) for (const b of state.bossBullets) this.drawEnemy(b);
    if (state.ship) this.drawShip(state.ship);
    if (this.particles) this.particles.draw(ctx);
    this.drawFlash();
  }
}

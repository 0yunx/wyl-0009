// Bullets — player bullets and bullet types

export class PlayerBullet {
  constructor(x, y, vx = 0, vy = -9, type = 'normal') {
    this.x = x;
    this.y = y;
    this.w = type === 'scatter' ? 3 : 4;
    this.h = type === 'scatter' ? 10 : 14;
    this.vx = vx;
    this.vy = vy;
    this.dead = false;
    this.damage = 1;
    this.type = type;
  }
  update(dt) {
    const frameScale = dt / 16.67;
    this.x += this.vx * frameScale;
    this.y += this.vy * frameScale;
    if (this.y < -20 || this.x < -20 || this.x > 9999) this.dead = true;
  }
}

export function createPlayerBullets(player) {
  const bullets = [];
  const cx = player.x + player.w / 2;
  const topY = player.y;
  if (player.hasScatterLaser) {
    const angles = [-0.35, -0.18, 0, 0.18, 0.35];
    const speed = 10;
    for (const a of angles) {
      bullets.push(new PlayerBullet(
        cx - 2,
        topY,
        Math.sin(a) * speed,
        -Math.cos(a) * speed,
        'scatter'
      ));
    }
  } else {
    bullets.push(new PlayerBullet(cx - 2, topY, 0, -9, 'normal'));
  }
  return bullets;
}

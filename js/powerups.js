// PowerUps — shield, time slow, scatter laser

const POWERUP_TYPES = ['shield', 'slow', 'scatter'];

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.size = 28;
    this.vy = 1.2;
    this.type = type || POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    this.dead = false;
    this.life = 12000;
    this.bobOffset = Math.random() * Math.PI * 2;
  }
  update(dt, game) {
    const frameScale = dt / 16.67;
    const slow = game.player && game.player.hasTimeSlow ? 0.4 : 1;
    this.y += this.vy * frameScale * slow;
    this.life -= dt;
    if (this.y > game.H + this.size || this.life <= 0) this.dead = true;
  }
  apply(player, game) {
    if (this.type === 'shield') {
      player.addShield(10000);
      game.ui.showToast('护盾已激活！10秒', 'green');
    } else if (this.type === 'slow') {
      player.addTimeSlow(6000);
      game.ui.showToast('时间减速！6秒', 'green');
    } else if (this.type === 'scatter') {
      player.addScatterLaser(8000);
      game.ui.showToast('散射激光！8秒', 'green');
    }
  }
  static getColor(type) {
    return { shield: '#69f0ae', slow: '#4ea8ff', scatter: '#ffd54f' }[type] || '#fff';
  }
  static getEmoji(type) {
    return { shield: '🛡', slow: '⏳', scatter: '💥' }[type] || '?';
  }
  static getName(type) {
    return { shield: '护盾', slow: '时间减速', scatter: '散射激光' }[type] || '道具';
  }
  static getDuration(type) {
    return { shield: 10000, slow: 6000, scatter: 8000 }[type] || 10000;
  }
}

export function randomDrop() {
  return POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
}

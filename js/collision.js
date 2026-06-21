// Collision — pure collision detection, no Game dependency.
// All side effects (particles, audio, state changes) are injected via callbacks,
// making this module independently testable.

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function getPlayerRadius(p) {
  return Math.min(p.w, p.h) * 0.4;
}

export function getEnemyRadius(e) {
  if (e.type === 'boss') return e.size * 0.38;
  return e.size * 0.4;
}

// Execute full collision pass. Callbacks receive raw data so caller decides side effects.
//
// callbacks = {
//   onBulletEnemyHit(bullet, enemy),
//   onEnemyKilled(enemy),
//   onPlayerEnemyHit(player, enemy),
//   onPlayerBossBulletHit(player, bullet),
//   onPlayerPowerupHit(player, powerup),
//   onPlayerDead(player),
// }
//
// Returns nothing; results flow through callbacks.
export function runCollisions(state, callbacks) {
  const { player, bullets, enemies, bossBullets, powerUps } = state;
  if (!player || player.dead) return;

  const pCx = player.x + player.w / 2;
  const pCy = player.y + player.h / 2;
  const pR  = getPlayerRadius(player);

  // 1) Player bullets vs enemies
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead || e.type === 'bossBullet') continue;
      const ex = e.x + e.size / 2;
      const ey = e.y + e.size / 2;
      const er = e.size * 0.42;
      if (circleHit(b.x, b.y, 0, ex, ey, er)) {
        b.dead = true;
        const killed = e.hit(1);
        callbacks.onBulletEnemyHit?.(b, e);
        if (killed) callbacks.onEnemyKilled?.(e);
        break;
      }
    }
  }

  // 2) Player vs enemies
  for (const e of enemies) {
    if (e.dead || e.type === 'bossBullet') continue;
    if (e.type === 'boss' && !e.entered) continue;
    const ex = e.x + e.size / 2;
    const ey = e.y + e.size / 2;
    const er = getEnemyRadius(e);
    if (circleHit(pCx, pCy, pR, ex, ey, er)) {
      callbacks.onPlayerEnemyHit?.(player, e);
      break;
    }
  }

  // 3) Player vs boss bullets
  for (const b of bossBullets) {
    if (b.dead) continue;
    const r = pR + b.size * 0.4;
    if (circleHit(pCx, pCy, 0, b.x, b.y, r)) {
      b.dead = true;
      callbacks.onPlayerBossBulletHit?.(player, b);
      break;
    }
  }

  // 4) Player vs power-ups
  for (const pu of powerUps) {
    if (pu.dead) continue;
    const px = pu.x + pu.size / 2;
    const py = pu.y + pu.size / 2;
    const r  = pR + pu.size * 0.45;
    if (circleHit(pCx, pCy, 0, px, py, r)) {
      pu.dead = true;
      callbacks.onPlayerPowerupHit?.(player, pu);
    }
  }

  // 5) Game over check
  if (player.dead) callbacks.onPlayerDead?.(player);
}

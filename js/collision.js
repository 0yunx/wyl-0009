// Collision — pure collision detection, no Game dependency.
// Uses SAT (Separating Axis Theorem) for convex polygons so ship triangle
// outlines and meteor irregular shapes truly match their visual models.
//
// All side effects (particles, audio, state changes) are injected via callbacks,
// making this module independently testable.

// ========== SAT core ==========

function getAxes(poly) {
  const axes = [];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    const len = Math.sqrt(edge.x * edge.x + edge.y * edge.y) || 1;
    axes.push({ x: -edge.y / len, y: edge.x / len });
  }
  return axes;
}

function projectPolygon(poly, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const proj = p.x * axis.x + p.y * axis.y;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

function overlapOnAxis(polyA, polyB, axis) {
  const a = projectPolygon(polyA, axis);
  const b = projectPolygon(polyB, axis);
  return a.min <= b.max && b.min <= a.max;
}

export function polygonHit(polyA, polyB) {
  const axesA = getAxes(polyA);
  const axesB = getAxes(polyB);
  for (const axis of axesA) {
    if (!overlapOnAxis(polyA, polyB, axis)) return false;
  }
  for (const axis of axesB) {
    if (!overlapOnAxis(polyA, polyB, axis)) return false;
  }
  return true;
}

// ========== Circle helpers (kept for bullets / powerups) ==========

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// ========== Polygon builders ==========

// Player ship polygon — matches the classic triangular silhouette
// (works for all ship styles since the outer bounds are similar)
export function getPlayerPolygon(p) {
  const { x, y, w, h } = p;
  const cx = x + w / 2;
  const top = y;
  const bottom = y + h;
  const leftWing = x;
  const rightWing = x + w;
  const midY = y + h * 0.72;
  const innerWingY = y + h;

  return [
    { x: cx, y: top },
    { x: rightWing, y: midY },
    { x: x + w * 0.82, y: innerWingY },
    { x: x + w * 0.18, y: innerWingY },
    { x: leftWing, y: midY },
  ];
}

// Enemy meteor polygon — irregular n-gon matching render code
// size/2 is the base radius; amplitude matches the 0.72..1.00 scale
// in renderer.js (sin(i * 2.7 + rot) * 0.28)
export function getEnemyPolygon(e) {
  const cx = e.x + e.size / 2;
  const cy = e.y + e.size / 2;
  const n = e.type === 'boss' ? 12 : (e.type === 'medium' ? 9 : 7);
  const rBase = e.size / 2;
  const rot = e.rot || 0;
  const poly = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rBase * (0.72 + Math.sin(i * 2.7 + rot) * 0.28);
    poly.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
    });
  }
  return poly;
}

// Boss bullet / tracking bullet — small circle (still efficient)
export function getBossBulletCircle(b) {
  return { cx: b.x, cy: b.y, r: b.size * 0.4 };
}

// Player bullet — small rectangle approximated as polygon
export function getBulletPolygon(b) {
  const hx = b.w / 2;
  const hy = b.h / 2;
  const cx = b.x;
  const cy = b.y + hy;
  return [
    { x: cx - hx, y: cy - hy },
    { x: cx + hx, y: cy - hy },
    { x: cx + hx, y: cy + hy },
    { x: cx - hx, y: cy + hy },
  ];
}

// Power-up — circle for pickups
export function getPowerupCircle(pu) {
  return { cx: pu.x + pu.size / 2, cy: pu.y + pu.size / 2, r: pu.size * 0.45 };
}

// Circle vs polygon using SAT (treat circle as many-sided polygon for accuracy,
// but here we use the optimized approach: closest vertex + axis to circle center)
export function polygonCircleHit(poly, cx, cy, cr) {
  for (const p of poly) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    if (dx * dx + dy * dy < cr * cr) return true;
  }
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const t = Math.max(0, Math.min(1, ((cx - p1.x) * edgeX + (cy - p1.y) * edgeY) / (edgeX * edgeX + edgeY * edgeY) || 0));
    const closestX = p1.x + t * edgeX;
    const closestY = p1.y + t * edgeY;
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy < cr * cr) return true;
  }
  return false;
}

// ========== Full collision pass ==========
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

  const playerPoly = getPlayerPolygon(player);

  // 1) Player bullets vs enemies
  for (const b of bullets) {
    if (b.dead) continue;
    const bPoly = getBulletPolygon(b);
    for (const e of enemies) {
      if (e.dead || e.type === 'bossBullet') continue;
      if (e.type === 'boss' && !e.entered) continue;
      const ePoly = getEnemyPolygon(e);
      if (polygonHit(bPoly, ePoly)) {
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
    const ePoly = getEnemyPolygon(e);
    if (polygonHit(playerPoly, ePoly)) {
      callbacks.onPlayerEnemyHit?.(player, e);
      break;
    }
  }

  // 3) Player vs boss bullets (skip warning phase)
  for (const b of bossBullets) {
    if (b.dead) continue;
    if (b.isWarning) continue;
    const bc = getBossBulletCircle(b);
    if (polygonCircleHit(playerPoly, bc.cx, bc.cy, bc.r)) {
      b.dead = true;
      callbacks.onPlayerBossBulletHit?.(player, b);
      break;
    }
  }

  // 4) Player vs power-ups
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  const pr  = Math.min(player.w, player.h) * 0.4;
  for (const pu of powerUps) {
    if (pu.dead) continue;
    const puc = getPowerupCircle(pu);
    if (circleHit(pcx, pcy, pr, puc.cx, puc.cy, puc.r)) {
      pu.dead = true;
      callbacks.onPlayerPowerupHit?.(player, pu);
    }
  }

  // 5) Game over check
  if (player.dead) callbacks.onPlayerDead?.(player);
}

// Collision — pure collision detection, no Game dependency.
// Uses SAT (Separating Axis Theorem) for convex polygons, with a broad-phase
// circle quick-reject to keep performance acceptable on mobile.
//
// Auto-degrades to circle-only collision when FPS is low (configurable).
// All side effects are injected via callbacks — independently testable.

// ========== Convex hull (Andrew's monotone chain) ==========

function _cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points) {
  if (points.length <= 1) return points.slice();
  const sorted = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && _cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && _cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

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
  if (polyA.length < 3 || polyB.length < 3) return false;
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

// ========== Circle helpers ==========

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// ========== Polygon builders with caching ==========
// Recompute polygon only when entity position/rotation changes meaningfully.
// Enemies rotate slowly, so we can cache for several frames.

const _polyCache = new WeakMap();
const CACHE_ROT_THRESHOLD = 0.08; // ~4.6 degrees
const CACHE_POS_THRESHOLD = 2;    // pixels

function _getCacheKey(e) { return e; }

export function getPlayerPolygon(p) {
  const cached = _polyCache.get(p);
  if (cached
    && Math.abs(cached.x - p.x) < CACHE_POS_THRESHOLD
    && Math.abs(cached.y - p.y) < CACHE_POS_THRESHOLD) {
    return cached.poly;
  }
  const { x, y, w, h } = p;
  const cx = x + w / 2;
  const top = y;
  const midY = y + h * 0.72;
  const innerWingY = y + h;
  const raw = [
    { x: cx, y: top },
    { x: x + w, y: midY },
    { x: x + w * 0.82, y: innerWingY },
    { x: x + w * 0.18, y: innerWingY },
    { x: x, y: midY },
  ];
  const poly = convexHull(raw);
  _polyCache.set(p, { x: p.x, y: p.y, poly });
  return poly;
}

export function getEnemyPolygon(e) {
  const cached = _polyCache.get(e);
  const cxNow = e.x + e.size / 2;
  const cyNow = e.y + e.size / 2;
  if (cached
    && Math.abs(cached.cx - cxNow) < CACHE_POS_THRESHOLD
    && Math.abs(cached.cy - cyNow) < CACHE_POS_THRESHOLD
    && Math.abs((cached.rot || 0) - (e.rot || 0)) < CACHE_ROT_THRESHOLD) {
    return cached.poly;
  }
  const cx = cxNow;
  const cy = cyNow;
  const n = e.type === 'boss' ? 12 : (e.type === 'medium' ? 9 : 7);
  const rBase = e.size / 2;
  const rot = e.rot || 0;
  const raw = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rBase * (0.72 + Math.sin(i * 2.7 + rot) * 0.28);
    raw.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
    });
  }
  const poly = convexHull(raw);
  _polyCache.set(e, { cx, cy, rot, poly });
  return poly;
}

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

export function getPowerupCircle(pu) {
  return { cx: pu.x + pu.size / 2, cy: pu.y + pu.size / 2, r: pu.size * 0.45 };
}

// Circle-vs-polygon
export function polygonCircleHit(poly, cx, cy, cr) {
  if (poly.length < 3) return false;
  let inside = true;
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
    const cross = (cx - p1.x) * edgeY - (cy - p1.y) * edgeX;
    if (cross > 0) inside = false;
  }
  if (inside) return true;
  return false;
}

// Broad-phase: get bounding circle for quick reject
function _enemyCircle(e) {
  return { cx: e.x + e.size / 2, cy: e.y + e.size / 2, r: e.size * 0.5 };
}

function _playerCircle(p) {
  return { cx: p.x + p.w / 2, cy: p.y + p.h / 2, r: Math.min(p.w, p.h) * 0.55 };
}

function _bulletCircle(b) {
  return { cx: b.x, cy: b.y + b.h / 2, r: Math.max(b.w, b.h) * 0.6 };
}

// ========== Full collision pass ==========
//
// options = {
//   quality: 'high' | 'low'   // high = SAT exact, low = circle only
// }
//
// callbacks = {
//   onBulletEnemyHit(bullet, enemy),
//   onEnemyKilled(enemy),
//   onPlayerEnemyHit(player, enemy),
//   onPlayerBossBulletHit(player, bullet),
//   onPlayerPowerupHit(player, powerup),
//   onPlayerDead(player),
// }

export function runCollisions(state, callbacks, options = {}) {
  const { player, bullets, enemies, bossBullets, powerUps } = state;
  if (!player || player.dead) return;

  const useSat = options.quality !== 'low';

  // 1) Player bullets vs enemies — broad phase circle + narrow SAT
  for (const b of bullets) {
    if (b.dead) continue;
    const bc = _bulletCircle(b);
    for (const e of enemies) {
      if (e.dead || e.type === 'bossBullet') continue;
      if (e.type === 'boss' && !e.entered) continue;
      const ec = _enemyCircle(e);
      if (!circleHit(bc.cx, bc.cy, bc.r, ec.cx, ec.cy, ec.r)) continue;

      let hit = false;
      if (useSat) {
        const bPoly = getBulletPolygon(b);
        const ePoly = getEnemyPolygon(e);
        hit = polygonHit(bPoly, ePoly);
      } else {
        hit = true;
      }

      if (hit) {
        b.dead = true;
        const killed = e.hit(1);
        callbacks.onBulletEnemyHit?.(b, e);
        if (killed) callbacks.onEnemyKilled?.(e);
        break;
      }
    }
  }

  // 2) Player vs enemies — broad phase circle + narrow SAT
  const pc = _playerCircle(player);
  for (const e of enemies) {
    if (e.dead || e.type === 'bossBullet') continue;
    if (e.type === 'boss' && !e.entered) continue;
    const ec = _enemyCircle(e);
    if (!circleHit(pc.cx, pc.cy, pc.r, ec.cx, ec.cy, ec.r)) continue;

    let hit = false;
    if (useSat) {
      const pPoly = getPlayerPolygon(player);
      const ePoly = getEnemyPolygon(e);
      hit = polygonHit(pPoly, ePoly);
    } else {
      hit = true;
    }

    if (hit) {
      callbacks.onPlayerEnemyHit?.(player, e);
      break;
    }
  }

  // 3) Player vs boss bullets — polygon vs circle (skip warning phase)
  for (const b of bossBullets) {
    if (b.dead) continue;
    if (b.isWarning) continue;
    const r = b.size * 0.4;

    let hit = false;
    if (useSat) {
      const pPoly = getPlayerPolygon(player);
      hit = polygonCircleHit(pPoly, b.x, b.y, r);
    } else {
      hit = circleHit(pc.cx, pc.cy, pc.r, b.x, b.y, r);
    }

    if (hit) {
      b.dead = true;
      callbacks.onPlayerBossBulletHit?.(player, b);
      break;
    }
  }

  // 4) Player vs power-ups — circle vs circle (always, both are round)
  const pr  = Math.min(player.w, player.h) * 0.4;
  for (const pu of powerUps) {
    if (pu.dead) continue;
    const puc = getPowerupCircle(pu);
    if (circleHit(pc.cx, pc.cy, pr, puc.cx, puc.cy, puc.r)) {
      pu.dead = true;
      callbacks.onPlayerPowerupHit?.(player, pu);
    }
  }

  // 5) Game over check
  if (player.dead) callbacks.onPlayerDead?.(player);
}

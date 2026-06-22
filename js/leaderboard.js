// Leaderboard — scoring algorithm + storage + rendering + data migration.
//
// CRITICAL DESIGN CONSTRAINT (survival > everything else):
//   Ranking uses rankScore where survival time has absolute dominance.
//   Combo uses LOGARITHMIC scaling with a HARD CAP so even 10,000 combo
//   cannot outrank someone who survived meaningfully longer.
//
// Rank score formula:
//   survivalSec * 30         (core — this IS a survival game, ~66%+ of score)
//   + level * 200            (milestone bonus for actually clearing waves)
//   + kills * 8              (combat credit, but kills also require survival)
//   + min(log2(maxCombo+1) * 10, 60)
//                            (combo style bonus:
//                             5combo = 26pt / 20combo = 44pt / 63combo = 60pt
//                             hard cap at 60 so combo farming can never dominate)
//
// Data versioning:
//   v1 (legacy) — space_survival_leaderboard, simple entries sorted by score
//   v2 (legacy) — space_survival_leaderboard_v2, early rankScore experiment
//   v3 (current) — space_survival_leaderboard_v3, full entry with version field

// Leaderboard is fully self-contained — does NOT depend on storage.js for
// any leaderboard reads/writes. storage.js only handles settings now.
const LB_KEY_V1 = 'space_survival_leaderboard';

const LB_KEY_V3 = 'space_survival_leaderboard_v3';
const LB_KEY_V2 = 'space_survival_leaderboard_v2';
const CURRENT_VERSION = 3;
const COMBO_CAP = 60;

function _sanitizeNum(v, fallback = 0) {
  const n = Number(v);
  return (isFinite(n) && !isNaN(n)) ? n : fallback;
}

function _sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const cleaned = {
    score:     Math.max(0, Math.floor(_sanitizeNum(entry.score, 0))),
    kills:     Math.max(0, Math.floor(_sanitizeNum(entry.kills, 0))),
    level:     Math.max(1, Math.floor(_sanitizeNum(entry.level, 1))),
    maxCombo:  Math.max(0, Math.floor(_sanitizeNum(entry.maxCombo, 0))),
    time:      Math.max(0, Math.floor(_sanitizeNum(entry.time, 0))),
    rankScore: Math.max(0, Math.floor(_sanitizeNum(entry.rankScore, 0))),
    date:      entry.date || '',
    version:   Math.max(1, Math.floor(_sanitizeNum(entry.version, 1))),
  };
  if (cleaned.rankScore === 0 && (cleaned.score > 0 || cleaned.time > 0)) {
    cleaned.rankScore = computeRankScore(cleaned);
  }
  return cleaned;
}

export function computeRankScore(entry) {
  const survival = Math.max(0, _sanitizeNum(entry?.time, 0)) * 30;
  const level    = Math.max(0, _sanitizeNum(entry?.level, 0)) * 200;
  const kills    = Math.max(0, _sanitizeNum(entry?.kills, 0)) * 8;
  const rawCombo = Math.max(0, _sanitizeNum(entry?.maxCombo, 0));
  const combo    = Math.min(Math.log2(rawCombo + 1) * 10, COMBO_CAP);
  return Math.floor(survival + level + kills + combo);
}

function _readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function _migrateV1() {
  let v1 = null;
  try {
    const raw = localStorage.getItem(LB_KEY_V1);
    if (raw) v1 = JSON.parse(raw);
  } catch { v1 = null; }
  if (!v1 || !Array.isArray(v1) || v1.length === 0) return null;
  const migrated = v1
    .map(e => _sanitizeEntry({ ...e, maxCombo: e.maxCombo || 0, version: 1 }))
    .filter(e => e && e.score > 0);
  if (migrated.length === 0) return null;
  migrated.forEach(e => {
    e.rankScore = computeRankScore(e);
    e.version = CURRENT_VERSION;
  });
  migrated.sort((a, b) => b.rankScore - a.rankScore);
  return migrated.slice(0, 5);
}

function _migrateV2() {
  const v2 = _readRaw(LB_KEY_V2);
  if (!v2 || v2.length === 0) return null;
  const migrated = v2
    .map(e => _sanitizeEntry({ ...e, version: 2 }))
    .filter(e => e && (e.score > 0 || e.time > 0));
  if (migrated.length === 0) return null;
  migrated.forEach(e => {
    if (!e.rankScore) e.rankScore = computeRankScore(e);
    e.version = CURRENT_VERSION;
  });
  migrated.sort((a, b) => b.rankScore - a.rankScore);
  return migrated.slice(0, 5);
}

function _tryMigrateAny() {
  const v2 = _migrateV2();
  if (v2 && v2.length > 0) return v2;
  const v1 = _migrateV1();
  if (v1 && v1.length > 0) return v1;
  return null;
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY_V3);
    if (!raw) {
      const migrated = _tryMigrateAny();
      if (migrated && migrated.length > 0) {
        localStorage.setItem(LB_KEY_V3, JSON.stringify(migrated));
        return migrated;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.map(_sanitizeEntry).filter(e => e !== null);
    if (cleaned.some(e => e.version !== CURRENT_VERSION)) {
      cleaned.forEach(e => { e.version = CURRENT_VERSION; });
      localStorage.setItem(LB_KEY_V3, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry) {
  const clean = _sanitizeEntry(entry) || _sanitizeEntry({});
  const rankScore = computeRankScore(clean);
  const fullEntry = {
    ...clean,
    rankScore,
    date: new Date().toLocaleDateString(),
    version: CURRENT_VERSION,
  };
  const board = getLeaderboard();
  board.push(fullEntry);
  board.sort((a, b) => b.rankScore - a.rankScore);
  const top5 = board.slice(0, 5);
  try { localStorage.setItem(LB_KEY_V3, JSON.stringify(top5)); } catch {}
  return top5;
}

export function clearLeaderboard() {
  try { localStorage.removeItem(LB_KEY_V3); } catch {}
  try { localStorage.removeItem(LB_KEY_V2); } catch {}
  try { localStorage.removeItem(LB_KEY_V1); } catch {}
}

export function getHighScore() {
  const board = getLeaderboard();
  if (board.length === 0) return 0;
  return Math.max(0, _sanitizeNum(board[0].score, 0));
}

export function isNewHigh(entry, board) {
  const cleanEntry = _sanitizeEntry(entry) || _sanitizeEntry({});
  if (!board || board.length === 0) return true;
  const entryRank = computeRankScore(cleanEntry);
  const topRank = _sanitizeNum(board[0]?.rankScore, 0) || computeRankScore(board[0]);
  if (entryRank > topRank) return true;
  if (entryRank === topRank) {
    return _sanitizeNum(cleanEntry.score, 0) > _sanitizeNum(board[0]?.score, 0);
  }
  return false;
}

export function renderLeaderboardTo(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const board = getLeaderboard();
  if (board.length === 0) {
    container.innerHTML = '<div class="lb-empty">暂无记录</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  container.innerHTML = board.map((e, i) => {
    const survivalDetail = `${e.level || 1}关 · ${e.time || 0}s · ${e.kills || 0}杀`;
    const comboTag = e.maxCombo > 5 ? `<span class="lb-combo"> ${e.maxCombo}连击</span>` : '';
    return `
      <div class="lb-row">
        <span class="lb-medal">${medals[i]}</span>
        <span class="lb-score">${e.score}</span>
        <span class="lb-detail">${survivalDetail}${comboTag}</span>
      </div>
    `;
  }).join('');
}

export const LB_VERSION = CURRENT_VERSION;

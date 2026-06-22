// Leaderboard — scoring algorithm + storage + rendering.
//
// CRITICAL DESIGN CONSTRAINT (survival > everything else):
//   Ranking uses rankScore where survival time has absolute dominance.
//   Combo uses LOGARITHMIC scaling with a HARD CAP so even 10,000 combo
//   cannot outrank someone who survived meaningfully longer.
//
// Rank score formula:
//   survivalSec * 30         (core — this IS a survival game, 66%+ of score)
//   + level * 200            (milestone bonus for actually clearing waves)
//   + kills * 8              (combat credit, but kills also require survival)
//   + min(log2(maxCombo+1) * 10, 60)
//                            (combo style bonus:
//                             5combo = 26pt / 20combo = 44pt / 63combo = 60pt
//                             hard cap at 60 so combo farming can never dominate)

import { getLeaderboard as rawGet, addToLeaderboard as rawAdd, clearLeaderboard as rawClear } from './storage.js';

const LB_KEY = 'space_survival_leaderboard_v3';

const COMBO_CAP = 60;

export function computeRankScore(entry) {
  const survival = (entry.time  || 0) * 30;
  const level    = (entry.level || 0) * 200;
  const kills    = (entry.kills || 0) * 8;
  const rawCombo = Math.max(0, entry.maxCombo || 0);
  const combo    = Math.min(Math.log2(rawCombo + 1) * 10, COMBO_CAP);
  return Math.floor(survival + level + kills + combo);
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) {
      // Migrate from v1 storage if present
      const v1 = rawGet();
      if (v1 && v1.length > 0) {
        const migrated = v1.map(e => ({ ...e, maxCombo: e.maxCombo || 0, rankScore: computeRankScore(e) }));
        migrated.sort((a, b) => b.rankScore - a.rankScore);
        localStorage.setItem(LB_KEY, JSON.stringify(migrated.slice(0, 5)));
        return migrated.slice(0, 5);
      }
      return [];
    }
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry) {
  const rankScore = computeRankScore(entry);
  const fullEntry = { ...entry, rankScore, date: new Date().toLocaleDateString() };
  const board = getLeaderboard();
  board.push(fullEntry);
  board.sort((a, b) => b.rankScore - a.rankScore);
  const top5 = board.slice(0, 5);
  try { localStorage.setItem(LB_KEY, JSON.stringify(top5)); } catch {}
  return top5;
}

export function clearLeaderboard() {
  try { localStorage.removeItem(LB_KEY); } catch {}
  rawClear();
}

export function getHighScore() {
  const board = getLeaderboard();
  if (board.length === 0) return 0;
  return board[0].score || 0;
}

export function isNewHigh(entry, board) {
  if (!board || board.length === 0) return true;
  const entryRank = computeRankScore(entry);
  const topRank = board[0].rankScore || computeRankScore(board[0]);
  if (entryRank > topRank) return true;
  if (entryRank === topRank) return (entry.score || 0) > (board[0].score || 0);
  return false;
}

// ====== Rendering ======
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

// Storage — localStorage wrapper for leaderboard and settings

const KEYS = {
  LEADERBOARD: 'space_survival_leaderboard',
  SETTINGS:    'space_survival_settings',
  HIGH_SCORE:  'space_survival_high_score',
};

export const DEFAULT_SETTINGS = {
  sfx: true,
  music: true,
  particles: true,
  shake: true,
  shipStyle: 'classic',
  sfxVolume: 0.7,
  musicVolume: 0.4,
  particleDensity: 1.0,
};

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(KEYS.LEADERBOARD);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry) {
  const board = getLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  const top5 = board.slice(0, 5);
  localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(top5));
  return top5;
}

export function clearLeaderboard() {
  localStorage.removeItem(KEYS.LEADERBOARD);
}

export function getHighScore() {
  const board = getLeaderboard();
  if (board.length > 0) return board[0].score;
  return 0;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

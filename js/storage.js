// Storage — localStorage wrapper for settings ONLY.
//
// Leaderboard has its own module (leaderboard.js) with versioning and
// migration logic. This module must NOT write any leaderboard keys —
// doing so would create duplicate / inconsistent data.

const KEYS = {
  SETTINGS: 'space_survival_settings',
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
  collisionQuality: 'auto',
};

// Migrate old settings keys if present (one-time)
function _maybeMigrateSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (raw) return;
    const legacy = {};
    const legacyKeys = ['sfx', 'music', 'particles', 'shake', 'shipStyle', 'sfxVolume', 'musicVolume', 'particleDensity'];
    let foundAny = false;
    for (const k of legacyKeys) {
      const v = localStorage.getItem(`space_survival_${k}`);
      if (v !== null) {
        try { legacy[k] = JSON.parse(v); } catch { legacy[k] = v; }
        foundAny = true;
      }
    }
    if (foundAny) {
      const merged = { ...DEFAULT_SETTINGS, ...legacy };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    }
  } catch {}
}

export function loadSettings() {
  try {
    _maybeMigrateSettings();
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

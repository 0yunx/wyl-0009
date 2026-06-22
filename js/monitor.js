// Monitor — global error safety net + FPS tracking + log persistence.
//
// Catches unhandled errors and promise rejections, shows the user a friendly
// toast instead of letting the console be the only feedback channel.
// Also exposes FPS tracking for optional perf diagnostics.
//
// New in v2:
//   - Persistent error log stored in localStorage (last 50 entries)
//   - Optional anonymous error reporting via configurable endpoint URL
//   - getAllLogs() / clearLogs() public API for diagnostics UI

const LOG_KEY = 'space_survival_error_log_v1';
const MAX_LOGS = 50;

class Monitor {
  constructor() {
    this._fpsFrames = 0;
    this._fpsLast = performance.now();
    this._fps = 60;
    this._errorCount = 0;
    this._lastErrorAt = 0;
    this._installed = false;
    this._toastFn = null;
    this._onErrorCb = null;
    this._reportUrl = null;
    this._reportEnabled = false;
  }

  install({ onToast, onError, reportUrl, enableReport } = {}) {
    if (this._installed) return;
    this._installed = true;
    this._toastFn = onToast || null;
    this._onErrorCb = onError || null;
    if (reportUrl) this._reportUrl = reportUrl;
    if (enableReport !== undefined) this._reportEnabled = !!enableReport;

    window.addEventListener('error', (ev) => {
      this._report(ev.error || ev.message || 'Unknown error', ev.filename, ev.lineno, 'error');
      ev.preventDefault?.();
    });

    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason || 'Unhandled promise rejection'));
      this._report(reason, null, null, 'unhandledrejection');
      ev.preventDefault?.();
    });
  }

  setReportUrl(url) {
    this._reportUrl = url || null;
  }

  setReportEnabled(enabled) {
    this._reportEnabled = !!enabled;
  }

  get reportEnabled() { return this._reportEnabled; }

  safe(fn, fallback = null) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (err) {
        this._report(err);
        return fallback;
      }
    };
  }

  safeAsync(fn, fallback = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        this._report(err);
        return fallback;
      }
    };
  }

  tickFrame() {
    this._fpsFrames++;
    const now = performance.now();
    if (now - this._fpsLast >= 1000) {
      this._fps = Math.round((this._fpsFrames * 1000) / (now - this._fpsLast));
      this._fpsFrames = 0;
      this._fpsLast = now;
    }
  }

  get fps() { return this._fps; }
  get errorCount() { return this._errorCount; }

  getAllLogs() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  clearLogs() {
    try { localStorage.removeItem(LOG_KEY); } catch {}
  }

  _report(err, file, line, type = 'error') {
    this._errorCount++;
    const now = Date.now();

    const entry = this._buildLogEntry(err, file, line, type);
    this._persistLog(entry);

    if (this._reportEnabled && this._reportUrl) {
      this._sendReport(entry).catch(() => {});
    }

    const prefix = `[Monitor #${this._errorCount}]`;
    if (err instanceof Error) {
      console.error(prefix, err);
    } else {
      console.error(prefix, err, file ? `(${file}:${line})` : '');
    }

    if (now - this._lastErrorAt < 4000) return;
    this._lastErrorAt = now;

    const msg = this._friendlyMessage(err);
    this._toastFn?.(msg, 'red');
    this._onErrorCb?.(err, { file, line });
  }

  _buildLogEntry(err, file, line, type) {
    const entry = {
      t: Date.now(),
      type,
      message: err instanceof Error ? err.message : String(err || ''),
      stack: err instanceof Error ? (err.stack || '') : '',
      file: file || '',
      line: line || 0,
      fps: this._fps,
      url: location.href,
      ua: navigator.userAgent,
    };
    return entry;
  }

  _persistLog(entry) {
    try {
      const logs = this.getAllLogs();
      logs.unshift(entry);
      const trimmed = logs.slice(0, MAX_LOGS);
      localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  async _sendReport(entry) {
    if (!this._reportUrl) return;
    const payload = {
      ...entry,
      anon: true,
      game: 'space-survival',
    };
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this._reportUrl, blob);
      } else {
        await fetch(this._reportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch {}
  }

  _friendlyMessage(err) {
    if (!err) return '游戏出现异常，已尝试自动恢复';
    if (err instanceof Error) {
      if (/AudioContext|audio/i.test(err.message)) return '音频初始化受阻，点击页面任意位置启用';
      if (/localStorage|quota/i.test(err.message)) return '本地存储已满，排行榜可能无法保存';
      if (/canvas|webgl|context/i.test(err.message)) return '渲染异常，请刷新页面重试';
    }
    return '游戏出现异常，已尝试自动恢复';
  }
}

export default new Monitor();

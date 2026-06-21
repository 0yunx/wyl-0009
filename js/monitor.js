// Monitor — global error safety net + FPS tracking.
//
// Catches unhandled errors and promise rejections, shows the user a friendly
// toast instead of letting the console be the only feedback channel.
// Also exposes FPS tracking for optional perf diagnostics.

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
  }

  install({ onToast, onError } = {}) {
    if (this._installed) return;
    this._installed = true;
    this._toastFn = onToast || null;
    this._onErrorCb = onError || null;

    window.addEventListener('error', (ev) => {
      this._report(ev.error || ev.message || 'Unknown error', ev.filename, ev.lineno);
      ev.preventDefault?.();
    });

    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason || 'Unhandled promise rejection'));
      this._report(reason, null, null);
      ev.preventDefault?.();
    });
  }

  // Wrap a function so it never throws unhandled. Returns fallback on error.
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

  // Like safe(), but for async functions.
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

  _report(err, file, line) {
    this._errorCount++;
    const now = Date.now();

    // Always log for debugging
    const prefix = `[Monitor #${this._errorCount}]`;
    if (err instanceof Error) {
      console.error(prefix, err);
    } else {
      console.error(prefix, err, file ? `(${file}:${line})` : '');
    }

    // Throttle user-visible toasts to one every 4s max; avoid spam cascades
    if (now - this._lastErrorAt < 4000) return;
    this._lastErrorAt = now;

    const msg = this._friendlyMessage(err);
    this._toastFn?.(msg, 'red');
    this._onErrorCb?.(err, { file, line });
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

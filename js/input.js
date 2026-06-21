// Input — keyboard + touch state manager (4-direction)

export default class Input {
  constructor() {
    this.keys = {};
    this._touchUp = false;
    this._touchDown = false;
    this._touchLeft = false;
    this._touchRight = false;
    this._justPressed = {};

    document.addEventListener('keydown', e => {
      if (!this.keys[e.key]) this._justPressed[e.key] = true;
      this.keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    document.addEventListener('keyup', e => {
      this.keys[e.key] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this._touchUp = this._touchDown = this._touchLeft = this._touchRight = false;
    });

    this._initTouch();
  }

  _initTouch() {
    const map = [
      ['touchUp', '_touchUp'],
      ['touchDown', '_touchDown'],
      ['touchLeft', '_touchLeft'],
      ['touchRight', '_touchRight'],
    ];
    for (const [id, prop] of map) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('touchstart', e => { e.preventDefault(); this[prop] = true; }, { passive: false });
      el.addEventListener('touchend',   e => { e.preventDefault(); this[prop] = false; }, { passive: false });
      el.addEventListener('touchcancel',() => { this[prop] = false; });
      el.addEventListener('mousedown',  () => { this[prop] = true; });
      el.addEventListener('mouseup',    () => { this[prop] = false; });
      el.addEventListener('mouseleave', () => { this[prop] = false; });
    }
  }

  get up()    { return this.keys['ArrowUp']    || this.keys['w'] || this.keys['W'] || this._touchUp; }
  get down()  { return this.keys['ArrowDown']  || this.keys['s'] || this.keys['S'] || this._touchDown; }
  get left()  { return this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A'] || this._touchLeft; }
  get right() { return this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'] || this._touchRight; }

  wasPressed(key) {
    if (this._justPressed[key]) {
      this._justPressed[key] = false;
      return true;
    }
    return false;
  }

  endFrame() {
    this._justPressed = {};
  }

  clear() {
    this.keys = {};
    this._touchUp = this._touchDown = this._touchLeft = this._touchRight = false;
  }
}

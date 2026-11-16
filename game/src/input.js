// input.js — keyboard and mouse state for Emberward.
// Tracks held keys, edge-triggered presses (for dash, pause, upgrade picks)
// and the mouse position mapped into the canvas's logical 1280x720 space.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.mouseX = 640;
    this.mouseY = 300;
    this.mouseDown = false;
    this.mouseClicked = false;
    this._onKeyDown = (event) => {
      const code = event.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) event.preventDefault();
      if (!this.held.has(code)) this.pressed.add(code);
      this.held.add(code);
    };
    this._onKeyUp = (event) => {
      this.held.delete(event.code);
    };
    this._onMouseMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
    };
    this._onMouseDown = (event) => {
      if (event.button !== 0) return;
      this._onMouseMove(event);
      this.mouseDown = true;
      this.mouseClicked = true;
    };
    this._onMouseUp = (event) => {
      if (event.button === 0) this.mouseDown = false;
    };
    this._onBlur = () => {
      this.held.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  /** True while the key is held down. */
  isDown(code) {
    return this.held.has(code);
  }

  /** True only on the frame the key went down. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** True if any of the given codes was pressed this frame. */
  anyPressed(codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  /** True only on the frame the left mouse button went down. */
  wasClicked() {
    return this.mouseClicked;
  }

  /** Movement vector from WASD or arrow keys, normalized. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Clear edge-triggered state at the end of each frame. */
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}

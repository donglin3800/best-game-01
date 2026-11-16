// rng.js — a small seeded random generator (sfc32) and helpers.
// Every random choice in the game flows through one of these so a scene can
// be rebuilt exactly from a seed (used by the screenshot scenes).

export class Rng {
  constructor(seed) {
    // sfc32: four 32-bit words of state, seeded from one number.
    let s = (seed >>> 0) || 0x9e3779b9;
    this.a = s >>> 0;
    this.b = (s ^ 0x85ebca6b) >>> 0;
    this.c = (s ^ 0xc2b2ae35) >>> 0;
    this.d = (s ^ 0x27d4eb2f) >>> 0;
    // Warm the state so the first outputs are already well mixed.
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Next float in [0, 1). */
  next() {
    const sum = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    const out = (sum + this.d) | 0;
    this.c = (this.c + out) | 0;
    return (out >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** A random element of an array. */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Angle in radians, uniform over the circle. */
  angle() {
    return this.next() * Math.PI * 2;
  }
}

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Distance between two points. */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

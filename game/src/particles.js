// particles.js — sparks, embers, shockwave rings, floating score text and
// screen shake. Pure visual feedback: every hit, kill and pickup in the
// game goes through here so actions always answer at once.

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.shakeTime = 0;
    this.shakeStrength = 0;
  }

  /** A burst of glowing dots that fly out and fade. */
  burst(x, y, { count = 12, color = '#ffb347', speed = 220, size = 4, life = 0.5, gravity = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        size: size * (0.6 + Math.random() * 0.8),
        life: life * (0.6 + Math.random() * 0.7),
        age: 0,
        color,
        gravity,
      });
    }
  }

  /** A rising wisp of light, used for lantern ambience and souls. */
  wisp(x, y, color = '#ffd98a') {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 20,
      vy: -30 - Math.random() * 30,
      size: 3 + Math.random() * 3,
      life: 1.4,
      age: 0,
      color,
      gravity: -12,
    });
  }

  /** Floating combat text that rises and fades. */
  floatText(x, y, message, color = '#ffffff', size = 16) {
    this.texts.push({ x, y, message, color, size, age: 0, life: 0.9 });
  }

  /** An expanding ring, used for dashes, deaths and wave starts. */
  ring(x, y, color = '#ffd98a', maxRadius = 90, life = 0.45) {
    this.rings.push({ x, y, color, maxRadius, age: 0, life });
  }

  /** Kick the camera; strength decays over `time` seconds. */
  shake(strength, time = 0.25) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  update(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 2.2 * dt;
      p.vy *= 1 - 2.2 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const t of this.texts) {
      t.age += dt;
      t.y -= 42 * dt;
    }
    this.texts = this.texts.filter((t) => t.age < t.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeStrength = 0;
    }
  }

  /** Current camera offset from shake (0,0 when calm). */
  offset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const s = this.shakeStrength * (this.shakeTime / 0.25);
    return {
      x: (Math.random() - 0.5) * 2 * s,
      y: (Math.random() - 0.5) * 2 * s,
    };
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const t = r.age / r.life;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxRadius * t, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = 1 - t.age / t.life;
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.message, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

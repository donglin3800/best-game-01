// pickups.js — embers: the glowing currency the dark drops when it dies.
// Embers drift toward the warden inside the magnet radius; collecting them
// scores points, and every few embers mend a little of the warden's health.

export class EmberField {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  clear() {
    this.list = [];
  }

  /** Scatter `count` embers around a point. */
  drop(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 26;
      this.list.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        value: 10,
        age: 0,
        life: 14,
      });
    }
  }

  update(dt) {
    const game = this.game;
    const player = game.player;
    const magnet = player.stats.magnet;
    for (const ember of this.list) {
      ember.age += dt;
      ember.life -= dt;
      const dx = player.x - ember.x;
      const dy = player.y - ember.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnet) {
        const pull = 620 * (1 - dist / (magnet + 60));
        ember.vx += (dx / dist) * pull * dt * 4;
        ember.vy += (dy / dist) * pull * dt * 4;
      }
      ember.vx *= 1 - 3 * dt;
      ember.vy *= 1 - 3 * dt;
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (dist < player.radius + 10) {
        ember.life = 0;
        game.onEmberCollected(ember);
      }
    }
    this.list = this.list.filter((e) => e.life > 0);
  }

  draw(ctx, time) {
    for (const ember of this.list) {
      const blink = 0.75 + Math.sin(time * 6 + ember.x * 0.1) * 0.25;
      const fade = Math.min(1, ember.life / 2);
      ctx.globalAlpha = blink * fade;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

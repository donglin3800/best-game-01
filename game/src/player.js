// player.js — the Lantern Warden: movement, aiming, firing, dashing and
// the stats that upgrades improve. The warden is the only thing standing
// between the dark and the Emberheart lantern.

import { clamp } from './rng.js';

export class Warden {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.x = 640;
    this.y = 520;
    this.radius = 18;
    this.aim = -Math.PI / 2;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownLeft = 0;
    this.invulnerableLeft = 0;
    this.hurtFlash = 0;
    this.walkCycle = 0;
    this.stats = {
      maxHp: 100,
      hp: 100,
      speed: 265,
      damage: 12,
      fireRate: 6,
      boltSpeed: 640,
      boltSize: 6,
      multishot: 1,
      pierce: 0,
      dashCooldown: 2.2,
      magnet: 90,
      thorns: 0,
      emberHeal: 5,
    };
  }

  get hp() {
    return this.stats.hp;
  }

  get maxHp() {
    return this.stats.maxHp;
  }

  heal(amount) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  /** Damage the warden; returns false while dashing (invulnerable). */
  takeDamage(amount) {
    if (this.invulnerableLeft > 0 || this.stats.hp <= 0) return false;
    this.stats.hp -= amount;
    this.hurtFlash = 0.35;
    this.game.particles.burst(this.x, this.y, { count: 10, color: '#ff6b6b', speed: 180, life: 0.4 });
    this.game.particles.shake(6, 0.2);
    this.game.sound.playerHurt();
    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.game.onWardenFallen();
    }
    return true;
  }

  update(dt, input) {
    const s = this.stats;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.invulnerableLeft > 0) this.invulnerableLeft -= dt;
    if (this.dashCooldownLeft > 0) this.dashCooldownLeft -= dt;

    // Aim at the mouse.
    this.aim = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // Dash on Space or Shift: a burst of speed plus brief invulnerability.
    const wantDash = input.anyPressed(['Space', 'ShiftLeft', 'ShiftRight']);
    if (wantDash && this.dashCooldownLeft <= 0 && this.dashTimer <= 0) {
      const move = input.moveVector();
      const dir = move.x !== 0 || move.y !== 0 ? move : { x: Math.cos(this.aim), y: Math.sin(this.aim) };
      this.dashDir = dir;
      this.dashTimer = 0.18;
      this.dashCooldownLeft = s.dashCooldown;
      this.invulnerableLeft = Math.max(this.invulnerableLeft, 0.35);
      this.game.particles.ring(this.x, this.y, '#9fe8ff', 70, 0.35);
      this.game.sound.dash();
    }

    let speed = s.speed;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      speed = s.speed * 3.4;
      this.game.particles.wisp(this.x, this.y, '#9fe8ff');
      const dir = this.dashDir || { x: 1, y: 0 };
      this.x += dir.x * speed * dt;
      this.y += dir.y * speed * dt;
    } else {
      const move = input.moveVector();
      this.x += move.x * speed * dt;
      this.y += move.y * speed * dt;
      if (move.x !== 0 || move.y !== 0) this.walkCycle += dt * 10;
    }
    // Stay inside the clearing, outside the lantern's stone ring.
    this.x = clamp(this.x, 30, 1250);
    this.y = clamp(this.y, 30, 690);
    const dx = this.x - this.game.lantern.x;
    const dy = this.y - this.game.lantern.y;
    const d = Math.hypot(dx, dy);
    const minDist = this.game.lantern.radius + this.radius + 2;
    if (d < minDist && d > 0.01) {
      this.x = this.game.lantern.x + (dx / d) * minDist;
      this.y = this.game.lantern.y + (dy / d) * minDist;
    }

    // Hold the mouse button to fire light bolts.
    this.fireTimer -= dt;
    if (input.mouseDown && this.fireTimer <= 0) {
      this.fireTimer = 1 / s.fireRate;
      this.game.bolts.firePlayerBolts(this);
      this.game.sound.shoot();
    }
  }

  draw(ctx, time) {
    const blink = this.invulnerableLeft > 0 && Math.floor(time * 18) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    ctx.translate(this.x, this.y);

    // Cloak: a deep-teal robe that sways with the walk cycle.
    const sway = Math.sin(this.walkCycle) * 2;
    ctx.fillStyle = '#1d5c5c';
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 2);
    ctx.quadraticCurveTo(this.radius + sway, -4, this.radius - 2, this.radius);
    ctx.quadraticCurveTo(0, this.radius + 5, -this.radius + 2, this.radius);
    ctx.quadraticCurveTo(-this.radius - sway, -4, 0, -this.radius - 2);
    ctx.fill();
    ctx.strokeStyle = '#2f8f8f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hood and face glow.
    ctx.fillStyle = '#123f3f';
    ctx.beginPath();
    ctx.arc(0, -4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(2, -5, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Lantern staff, held toward the aim.
    ctx.rotate(this.aim);
    ctx.strokeStyle = '#8a6b3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(30, 0);
    ctx.stroke();
    const glow = 10 + Math.sin(time * 5) * 2;
    const gradient = ctx.createRadialGradient(32, 0, 1, 32, 0, glow + 8);
    gradient.addColorStop(0, 'rgba(255, 220, 130, 0.95)');
    gradient.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 0, glow + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(32, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.hurtFlash > 0) {
      ctx.globalAlpha = this.hurtFlash * 1.6;
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

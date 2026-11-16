// enemies.js — the creatures of the dark: wisps that hunt the warden,
// crawlers and brutes that gnaw at the lantern, spitters that shoot from
// afar, and the Hollow King who ends the tenth wave. Each kind has its own
// movement, target and attack so the player must keep choosing what to stop.

import { clamp, distance } from './rng.js';

export const ENEMY_TYPES = {
  wisp: {
    name: 'Gloom Wisp', hp: 18, speed: 152, radius: 13, damage: 8, score: 50, embers: 1,
    color: '#b78cff', glow: '#8b5cf6', target: 'player', attackCooldown: 0.7,
  },
  crawler: {
    name: 'Shard Crawler', hp: 58, speed: 64, radius: 20, damage: 14, score: 80, embers: 2,
    color: '#7dd3a8', glow: '#34d399', target: 'lantern', attackCooldown: 0.9,
  },
  spitter: {
    name: 'Murkmouth Spitter', hp: 32, speed: 88, radius: 15, damage: 10, score: 100, embers: 2,
    color: '#f472b6', glow: '#ec4899', target: 'player', attackCooldown: 2.2, ranged: true, range: 280,
  },
  brute: {
    name: 'Hollow Brute', hp: 170, speed: 46, radius: 30, damage: 26, score: 200, embers: 4,
    color: '#f59e0b', glow: '#d97706', target: 'lantern', attackCooldown: 1.1,
  },
  boss: {
    name: 'The Hollow King', hp: 980, speed: 56, radius: 48, damage: 30, score: 2000, embers: 20,
    color: '#e5484d', glow: '#991b1b', target: 'player', attackCooldown: 1.0, boss: true,
  },
};

let nextEnemyId = 1;

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  clear() {
    this.list = [];
  }

  /** Spawn one enemy of a kind at a point on the clearing's edge. */
  spawn(type, x, y, wave) {
    const def = ENEMY_TYPES[type];
    const hpScale = 1 + 0.14 * (wave - 1);
    const speedScale = Math.min(1.35, 1 + 0.02 * (wave - 1));
    const enemy = {
      id: nextEnemyId++,
      type,
      def,
      x, y,
      hp: Math.round(def.hp * hpScale),
      maxHp: Math.round(def.hp * hpScale),
      speed: def.speed * speedScale,
      radius: def.radius,
      attackTimer: 0,
      spitTimer: 1.2 + Math.random() * 1.2,
      summonTimer: 5,
      burstTimer: 3.5,
      wobble: Math.random() * Math.PI * 2,
      flash: 0,
      touchTimer: 0,
    };
    this.list.push(enemy);
    this.game.particles.ring(x, y, def.glow, 46, 0.4);
    this.game.particles.burst(x, y, { count: 8, color: def.glow, speed: 120, life: 0.4 });
    return enemy;
  }

  /** Spawn at a random edge point, away from the warden when possible. */
  spawnAtEdge(type, wave) {
    const game = this.game;
    for (let tries = 0; tries < 8; tries++) {
      const side = Math.floor(Math.random() * 4);
      let x;
      let y;
      if (side === 0) { x = 40 + Math.random() * 1200; y = 40; }
      else if (side === 1) { x = 40 + Math.random() * 1200; y = 680; }
      else if (side === 2) { x = 40; y = 40 + Math.random() * 640; }
      else { x = 1240; y = 40 + Math.random() * 640; }
      if (distance(x, y, game.player.x, game.player.y) > 240) return this.spawn(type, x, y, wave);
    }
    return this.spawn(type, 60, 60, wave);
  }

  /** Apply damage; returns true when the enemy dies. */
  damage(enemy, amount) {
    enemy.hp -= amount;
    enemy.flash = 0.12;
    if (enemy.hp <= 0) {
      this.kill(enemy);
      return true;
    }
    return false;
  }

  kill(enemy) {
    const game = this.game;
    this.list = this.list.filter((e) => e !== enemy);
    game.particles.burst(enemy.x, enemy.y, { count: enemy.def.boss ? 46 : 16, color: enemy.def.glow, speed: enemy.def.boss ? 320 : 220, life: 0.6 });
    game.particles.ring(enemy.x, enemy.y, enemy.def.glow, enemy.def.boss ? 160 : 60, 0.5);
    game.particles.shake(enemy.def.boss ? 14 : 3, 0.25);
    game.sound.enemyDie();
    game.onEnemyKilled(enemy);
  }

  update(dt) {
    const game = this.game;
    const player = game.player;
    const lantern = game.lantern;
    for (const enemy of this.list) {
      if (enemy.flash > 0) enemy.flash -= dt;
      if (enemy.attackTimer > 0) enemy.attackTimer -= dt;
      enemy.wobble += dt * 3;
      const target = enemy.def.target === 'lantern' ? lantern : player;
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      if (enemy.def.ranged) {
        // Spitters hold their distance and lob globs at the warden.
        const want = enemy.def.range;
        if (dist > want + 40) {
          enemy.x += nx * enemy.speed * dt;
          enemy.y += ny * enemy.speed * dt;
        } else if (dist < want - 60) {
          enemy.x -= nx * enemy.speed * 0.7 * dt;
          enemy.y -= ny * enemy.speed * 0.7 * dt;
        } else {
          enemy.x += Math.cos(enemy.wobble) * 24 * dt;
          enemy.y += Math.sin(enemy.wobble) * 24 * dt;
        }
        enemy.spitTimer -= dt;
        if (enemy.spitTimer <= 0 && dist < 520) {
          enemy.spitTimer = enemy.def.attackCooldown * (0.9 + Math.random() * 0.3);
          game.bolts.fireEnemyGlob(enemy, player.x, player.y);
          game.particles.burst(enemy.x, enemy.y, { count: 5, color: enemy.def.glow, speed: 90, life: 0.3 });
        }
      } else {
        // Melee kinds close in, weaving slightly so they never march in a line.
        const weave = Math.sin(enemy.wobble) * 0.35;
        const wx = nx + -ny * weave;
        const wy = ny + nx * weave;
        const wl = Math.hypot(wx, wy) || 1;
        enemy.x += (wx / wl) * enemy.speed * dt;
        enemy.y += (wy / wl) * enemy.speed * dt;
      }

      // The boss summons wisps and fires radial bursts as the fight goes on.
      if (enemy.def.boss) {
        enemy.summonTimer -= dt;
        if (enemy.summonTimer <= 0) {
          enemy.summonTimer = 6;
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            this.spawn('wisp', enemy.x + Math.cos(a) * 70, enemy.y + Math.sin(a) * 70, game.wave);
          }
          game.sound.bossRoar();
        }
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = 4.2;
          game.bolts.fireRadialBurst(enemy, 10, 150);
          game.particles.ring(enemy.x, enemy.y, '#ff7b7b', 130, 0.5);
        }
      }

      // Contact attacks: bite the warden, or gnaw the lantern.
      const reach = enemy.radius + target.radius;
      if (dist < reach + 2) {
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.def.attackCooldown;
          if (target === player) {
            player.takeDamage(enemy.def.damage);
          } else {
            game.damageLantern(enemy.def.damage);
          }
        }
        // Thorn aura: touching the warden hurts the dark back.
        if (target === player && player.stats.thorns > 0 && enemy.touchTimer <= 0) {
          enemy.touchTimer = 0.5;
          this.damage(enemy, player.stats.thorns);
        }
      }
      if (enemy.touchTimer > 0) enemy.touchTimer -= dt;

      enemy.x = clamp(enemy.x, 24, 1256);
      enemy.y = clamp(enemy.y, 24, 696);
    }
  }

  draw(ctx, time) {
    for (const enemy of this.list) {
      const def = enemy.def;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      // Outer glow.
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, enemy.radius + 16);
      glow.addColorStop(0, def.glow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.35 + Math.sin(time * 4 + enemy.wobble) * 0.08;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (enemy.type === 'wisp') {
        // A flickering teardrop with a trailing tail.
        const flicker = 1 + Math.sin(time * 9 + enemy.wobble) * 0.12;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, enemy.radius * 0.8 * flicker, enemy.radius * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#efe6ff';
        ctx.beginPath();
        ctx.arc(-3, -2, 3.5, 0, Math.PI * 2);
        ctx.arc(4, -2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1030';
        ctx.beginPath();
        ctx.arc(-3, -2, 1.6, 0, Math.PI * 2);
        ctx.arc(4, -2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'crawler') {
        // A spiky shard that crawls.
        ctx.fillStyle = def.color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + enemy.wobble * 0.2;
          const r = i % 2 === 0 ? enemy.radius : enemy.radius * 0.55;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0b2b1d';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'spitter') {
        // A pulsing bulb with a glowing sac.
        const pulse = 1 + Math.sin(time * 6 + enemy.wobble) * 0.1;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd7ef';
        ctx.beginPath();
        ctx.arc(0, 4, enemy.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d0a26';
        ctx.beginPath();
        ctx.arc(-4, -3, 2, 0, Math.PI * 2);
        ctx.arc(5, -3, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'brute') {
        // A heavy hexagon with glowing cracks.
        ctx.fillStyle = def.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const px = Math.cos(a) * enemy.radius;
          const py = Math.sin(a) * enemy.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-enemy.radius * 0.5, -6);
        ctx.lineTo(0, 2);
        ctx.lineTo(enemy.radius * 0.5, -4);
        ctx.stroke();
        ctx.fillStyle = '#fff7d6';
        ctx.beginPath();
        ctx.arc(-7, -4, 3, 0, Math.PI * 2);
        ctx.arc(7, -4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // The Hollow King: a crowned shadow with burning eyes.
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2b0a0a';
        ctx.beginPath();
        ctx.moveTo(-enemy.radius * 0.7, -enemy.radius * 0.55);
        ctx.lineTo(-enemy.radius * 0.35, -enemy.radius * 1.15);
        ctx.lineTo(0, -enemy.radius * 0.7);
        ctx.lineTo(enemy.radius * 0.35, -enemy.radius * 1.15);
        ctx.lineTo(enemy.radius * 0.7, -enemy.radius * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(-14, -6, 6, 0, Math.PI * 2);
        ctx.arc(14, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0505';
        ctx.beginPath();
        ctx.arc(-14, -6, 2.5, 0, Math.PI * 2);
        ctx.arc(14, -6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // White flash on a fresh hit.
      if (enemy.flash > 0) {
        ctx.globalAlpha = enemy.flash * 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Health bar, only once hurt.
      if (enemy.hp < enemy.maxHp) {
        const w = enemy.radius * 2;
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
        ctx.fillStyle = enemy.def.boss ? '#ff5d5d' : '#ffd166';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * ratio, 5);
      }
    }
  }
}

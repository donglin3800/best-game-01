// projectiles.js — the warden's light bolts and the dark's globs.
// Bolts fly straight, pierce through enemies when upgraded, and burst into
// sparks on impact; globs arc toward the warden or the lantern.

export class BoltPool {
  constructor(game) {
    this.game = game;
    this.bolts = [];
    this.globs = [];
  }

  clear() {
    this.bolts = [];
    this.globs = [];
  }

  /** Fire the warden's bolts in a spread, one per multishot level. */
  firePlayerBolts(player) {
    const s = player.stats;
    const count = s.multishot;
    const spread = 0.14;
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const angle = player.aim + offset;
      this.bolts.push({
        x: player.x + Math.cos(angle) * 34,
        y: player.y + Math.sin(angle) * 34,
        vx: Math.cos(angle) * s.boltSpeed,
        vy: Math.sin(angle) * s.boltSpeed,
        damage: s.damage,
        pierce: s.pierce,
        size: s.boltSize,
        life: 1.1,
        hitIds: new Set(),
      });
    }
    this.game.particles.burst(player.x + Math.cos(player.aim) * 34, player.y + Math.sin(player.aim) * 34, {
      count: 3, color: '#ffe9a8', speed: 90, size: 3, life: 0.25,
    });
  }

  /** A spitter lobs one glob at a target point. */
  fireEnemyGlob(enemy, tx, ty) {
    const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
    const speed = 210;
    this.globs.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: enemy.def.damage,
      size: 8,
      life: 3.2,
    });
  }

  /** The Hollow King's radial burst: globs in every direction. */
  fireRadialBurst(enemy, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      this.globs.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 12,
        size: 8,
        life: 3.5,
      });
    }
  }

  update(dt) {
    const game = this.game;
    for (const bolt of this.bolts) {
      bolt.life -= dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      if (bolt.x < 0 || bolt.x > 1280 || bolt.y < 0 || bolt.y > 720) {
        bolt.life = 0;
        continue;
      }
      for (const enemy of game.enemies.list) {
        if (bolt.hitIds.has(enemy.id)) continue;
        const dx = enemy.x - bolt.x;
        const dy = enemy.y - bolt.y;
        const reach = enemy.radius + bolt.size;
        if (dx * dx + dy * dy < reach * reach) {
          bolt.hitIds.add(enemy.id);
          game.particles.burst(bolt.x, bolt.y, { count: 6, color: '#ffe9a8', speed: 160, life: 0.3 });
          game.sound.enemyHit();
          const died = game.enemies.damage(enemy, bolt.damage);
          if (!died && bolt.pierce > 0) {
            bolt.pierce--;
          } else if (!died) {
            bolt.life = 0;
          }
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);

    for (const glob of this.globs) {
      glob.life -= dt;
      glob.x += glob.vx * dt;
      glob.y += glob.vy * dt;
      if (glob.x < 0 || glob.x > 1280 || glob.y < 0 || glob.y > 720) {
        glob.life = 0;
        continue;
      }
      const player = game.player;
      const dxp = player.x - glob.x;
      const dyp = player.y - glob.y;
      const reachP = player.radius + glob.size;
      if (dxp * dxp + dyp * dyp < reachP * reachP) {
        glob.life = 0;
        game.particles.burst(glob.x, glob.y, { count: 8, color: '#f472b6', speed: 150, life: 0.35 });
        player.takeDamage(glob.damage);
        continue;
      }
      const lantern = game.lantern;
      const dxl = lantern.x - glob.x;
      const dyl = lantern.y - glob.y;
      const reachL = lantern.radius + glob.size;
      if (dxl * dxl + dyl * dyl < reachL * reachL) {
        glob.life = 0;
        game.particles.burst(glob.x, glob.y, { count: 8, color: '#f472b6', speed: 150, life: 0.35 });
        game.damageLantern(glob.damage);
      }
    }
    this.globs = this.globs.filter((g) => g.life > 0);
  }

  draw(ctx, time) {
    for (const bolt of this.bolts) {
      const angle = Math.atan2(bolt.vy, bolt.vx);
      ctx.save();
      ctx.translate(bolt.x, bolt.y);
      ctx.rotate(angle);
      const gradient = ctx.createLinearGradient(-16, 0, 10, 0);
      gradient.addColorStop(0, 'rgba(255, 220, 130, 0)');
      gradient.addColorStop(1, 'rgba(255, 240, 190, 0.95)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, bolt.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(4, 0, bolt.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const glob of this.globs) {
      const pulse = 1 + Math.sin(time * 10 + glob.x) * 0.15;
      ctx.fillStyle = '#e879c8';
      ctx.beginPath();
      ctx.arc(glob.x, glob.y, glob.size * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c2d5e';
      ctx.beginPath();
      ctx.arc(glob.x, glob.y, glob.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

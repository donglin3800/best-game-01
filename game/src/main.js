// main.js — Emberward: The Last Lantern. Boots the game, owns the state
// machine (title / playing / draft / paused / victory / defeat), runs the
// frame loop, and wires the warden, the creatures, the bolts, the embers
// and the lantern together. A ?shot= URL renders one deterministic scene
// for screenshots instead of starting the loop.

import { Rng, clamp } from './rng.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { ParticleSystem } from './particles.js';
import { Warden } from './player.js';
import { EnemyManager } from './enemies.js';
import { BoltPool } from './projectiles.js';
import { EmberField } from './pickups.js';
import { WaveDirector, TOTAL_WAVES } from './waves.js';
import { rollDraft } from './upgrades.js';
import { drawWorld, drawHud, drawBanner, drawTitle, drawDraft, drawPaused, drawEnd } from './render.js';
import { buildShotScene } from './shots.js';

const VIEW_W = 1280;
const VIEW_H = 720;
const BEST_KEY = 'emberward-best-score';

const WAVE_SUBTITLES = [
  'The dark stirs…',
  'They smell the flame.',
  'The night grows teeth.',
  'Hold the circle.',
  'The dark sends its hunters.',
  'Something heavy approaches.',
  'The lantern flickers.',
  'The Hollow King stirs below.',
  'Almost dawn. Almost.',
  'THE HOLLOW KING',
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = new Rng((Math.random() * 0xffffffff) >>> 0);
    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.particles = new ParticleSystem();
    this.lantern = { x: 640, y: 360, radius: 46, hp: 250, maxHp: 250 };
    this.player = new Warden(this);
    this.enemies = new EnemyManager(this);
    this.bolts = new BoltPool(this);
    this.embers = new EmberField(this);
    this.director = new WaveDirector(this);
    this.state = 'title';
    this.time = 0;
    this.timePlayed = 0;
    this.wave = 1;
    this.score = 0;
    this.best = this.loadBest();
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.embersCollected = 0;
    this.emberStreak = 0;
    this.upgradeCounts = {};
    this.draft = [];
    this.draftRects = [];
    this.banner = null;
    this.defeatReason = '';
    this.muted = false;
    this.enterTitle();
  }

  get comboMultiplier() {
    return 1 + Math.min(this.combo, 20) * 0.1;
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Storage may be unavailable; the best score simply does not persist.
      }
    }
  }

  formattedTime() {
    const total = Math.floor(this.timePlayed);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  /** Clear every entity back to a fresh clearing (keeps score/state). */
  resetWorld() {
    this.enemies.clear();
    this.bolts.clear();
    this.embers.clear();
    this.particles = new ParticleSystem();
    this.director.stop();
    this.lantern.hp = this.lantern.maxHp;
    this.player.reset();
  }

  /** The title screen: a quiet clearing with wisps drifting at its edge. */
  enterTitle() {
    this.resetWorld();
    this.state = 'title';
    this.wave = 1;
    this.score = 0;
    this.combo = 0;
    this.kills = 0;
    this.embersCollected = 0;
    const rng = new Rng(20261116);
    const spots = [[300, 220], [980, 200], [240, 520], [1040, 520], [640, 150], [420, 620], [860, 620]];
    for (const [x, y] of spots) {
      this.enemies.spawn('wisp', x + rng.range(-30, 30), y + rng.range(-20, 20), 1);
    }
  }

  /** Start a fresh run from wave one. */
  startRun() {
    this.sound.ensure();
    this.resetWorld();
    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.wave = 1;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.embersCollected = 0;
    this.emberStreak = 0;
    this.upgradeCounts = {};
    this.draft = [];
    this.timePlayed = 0;
    this.defeatReason = '';
    this.lantern.hp = 250;
    this.lantern.maxHp = 250;
    this.state = 'playing';
    this.setBanner(`WAVE 1`, WAVE_SUBTITLES[0]);
    this.director.start(1, this.seed);
    this.sound.startMusic();
    this.sound.waveHorn();
  }

  setBanner(text, sub) {
    this.banner = { text, sub, timer: 2.4 };
  }

  /** A creature died: score it, count the combo, scatter its embers. */
  onEnemyKilled(enemy) {
    this.combo += 1;
    this.comboTimer = 2.5;
    const gained = Math.round(enemy.def.score * this.comboMultiplier);
    this.score += gained;
    this.kills += 1;
    this.embers.drop(enemy.x, enemy.y, enemy.def.embers);
    this.particles.floatText(enemy.x, enemy.y - enemy.radius - 6, `+${gained}`, '#ffd98a', enemy.def.boss ? 22 : 15);
  }

  /** An ember reached the warden: score it, and every streak mends health. */
  onEmberCollected(ember) {
    this.score += ember.value;
    this.embersCollected += 1;
    this.emberStreak += 1;
    this.sound.emberPickup();
    if (this.emberStreak >= 15) {
      this.emberStreak = 0;
      this.player.heal(this.player.stats.emberHeal);
      this.particles.floatText(this.player.x, this.player.y - 30, `+${this.player.stats.emberHeal} HP`, '#7dd3a8', 15);
    }
  }

  /** The lantern takes a hit; at zero health the night wins. */
  damageLantern(amount) {
    if (this.state !== 'playing') return;
    this.lantern.hp -= amount;
    this.sound.lanternHurt();
    this.particles.shake(5, 0.2);
    this.particles.floatText(this.lantern.x, this.lantern.y - 70, `-${amount}`, '#ff9f43', 16);
    if (this.lantern.hp <= 0) {
      this.lantern.hp = 0;
      this.defeat('The lantern has gone dark. The night swallows the clearing.');
    }
  }

  onWardenFallen() {
    this.defeat('The warden has fallen. No one is left to tend the flame.');
  }

  victory() {
    this.state = 'victory';
    this.saveBest();
    this.sound.stopMusic();
    this.sound.victory();
    this.particles.ring(640, 360, '#ffd98a', 300, 1.2);
  }

  defeat(reason) {
    if (this.state !== 'playing') return;
    this.state = 'defeat';
    this.defeatReason = reason;
    this.saveBest();
    this.sound.stopMusic();
    this.sound.defeat();
    this.particles.burst(this.player.x, this.player.y, { count: 30, color: '#9fe8ff', speed: 260, life: 0.9 });
  }

  /** The wave is clear: bonus points, then a draft — or victory on wave 10. */
  waveClear() {
    const bonus = 100 * this.wave;
    this.score += bonus;
    this.particles.floatText(640, 300, `WAVE BONUS +${bonus}`, '#ffd98a', 20);
    if (this.wave >= TOTAL_WAVES) {
      this.victory();
      return;
    }
    this.state = 'draft';
    this.draft = rollDraft(this.upgradeCounts, this.rng);
    this.draftRects = [];
    this.sound.upgradePick();
  }

  pickUpgrade(index) {
    const upgrade = this.draft[index];
    if (!upgrade) return;
    this.upgradeCounts[upgrade.id] = (this.upgradeCounts[upgrade.id] || 0) + 1;
    upgrade.apply(this);
    this.sound.upgradePick();
    this.particles.ring(this.player.x, this.player.y, '#ffd98a', 110, 0.5);
    this.particles.floatText(this.player.x, this.player.y - 34, upgrade.name, '#ffd98a', 18);
    this.wave += 1;
    this.state = 'playing';
    this.setBanner(`WAVE ${this.wave}`, WAVE_SUBTITLES[this.wave - 1]);
    this.director.start(this.wave, this.seed);
    this.sound.waveHorn();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
  }

  update(dt) {
    this.time += dt;
    this.sound.update(dt);

    // Mute works everywhere.
    if (this.input.wasPressed('KeyM')) this.toggleMute();

    if (this.state === 'title') {
      this.particles.update(dt);
      if (Math.random() < dt * 2) {
        this.particles.wisp(640 + (Math.random() - 0.5) * 160, 330 + Math.random() * 40);
      }
      if (this.input.wasPressed('Enter') || this.input.wasClicked()) this.startRun();
      return;
    }

    if (this.state === 'playing') {
      this.timePlayed += dt;
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }
      if (this.banner && this.banner.timer > 0) this.banner.timer -= dt;
      if (this.input.anyPressed(['KeyP', 'Escape'])) {
        this.state = 'paused';
        this.sound.stopMusic();
        return;
      }
      this.player.update(dt, this.input);
      this.enemies.update(dt);
      this.bolts.update(dt);
      this.embers.update(dt);
      this.director.update(dt);
      this.particles.update(dt);
      if (this.state === 'playing' && this.director.cleared) this.waveClear();
      return;
    }

    if (this.state === 'draft') {
      this.particles.update(dt);
      if (this.input.wasPressed('Digit1')) this.pickUpgrade(0);
      else if (this.input.wasPressed('Digit2')) this.pickUpgrade(1);
      else if (this.input.wasPressed('Digit3')) this.pickUpgrade(2);
      else if (this.input.wasClicked()) {
        for (let i = 0; i < this.draftRects.length; i++) {
          const rect = this.draftRects[i];
          if (this.input.mouseX >= rect.x && this.input.mouseX <= rect.x + rect.w &&
              this.input.mouseY >= rect.y && this.input.mouseY <= rect.y + rect.h) {
            this.pickUpgrade(i);
            break;
          }
        }
      }
      return;
    }

    if (this.state === 'paused') {
      if (this.input.anyPressed(['KeyP', 'Escape'])) {
        this.state = 'playing';
        this.sound.startMusic();
      } else if (this.input.wasPressed('KeyR')) {
        this.startRun();
      }
      return;
    }

    // victory / defeat
    this.particles.update(dt);
    if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyR') || this.input.wasClicked()) {
      this.startRun();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const offset = this.particles.offset();
    ctx.translate(offset.x, offset.y);
    drawWorld(ctx, this, this.time);
    ctx.restore();
    if (this.state === 'playing' || this.state === 'paused') {
      drawHud(ctx, this);
      drawBanner(ctx, this);
    }
    if (this.state === 'title') drawTitle(ctx, this, this.time);
    if (this.state === 'draft') {
      drawHud(ctx, this);
      drawDraft(ctx, this, this.time);
    }
    if (this.state === 'paused') drawPaused(ctx, this);
    if (this.state === 'victory') drawEnd(ctx, this, true);
    if (this.state === 'defeat') drawEnd(ctx, this, false);
  }

  frame(dt) {
    this.update(dt);
    this.render();
    this.input.endFrame();
  }
}

function boot() {
  const canvas = document.querySelector('#game');
  const game = new Game(canvas);
  window.__emberward = game;
  const query = new URLSearchParams(window.location.search);
  const shotName = query.get('shot');
  if (shotName) {
    // Screenshot mode: one deterministic frame, then signal readiness.
    const seedValue = Number.parseInt(query.get('seed') || '7', 10) || 7;
    buildShotScene(game, shotName, seedValue);
    game.render();
    window.__shotReady = true;
    return;
  }
  let previous = performance.now();
  const tick = (now) => {
    const dt = clamp((now - previous) / 1000, 0, 0.033);
    previous = now;
    game.frame(dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

boot();

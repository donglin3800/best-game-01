// waves.js — the ten waves of the night. Each wave buys its creatures from
// a point budget that grows with the night, so early waves teach the kinds
// one at a time and later waves mix them. The tenth wave brings the Hollow
// King; surviving it wins the game.

import { Rng } from './rng.js';

export const TOTAL_WAVES = 10;

const COSTS = { wisp: 1, crawler: 2, spitter: 3, brute: 5 };

/** The spawn queue for a wave: an ordered list of creature kinds. */
export function buildWaveQueue(wave, seed) {
  const rng = new Rng(seed * 7919 + wave * 104729);
  if (wave === TOTAL_WAVES) {
    const queue = ['boss'];
    for (let i = 0; i < 6; i++) queue.push('wisp');
    return queue;
  }
  let budget = 6 + 5 * wave;
  const queue = [];
  const available = ['wisp'];
  if (wave >= 2) available.push('crawler');
  if (wave >= 3) available.push('spitter');
  if (wave >= 4) available.push('brute');
  const weights = { wisp: 5, crawler: 3, spitter: 2, brute: 1 };
  while (budget > 0) {
    const affordable = available.filter((type) => COSTS[type] <= budget);
    if (affordable.length === 0) break;
    let total = 0;
    for (const type of affordable) total += weights[type];
    let roll = rng.next() * total;
    let picked = affordable[0];
    for (const type of affordable) {
      roll -= weights[type];
      if (roll <= 0) {
        picked = type;
        break;
      }
    }
    queue.push(picked);
    budget -= COSTS[picked];
  }
  // Shuffle lightly so the same kind never marches in one long block.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

/** Feeds a wave's queue into the clearing on a timer. */
export class WaveDirector {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.timer = 0;
    this.interval = 1;
    this.spawned = 0;
    this.active = false;
  }

  start(wave, seed) {
    this.queue = buildWaveQueue(wave, seed);
    this.interval = Math.max(0.35, 1.05 - 0.06 * wave);
    this.timer = 0.6;
    this.spawned = 0;
    this.active = true;
  }

  stop() {
    this.active = false;
    this.queue = [];
  }

  update(dt) {
    if (!this.active) return;
    this.timer -= dt;
    while (this.timer <= 0 && this.queue.length > 0) {
      this.timer += this.interval;
      const type = this.queue.shift();
      this.spawned++;
      this.game.enemies.spawnAtEdge(type, this.game.wave);
      if (type === 'boss') this.game.sound.bossRoar();
    }
    if (this.queue.length === 0) this.active = false;
  }

  /** True once every creature has spawned and been slain. */
  get cleared() {
    return !this.active && this.queue.length === 0 && this.game.enemies.list.length === 0;
  }
}

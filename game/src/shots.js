// shots.js — deterministic scenes for the game's screenshots. A shot URL
// like ?shot=play&seed=7 rebuilds one exact moment (title, play, victory
// or defeat) with a seeded generator and no wall clock, so the four
// screenshots are reproducible renders of the game's own code.

import { Rng } from './rng.js';

/** Build one of the four screenshot scenes into the game. */
export function buildShotScene(game, scene, seed) {
  const rng = new Rng(seed);
  game.resetWorld();
  game.time = 3.2;

  if (scene === 'title') {
    game.state = 'title';
    game.best = 8420;
    placeDecorativeWisps(game, rng);
    return;
  }

  if (scene === 'play') {
    game.state = 'playing';
    game.wave = 4;
    game.score = 2450;
    game.combo = 6;
    game.comboTimer = 1.8;
    game.kills = 47;
    game.embersCollected = 63;
    game.player.stats.hp = 78;
    game.lantern.hp = 190;
    game.player.x = 560;
    game.player.y = 500;
    game.player.aim = -0.5;
    game.input.mouseX = 760;
    game.input.mouseY = 320;
    stageBattle(game, rng);
    return;
  }

  if (scene === 'victory') {
    game.state = 'victory';
    game.wave = 10;
    game.score = 12840;
    game.kills = 214;
    game.embersCollected = 312;
    game.timePlayed = 754;
    game.player.stats.hp = 64;
    game.lantern.hp = 132;
    game.player.x = 560;
    game.player.y = 500;
    for (let i = 0; i < 5; i++) {
      game.particles.burst(300 + rng.range(0, 680), 180 + rng.range(0, 260), {
        count: 14, color: rng.pick(['#ffd98a', '#ffb347', '#9fe8ff']), speed: 200, life: 0.8,
      });
    }
    return;
  }

  // defeat
  game.state = 'defeat';
  game.defeatReason = 'The lantern has gone dark. The night swallows the clearing.';
  game.wave = 7;
  game.score = 5310;
  game.kills = 121;
  game.embersCollected = 148;
  game.timePlayed = 402;
  game.player.stats.hp = 0;
  game.lantern.hp = 0;
  game.player.x = 560;
  game.player.y = 500;
  placeDecorativeWisps(game, rng);
}

/** A few wisps drifting around the clearing for the title and defeat scenes. */
function placeDecorativeWisps(game, rng) {
  const spots = [
    [300, 220], [980, 200], [240, 520], [1040, 520], [640, 150], [420, 620], [860, 620],
  ];
  for (const [x, y] of spots) {
    const wisp = game.enemies.spawn('wisp', x + rng.range(-30, 30), y + rng.range(-20, 20), 1);
    wisp.hp = wisp.maxHp;
  }
  for (let i = 0; i < 10; i++) {
    game.embers.drop(400 + rng.range(0, 480), 300 + rng.range(0, 200), 1);
  }
}

/** A mid-battle moment for the play screenshot: mixed creatures, bolts in
 *  flight, embers on the ground and fresh sparks in the air. */
function stageBattle(game, rng) {
  const placements = [
    ['wisp', 820, 300], ['wisp', 880, 420], ['wisp', 700, 240],
    ['crawler', 760, 560], ['crawler', 900, 300],
    ['spitter', 980, 480], ['brute', 860, 180],
  ];
  for (const [type, x, y] of placements) {
    const enemy = game.enemies.spawn(type, x + rng.range(-16, 16), y + rng.range(-12, 12), 4);
    if (type === 'brute') enemy.hp = Math.round(enemy.maxHp * 0.55);
    if (type === 'spitter') enemy.hp = Math.round(enemy.maxHp * 0.7);
  }
  // Bolts already in flight toward the pack.
  for (let i = 0; i < 3; i++) {
    game.bolts.bolts.push({
      x: 610 + i * 26,
      y: 470 - i * 30,
      vx: 560,
      vy: -260,
      damage: 12,
      pierce: 0,
      size: 6,
      life: 1.1,
      hitIds: new Set(),
    });
  }
  game.bolts.globs.push({
    x: 940, y: 440, vx: -160, vy: 90, damage: 10, size: 8, life: 3,
  });
  game.embers.drop(760, 380, 3);
  game.embers.drop(880, 340, 2);
  game.particles.burst(820, 300, { count: 10, color: '#ffe9a8', speed: 170, life: 0.4 });
  game.particles.floatText(820, 280, '+80', '#ffd98a', 17);
  game.particles.floatText(700, 220, '+50', '#ffd98a', 15);
  game.banner = null;
}

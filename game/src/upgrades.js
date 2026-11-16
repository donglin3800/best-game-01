// upgrades.js — the lantern's blessings: after each cleared wave the
// warden drafts one of three upgrades. Each blessing stacks a few times;
// the draft never offers one already at its cap.

export const UPGRADE_POOL = [
  {
    id: 'bright-bolts', name: 'Bright Bolts', max: 5, icon: '✦',
    desc: '+25% bolt damage',
    apply: (game) => { game.player.stats.damage *= 1.25; },
  },
  {
    id: 'rapid-lantern', name: 'Rapid Lantern', max: 5, icon: '≫',
    desc: '+20% fire rate',
    apply: (game) => { game.player.stats.fireRate *= 1.2; },
  },
  {
    id: 'twin-flame', name: 'Twin Flame', max: 2, icon: '❖',
    desc: '+1 bolt per shot',
    apply: (game) => { game.player.stats.multishot += 1; },
  },
  {
    id: 'piercing-light', name: 'Piercing Light', max: 3, icon: '➶',
    desc: 'Bolts pierce +1 enemy',
    apply: (game) => { game.player.stats.pierce += 1; },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', max: 4, icon: '➤',
    desc: '+15% move speed',
    apply: (game) => { game.player.stats.speed *= 1.15; },
  },
  {
    id: 'warden-vigor', name: "Warden's Vigor", max: 4, icon: '♥',
    desc: '+25 max health, heal 40',
    apply: (game) => {
      game.player.stats.maxHp += 25;
      game.player.heal(40);
    },
  },
  {
    id: 'quick-dash', name: 'Quick Dash', max: 3, icon: '↯',
    desc: 'Dash recharges 30% faster',
    apply: (game) => { game.player.stats.dashCooldown *= 0.7; },
  },
  {
    id: 'ember-magnet', name: 'Ember Magnet', max: 3, icon: '◎',
    desc: '+90 ember pickup radius',
    apply: (game) => { game.player.stats.magnet += 90; },
  },
  {
    id: 'heavy-embers', name: 'Heavy Embers', max: 3, icon: '●',
    desc: '+30% bolt size, +10% damage',
    apply: (game) => {
      game.player.stats.boltSize *= 1.3;
      game.player.stats.damage *= 1.1;
    },
  },
  {
    id: 'lantern-mend', name: 'Lantern Mend', max: 4, icon: '⚒',
    desc: 'Repair the lantern +90, +30 max',
    apply: (game) => {
      game.lantern.maxHp += 30;
      game.lantern.hp = Math.min(game.lantern.maxHp, game.lantern.hp + 90);
    },
  },
  {
    id: 'thorn-aura', name: 'Thorn Aura', max: 3, icon: '✜',
    desc: 'Touching enemies take 12 damage',
    apply: (game) => { game.player.stats.thorns += 12; },
  },
  {
    id: 'ember-heart', name: 'Ember Heart', max: 3, icon: '◆',
    desc: 'Embers mend twice as much health',
    apply: (game) => { game.player.stats.emberHeal *= 2; },
  },
];

/** Roll three distinct blessings the warden has not maxed out. */
export function rollDraft(counts, rng) {
  const available = UPGRADE_POOL.filter((u) => (counts[u.id] || 0) < u.max);
  const draft = [];
  while (draft.length < 3 && available.length > 0) {
    const index = Math.floor(rng.next() * available.length);
    draft.push(available.splice(index, 1)[0]);
  }
  return draft;
}

// render.js — everything the player sees: the night clearing, the
// Emberheart lantern, the creatures, the HUD and every screen (title,
// upgrade draft, pause, victory, defeat). The HUD is drawn on the canvas
// so screenshots always show the game as the player sees it.

import { TOTAL_WAVES } from './waves.js';

const VIEW_W = 1280;
const VIEW_H = 720;

/** Night sky, stars and the clearing floor. */
export function drawBackground(ctx, game, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  gradient.addColorStop(0, '#0b1030');
  gradient.addColorStop(0.55, '#101a3d');
  gradient.addColorStop(1, '#0a1f1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars, twinkling slowly.
  ctx.fillStyle = '#cdd8ff';
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % VIEW_W;
    const y = (i * 89.3) % 420;
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.7 + i));
    ctx.globalAlpha = twinkle * 0.8;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // The clearing: a mossy ring around the lantern.
  ctx.fillStyle = '#14291f';
  ctx.beginPath();
  ctx.ellipse(640, 380, 560, 330, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e3d2c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(640, 380, 560, 330, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Grass tufts and stones, fixed by a hash so they never jump around.
  for (let i = 0; i < 70; i++) {
    const hx = (i * 173.3) % 1200 + 40;
    const hy = 60 + ((i * 271.7) % 620);
    const inClearing = ((hx - 640) / 560) ** 2 + ((hy - 380) / 330) ** 2 < 1;
    if (!inClearing) continue;
    ctx.strokeStyle = i % 3 === 0 ? '#234d33' : '#1a3a28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - 3, hy - 8);
    ctx.moveTo(hx + 3, hy);
    ctx.lineTo(hx + 5, hy - 7);
    ctx.stroke();
  }
}

/** The Emberheart lantern at the heart of the clearing. */
export function drawLantern(ctx, game, time) {
  const lantern = game.lantern;
  const alive = lantern.hp > 0;
  const flicker = alive ? 1 + Math.sin(time * 7) * 0.06 + Math.sin(time * 13) * 0.04 : 0.25;

  // Warm light spilling across the clearing.
  const light = ctx.createRadialGradient(lantern.x, lantern.y, 10, lantern.x, lantern.y, 340 * flicker);
  light.addColorStop(0, alive ? 'rgba(255, 200, 90, 0.30)' : 'rgba(120, 130, 180, 0.10)');
  light.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stone base.
  ctx.fillStyle = '#3a3f4a';
  ctx.beginPath();
  ctx.ellipse(lantern.x, lantern.y + lantern.radius - 4, lantern.radius + 6, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f38';
  ctx.fillRect(lantern.x - 26, lantern.y + 8, 52, 14);

  // Glass chamber and flame.
  ctx.fillStyle = 'rgba(255, 240, 190, 0.25)';
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 6, lantern.radius - 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6b3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 6, lantern.radius - 12, 0, Math.PI * 2);
  ctx.stroke();
  if (alive) {
    const flame = ctx.createRadialGradient(lantern.x, lantern.y - 6, 1, lantern.x, lantern.y - 6, 26 * flicker);
    flame.addColorStop(0, '#fff3c4');
    flame.addColorStop(0.5, '#ffb347');
    flame.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y - 6, 26 * flicker, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y - 6, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Roof cap.
  ctx.fillStyle = '#23262e';
  ctx.beginPath();
  ctx.moveTo(lantern.x - 34, lantern.y - 34);
  ctx.lineTo(lantern.x, lantern.y - 56);
  ctx.lineTo(lantern.x + 34, lantern.y - 34);
  ctx.closePath();
  ctx.fill();

  // Lantern health ring.
  const ratio = Math.max(0, lantern.hp / lantern.maxHp);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 6, lantern.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ratio > 0.5 ? '#ffd166' : ratio > 0.25 ? '#ff9f43' : '#ff5d5d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 6, lantern.radius + 12, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
  ctx.stroke();
}

/** The playing field: background, lantern, pickups, enemies, bolts, warden. */
export function drawWorld(ctx, game, time) {
  drawBackground(ctx, game, time);
  drawLantern(ctx, game, time);
  game.embers.draw(ctx, time);
  game.enemies.draw(ctx, time);
  game.bolts.draw(ctx, time);
  if (game.state !== 'defeat' || game.player.hp > 0) game.player.draw(ctx, time);
  game.particles.draw(ctx);
}

/** A horizontal bar with a label, drawn in the HUD style. */
function bar(ctx, x, y, width, height, ratio, fill, label) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (width - 2) * Math.max(0, Math.min(1, ratio))), height - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  if (label) {
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + 6, y + height - 4);
  }
}

export function drawHud(ctx, game) {
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.strokeStyle = 'rgba(255, 210, 110, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(VIEW_W, 64);
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${game.score.toLocaleString('en-US')}`, 20, 28);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#b8c4e8';
  ctx.fillText(`BEST  ${Math.max(game.best, game.score).toLocaleString('en-US')}`, 20, 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(`WAVE ${Math.min(game.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`, 640, 30);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#b8c4e8';
  const remaining = game.enemies.list.length + game.director.queue.length;
  ctx.fillText(remaining > 0 ? `${remaining} creatures remain` : 'The night is quiet…', 640, 52);

  ctx.textAlign = 'right';
  ctx.fillStyle = game.combo > 1 ? '#ffb347' : '#b8c4e8';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(game.combo > 1 ? `COMBO ×${game.comboMultiplier.toFixed(1)}` : 'COMBO —', 1260, 30);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#b8c4e8';
  ctx.fillText(`${game.kills} slain  •  ${game.embersCollected} embers`, 1260, 52);

  // Bottom-left: warden health and dash.
  bar(ctx, 20, 668, 240, 18, game.player.hp / game.player.maxHp, '#e5484d', `WARDEN  ${Math.ceil(game.player.hp)} / ${game.player.maxHp}`);
  const dashRatio = game.player.dashCooldownLeft <= 0 ? 1 : 1 - game.player.dashCooldownLeft / game.player.stats.dashCooldown;
  bar(ctx, 20, 692, 240, 10, dashRatio, '#7dd3fc', dashRatio >= 1 ? 'DASH READY  [SPACE]' : 'DASH…');

  // Bottom-right: lantern health.
  bar(ctx, 1020, 668, 240, 18, game.lantern.hp / game.lantern.maxHp, '#ffb347', `LANTERN  ${Math.ceil(game.lantern.hp)} / ${game.lantern.maxHp}`);
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8fa0c8';
  ctx.fillText('WASD move  •  Mouse aim  •  Hold click to fire  •  P pause  •  M mute', 1260, 700);
  ctx.restore();
}

/** A big centered wave banner that fades after a couple of seconds. */
export function drawBanner(ctx, game) {
  const banner = game.banner;
  if (!banner || banner.timer <= 0) return;
  const alpha = Math.min(1, banner.timer / 0.5, (2.4 - banner.timer) / 0.4 + 0.6);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(banner.text, 640, 250);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(banner.sub, 640, 288);
  ctx.restore();
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(6, 10, 26, 0.88)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(255, 210, 110, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function centeredText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, 640, y);
}

export function drawTitle(ctx, game, time) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bob = Math.sin(time * 1.4) * 6;
  centeredText(ctx, 'EMBERWARD', 190 + bob, 'bold 84px Georgia, serif', '#ffd98a');
  centeredText(ctx, '— The Last Lantern —', 236 + bob, 'italic 26px Georgia, serif', '#e8ecff');
  centeredText(ctx, 'The dark is coming for the Emberheart. You are the only warden left.', 300, '19px Georgia, serif', '#c8d2f0');
  centeredText(ctx, 'Hold the light through all ten waves. If the lantern dies, the night wins.', 328, '19px Georgia, serif', '#c8d2f0');

  panel(ctx, 380, 372, 520, 148);
  centeredText(ctx, 'HOW TO PLAY', 402, 'bold 18px Georgia, serif', '#ffd98a');
  centeredText(ctx, 'WASD / Arrows — move      Mouse — aim', 434, '17px Georgia, serif', '#e8ecff');
  centeredText(ctx, 'Hold Left Click — fire light bolts      SPACE — dash', 462, '17px Georgia, serif', '#e8ecff');
  centeredText(ctx, 'Slay creatures, gather embers, draft a blessing each wave.', 490, '17px Georgia, serif', '#e8ecff');

  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  ctx.globalAlpha = pulse;
  centeredText(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 580, 'bold 24px Georgia, serif', '#ffffff');
  ctx.globalAlpha = 1;
  if (game.best > 0) centeredText(ctx, `Best score: ${game.best.toLocaleString('en-US')}`, 620, '17px Georgia, serif', '#b8c4e8');
  centeredText(ctx, 'A game of light against the dark — best played with sound on.', 668, '15px Georgia, serif', '#8fa0c8');
}

export function drawDraft(ctx, game, time) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centeredText(ctx, `WAVE ${game.wave} CLEARED`, 130, 'bold 44px Georgia, serif', '#ffd98a');
  centeredText(ctx, 'The lantern still burns. Choose a blessing — press 1, 2 or 3, or click a card.', 172, '19px Georgia, serif', '#e8ecff');
  const cards = game.draft;
  const cardW = 300;
  const cardH = 250;
  const gap = 30;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = 640 - totalW / 2;
  const y = 230;
  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    const hover = game.input.mouseX >= x && game.input.mouseX <= x + cardW && game.input.mouseY >= y && game.input.mouseY <= y + cardH;
    const lift = hover ? -8 : 0;
    ctx.save();
    ctx.translate(0, lift);
    panel(ctx, x, y, cardW, cardH);
    if (hover) {
      ctx.strokeStyle = '#ffd98a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cardW, cardH);
    }
    centeredText(ctx, card.icon, y + 78, '52px Georgia, serif', '#ffd98a');
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const name = card.name;
    ctx.fillText(name, x + cardW / 2, y + 128);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#c8d2f0';
    wrapText(ctx, card.desc, x + cardW / 2, y + 162, cardW - 36, 22);
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillStyle = '#8fa0c8';
    ctx.fillText(`[${i + 1}]`, x + cardW / 2, y + cardH - 18);
    ctx.restore();
    game.draftRects[i] = { x, y: y + lift, w: cardW, h: cardH };
  });
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  ctx.globalAlpha = pulse;
  centeredText(ctx, `Next: WAVE ${Math.min(game.wave + 1, TOTAL_WAVES)}`, 540, 'bold 20px Georgia, serif', '#ffffff');
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

export function drawPaused(ctx, game) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centeredText(ctx, 'PAUSED', 300, 'bold 56px Georgia, serif', '#ffd98a');
  centeredText(ctx, 'The night waits for no one — except right now.', 350, '19px Georgia, serif', '#e8ecff');
  centeredText(ctx, 'P / ESC — resume      R — restart the run', 400, '18px Georgia, serif', '#c8d2f0');
}

export function drawEnd(ctx, game, won) {
  ctx.fillStyle = won ? 'rgba(20, 30, 8, 0.55)' : 'rgba(18, 4, 10, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (won) {
    centeredText(ctx, 'DAWN BREAKS', 180, 'bold 72px Georgia, serif', '#ffd98a');
    centeredText(ctx, 'Ten waves broken. The Emberheart burns on — and so do you.', 232, '21px Georgia, serif', '#e8ecff');
  } else {
    centeredText(ctx, 'THE LIGHT HAS FALLEN', 180, 'bold 60px Georgia, serif', '#ff8a8a');
    centeredText(ctx, game.defeatReason || 'The dark takes the clearing.', 232, '21px Georgia, serif', '#e8ecff');
  }
  panel(ctx, 430, 280, 420, 232);
  centeredText(ctx, 'FINAL SCORE', 316, 'bold 17px Georgia, serif', '#ffd98a');
  centeredText(ctx, game.score.toLocaleString('en-US'), 362, 'bold 44px Georgia, serif', '#ffffff');
  ctx.font = '18px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c8d2f0';
  const rows = [
    ['Waves held', `${Math.min(game.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`],
    ['Creatures slain', `${game.kills}`],
    ['Embers gathered', `${game.embersCollected}`],
    ['Time in the dark', game.formattedTime()],
    ['Best score', `${Math.max(game.best, game.score).toLocaleString('en-US')}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 398 + i * 24;
    ctx.fillText(label, 470, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, 810, y);
    ctx.textAlign = 'left';
  });
  const pulse = 0.7 + Math.sin(game.time * 3) * 0.3;
  ctx.globalAlpha = pulse;
  centeredText(ctx, 'PRESS ENTER OR CLICK TO PLAY AGAIN', 540, 'bold 22px Georgia, serif', '#ffffff');
  ctx.globalAlpha = 1;
}

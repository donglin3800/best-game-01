# Emberward — The Last Lantern

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/donglin3800/best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/donglin3800/best-game-01/reward.svg)](https://make.fun/c/best-game-01)

An entry for the [make.fun best-game-01 bounty](https://make.fun/c/best-game-01):
a complete, original browser game — no build step, no network requests, no
libraries. Open `game/index.html` in a desktop browser (or serve `game/`
with any static file server) and play.

## The game

The dark is coming for the Emberheart, the last lantern in the clearing.
You are the Lantern Warden — the only one left standing between the flame
and the night. Hold the light through **ten waves** of creatures. If the
lantern dies, the night wins. If you fall, no one is left to tend the flame.

- **Five creatures, each with its own hunt:** Gloom Wisps chase you,
  Shard Crawlers and Hollow Brutes gnaw at the lantern, Murkmouth Spitters
  lob globs from afar, and the **Hollow King** ends the tenth wave with
  summoned wisps and radial bursts.
- **A blessing after every wave:** draft one of three upgrades — more
  bolts, piercing light, a faster dash, thorn aura, lantern repairs, and
  more. Choices stack, so every run builds differently.
- **Score, combo and embers:** kills chain a combo multiplier, the fallen
  drop embers that drift to you, and every fifteen embers mend your health.
- **Feel and polish:** synthesized WebAudio sound and a night music loop,
  particles, screen shake, floating score text, hit flashes, dash rings,
  wave banners, pause, and a best score kept in `localStorage`.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Mouse | Aim |
| Hold left click | Fire light bolts |
| Space / Shift | Dash (briefly invulnerable) |
| P / Esc | Pause |
| M | Mute |
| 1 / 2 / 3 or click | Pick a blessing between waves |
| Enter / click | Start, restart |

## Win and lose

- **Win:** survive all ten waves and slay the Hollow King — the dawn
  breaks over the clearing.
- **Lose:** your health reaches zero, or the lantern's health does.
  Either way the end screen shows your score, waves held, creatures slain,
  embers gathered and time in the dark, with one key to play again.

## Layout

- `game/index.html` — the page; `game/style.css` — page chrome.
- `game/src/main.js` — boot, state machine, frame loop, screenshot scenes.
- `game/src/player.js` — the warden: movement, aim, fire, dash, stats.
- `game/src/enemies.js` — the five creature kinds and their hunts.
- `game/src/projectiles.js` — light bolts and enemy globs.
- `game/src/pickups.js` — embers.
- `game/src/waves.js` — the ten waves and their spawn director.
- `game/src/upgrades.js` — the twelve blessings and the draft.
- `game/src/audio.js` — synthesized sound effects and night music.
- `game/src/particles.js` — sparks, rings, floating text, screen shake.
- `game/src/render.js` — the clearing, the lantern, the HUD, every screen.
- `game/src/shots.js` — deterministic scenes (`?shot=title|play|victory|defeat&seed=N`).
- `game/src/rng.js` — seeded random numbers.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and
  writes `dossier.json` with the kit's `buildDossier` (`vendor/makefun-game.ts`).
- `screenshots/` — four renders of the game itself: title, play, victory, defeat.

## License

MIT — see [LICENSE](LICENSE).

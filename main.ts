// main.ts — Emberward's entrypoint for make.fun.
// Copies the playable game (game/) and its screenshots (screenshots/)
// from this repository into the output directory, then writes the
// dossier the judge reads, using the kit's own buildDossier library.
// Runs on Node 22 with the standard library only, no install, no network.
// All paths resolve from this file's own location, never from the process
// working directory: the grader runs it from elsewhere.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const gameSource = path.join(repoRoot, 'game');
const shotsSource = path.join(repoRoot, 'screenshots');
if (!fs.existsSync(gameSource)) fail('game/: no such directory in this repository');
if (!fs.existsSync(shotsSource)) fail('screenshots/: no such directory in this repository');

// Start from a clean output directory so a second run writes the same bytes.
// Never remove the output directory itself: in the grader it is a mounted
// volume whose parent is not writable by the user running this script, so
// deleting it fails with EACCES. Clear only its contents instead, and make
// each entry writable first: the grader's repo is read-only, so files copied
// from it keep read-only modes and cannot be removed otherwise.
function removeTree(entryPath: string): void {
  const stat = fs.lstatSync(entryPath);
  if (stat.isDirectory()) {
    // Writable first: children cannot be unlinked while the directory is
    // read-only.
    fs.chmodSync(entryPath, 0o755);
    for (const child of fs.readdirSync(entryPath)) {
      removeTree(path.join(entryPath, child));
    }
    fs.rmdirSync(entryPath);
  } else {
    fs.chmodSync(entryPath, 0o644);
    fs.rmSync(entryPath, { force: true });
  }
}

fs.mkdirSync(outputDir, { recursive: true });
for (const entry of fs.readdirSync(outputDir)) {
  removeTree(path.join(outputDir, entry));
}

fs.cpSync(gameSource, path.join(outputDir, 'game'), { recursive: true });
fs.cpSync(shotsSource, path.join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
fs.writeFileSync(path.join(outputDir, 'dossier.json'), dossier);

console.log(`main.ts: wrote ${outputDir}/game, ${outputDir}/screenshots and dossier.json (${dossier.length} bytes)`);

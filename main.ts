// Azura Bay — make.fun gta6-01 entry program.
// Node 22, standard library only. It hands the game in: copies this
// repository's game/ and screenshots/ folders into the output directory
// (/output in the grader, or MAKEFUN_OUTPUT_DIR when run locally) and
// writes /output/dossier.json with the kit's vendored buildDossier library,
// so the judge reads exactly the game and screenshots in this repo.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Sanity: the entry is useless without its page.
if (!existsSync(join(outDir, 'game', 'index.html'))) {
  throw new Error('Azura Bay: game/index.html missing from output');
}

const dossierBytes = statSync(join(outDir, 'dossier.json')).size;
console.log(`Azura Bay: dossier written (${dossierBytes} bytes) to ${outDir}`);

// Sunvale Heat — entry program for gta6-01 (fresh code, round 2).
// Copies game/ + screenshots/ into /output (or MAKEFUN_OUTPUT_DIR) and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Standard library only; deterministic: same repo state, same bytes out.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// Gate caps for gta6-01 (from the kit's RULES.txt / gate reference).
const CAPS = {
  text_max_bytes: 163840,
  dossier_max_bytes: 1572864,
  game_max_entries: 993,
  game_max_bytes: 50331648,
  index_max_bytes: 1048576,
  screenshots_max: 4,
  screenshot_max_bytes: 262144,
  screenshot_max_long_side: 1280,
  screenshot_min_short_side: 480
};

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const gameSrc = path.join(REPO_ROOT, "game");
  const shotsSrc = path.join(REPO_ROOT, "screenshots");
  // Clear previous copies first so a removed file can never linger in /output.
  fs.rmSync(path.join(OUT_DIR, "game"), { recursive: true, force: true });
  fs.rmSync(path.join(OUT_DIR, "screenshots"), { recursive: true, force: true });
  fs.cpSync(gameSrc, path.join(OUT_DIR, "game"), { recursive: true, force: true });
  fs.cpSync(shotsSrc, path.join(OUT_DIR, "screenshots"), { recursive: true, force: true });
  const dossier = buildDossier(OUT_DIR, CAPS);
  fs.writeFileSync(path.join(OUT_DIR, "dossier.json"), dossier);
  const gameFiles = countFiles(path.join(OUT_DIR, "game"));
  const shotFiles = fs.readdirSync(path.join(OUT_DIR, "screenshots")).filter((f) => !f.startsWith("."));
  console.log("sunvale-heat: wrote " + OUT_DIR + " (game files: " + gameFiles + ", screenshots: " + shotFiles.length + ", dossier bytes: " + dossier.length + ")");
}

function countFiles(dir: string): number {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name));
    else n += 1;
  }
  return n;
}

main();

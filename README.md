[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Sunvale Heat — an open-world crime game

A complete open-world crime game that runs offline in a desktop browser from static files.
You are Jace Rivera, back in sun-soaked Sunvale City and in debt to fixer Mara Voss.
Steal cars, outrun the Sunvale PD, run five story missions, and buy your freedom.

## What is in the game

- **A city to explore on foot and by car** — a procedural 9×9-block city with downtown
  towers, a central plaza, parks, a beach and a boardwalk, all generated at runtime.
- **Traffic and pedestrians** — 12 AI traffic cars drive the street grid, 16 pedestrians
  stroll the sidewalks and flee from danger; parked cars wait to be stolen.
- **Steal and drive** — press E near any car to steal it; arcade driving with boost,
  handbrake, collisions, crashes and explosions.
- **Wanted level and police** — crimes raise 1–5 stars; police cars chase and ram you,
  foot officers pursue and arrest you on foot. Lose the cops to cool off.
- **Missions and a story** — five jobs for Mara Voss: First Wheels, Sunset Run,
  Heat Check, Warehouse Bust and The Big Score, with waypoints, a golden beacon,
  timers, guards and cash rewards.
- **Combat** — pistol with ammo and reload, melee punches, car explosions, health
  and a hospital respawn.
- **HUD and minimap** — cash, health, wanted stars, clock, mission objective with
  distance, a live top-down minimap with landmarks, traffic, police and the mission beacon.
- **Start screen and save** — story intro, mission list, continue from a
  localStorage save; progress autosaves while you play.
- **Sound** — fully synthesized WebAudio: engine hum, police sirens, gunshots,
  pickups and mission stings. No audio files, no network requests.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot / drive |
| Mouse drag | Orbit camera |
| Shift | Run / boost |
| E | Enter or steal a car / exit |
| Click | Shoot |
| F | Punch |
| R | Reload |
| Space | Jump / handbrake |
| H | Horn |
| M | Mission details / retry a failed mission |
| P / Esc | Pause |

## Play

Serve `game/` with any static file server and open `index.html`, for example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network.

## Tech

- three.js (vendored as `game/vendor/three.min.js`)
- Plain JavaScript modules in `game/src/`, one clear job per file
- `main.ts` copies `game/` and `screenshots/` to `/output` and writes
  `/output/dossier.json` with the kit's `vendor/makefun-game.ts`

Everything — city, characters, vehicles, names and story — is original.

<sub>Entered on [make.fun](https://make.fun/?ref=wtacm6ft&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

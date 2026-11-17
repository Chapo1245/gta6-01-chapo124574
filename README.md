# Sunvale Heat — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunvale Heat is a complete open-world crime game that runs offline in a desktop
browser from static files. Explore Sunvale City on foot or behind the wheel,
steal cars, dodge the Sunvale PD, and work five story jobs for Mara Voss.

## The city

Procedural Sunvale City on a 9×9 street grid: downtown towers, a plaza with a
fountain, two parks, and a beach with a boardwalk, palms and the sea to the
south. Traffic flows on the grid, pedestrians stroll the sidewalks and flee
from trouble, and the sun stays golden over it all.

## What you can do

- **On foot** — WASD to move, Shift to run, Space to jump, F to punch,
  click to shoot the pistol, E to steal a parked car.
- **Driving** — arcade physics with boost (Shift), handbrake (Space),
  crashes and explosions. Steal any of the 14 parked cars, including the
  yellow taxi.
- **Wanted level** — 1–5 stars. Police cars chase and ram; foot officers
  chase and arrest. Lay low out of sight and the heat cools off. Get busted
  or wasted and you lose cash at the station or the hospital.
- **Five story missions for Mara Voss** — First Wheels, Sunset Run, Heat
  Check, Warehouse Bust and The Big Score — with waypoint beacons, timers,
  armed guards and cash rewards.
- **HUD + minimap** — cash, health, wanted stars, clock, objective with
  distance, speedometer, boost meter and a live minimap (roads, traffic,
  police, beacon).
- **Start screen + save** — progress, cash and jobs save to localStorage.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots,
  explosions and mission stings. No audio assets.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse (drag / click canvas) | Look around |
| Shift | Run / boost |
| Space | Jump / handbrake |
| E | Enter / exit car |
| Click or K | Shoot |
| F | Punch |
| R | Reload |
| P / Esc | Pause |
| M | Mute |

## Play it

Serve `game/` with any static file server and open `index.html` in desktop
Chrome — no build step, no network requests, everything is vendored under
`game/vendor/`.

```
npx serve game
```

## Structure

- `game/index.html` — page + HUD
- `game/src/util.js` — shared state + helpers
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesized sound
- `game/src/city.js` — procedural city, plaza, parks, beach
- `game/src/player.js` — on-foot character
- `game/src/vehicles.js` — cars, traffic AI, driving physics
- `game/src/pedestrians.js` — walkers who flee
- `game/src/police.js` — wanted level, pursuit, arrest
- `game/src/missions.js` — five story jobs + waypoint beacon
- `game/src/combat.js` — pistol, punch, explosions, guards
- `game/src/hud.js` — HUD, live minimap, menus
- `game/src/save.js` — localStorage save
- `game/src/main.js` — bootstrap + game loop + cameras
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with `vendor/makefun-game.ts`

Everything in this game — the city, characters, vehicles, names, story, art
and sound — is original. Nothing is taken from any commercial game.

<sub>Entered on [make.fun](https://make.fun/?ref=wtacm6ft&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

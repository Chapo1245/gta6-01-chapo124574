[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Azura Bay

An open-world crime game in the spirit of GTA 6, built for the make.fun gta6-01 bounty. You are **Mara Voss**, a getaway driver in **Azura Bay** — a sun-soaked coastal city of 49 blocks, 8 avenues, a beach, a boardwalk and an ocean that glitters at golden hour. Steal cars, outrun the law, and run eight story jobs across the city.

## The city

Azura Bay is ~560 m across: a road grid of avenues and cross streets, a central plaza with a fountain, a palm park, shops along the avenues, a garage for upgrades, and a safehouse where Mara saves her progress. South of the city the sand meets the boardwalk and the open ocean; the skyline hazes out to the north. Traffic flows through the avenues and pedestrians crowd the sidewalks.

## How to play

- **On foot:** walk the streets, punch your way out of trouble, and steal any car you can reach.
- **Driving:** every car handles differently — accelerate, brake, steer, and pull the handbrake to slide around corners. Ram other cars to shove them aside.
- **Wanted level:** crimes raise your stars (up to 5). Police cruisers chase and ram you; at 3 stars a helicopter joins with a searchlight. Lay low and the heat fades — or get busted trying.
- **Story jobs:** eight jobs with beacons, minimap markers and payouts — pickups, dashes, deliveries and one big final score. Finish a job to earn cash and unlock the next.
- **Garage:** spend cash on engine and armor upgrades for your ride.
- **Safehouse:** save your cash, jobs and upgrades.
- **Radio:** three generative stations — Sunset FM (synthwave), Coast 98.2 (chill) and Bay Talk 710 — all synthesized live in the browser, plus engine hum and police sirens.
- **HUD:** live minimap, wanted stars, cash, health, speed and the current objective.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive (W accelerate, S brake/reverse, A/D steer) |
| Shift | Sprint on foot |
| Space | Handbrake while driving |
| E | Enter / exit car, interact (safehouse, garage, shop) |
| F | Punch |
| G | Garage menu (near the garage) |
| 1 / 2 / 3 | Switch radio station |
| P or Esc | Pause |
| M | Mute |

Touch controls appear on mobile: steering, gas, brake and action buttons.

## Tech

- Three.js r149 (vendored under `game/vendor/three.min.js`), WebGL with golden-hour sun, shadows, ACES tone mapping and fog.
- Cars are extruded side silhouettes with glasshouses, lights, bumpers and spinning wheels — no plain boxes.
- Static files only: serve `game/` with any static server and open `game/index.html`. No network requests, no build step.
- Source is split by system under `game/src/` (`city`, `car`, `player`, `traffic`, `police`, `missions`, `hud`, `audio`, `save`, `input`, `shots`, `config`, `utils`).

## Screenshots

`1-cover.jpg` — the city at golden hour. `2-drive.jpg` — driving with traffic and the HUD. `3-mission.jpg` — a job in progress under police pursuit. `4-vista.jpg` — the beach and boardwalk from above.

<sub>Entered on [make.fun](https://make.fun/?ref=wtacm6ft&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

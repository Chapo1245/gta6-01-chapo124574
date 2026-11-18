[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Chapo1245/gta6-01-chapo124574/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Sunvale Heat

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Jace rolls into
Sunvale — a sun-soaked coastal city — with empty pockets and a fast mouth.
Mara Voss runs the streets: ten story jobs, one last heist, and every cop in
the city between you and the money. Steal it. Drive it. Tune it. Survive it.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No build step, no network requests — everything is local.

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

## What's in the world

- **A city to explore on foot and by car** — 9×9 blocks of procedural
  Sunvale: downtown towers with setbacks and rooftop clutter, a plaza with a
  fountain, two parks, a beach with umbrellas and a lifeguard tower,
  boardwalk and sea. Golden-hour dusk lighting, real-time shadows, textured
  roads and sidewalks. Walk, run, jump — or steal one of 14 parked cars.
- **Traffic and pedestrians** — 12 AI cars drive the grid and obey the
  traffic lights; 16 walkers stroll the sidewalks and flee danger.
- **Wanted system and police** — 1–5 stars. Police cruisers chase and ram;
  foot officers pursue and arrest. At 4–5 stars a police helicopter circles
  overhead with a searchlight and keeps the heat from decaying. Lose the
  heat or outrun it.
- **Missions and a story** — ten jobs for Mara Voss (First Wheels, Sunset
  Run, Heat Check, Warehouse Bust, The Big Score, Boardwalk Delivery, Taxi
  King, Plaza Showdown, Getaway Driver, Sunvale Heist) with waypoint
  beacons, timers, guards and rewards — plus taxi fares as a side gig.
- **Shops and a safehouse** — spend your cash: Sunvale Arms, MediCare
  Clinic and the Corner Mart sell ammo, Kevlar vests and medkits; the beach
  safehouse lets you rest, heal and save.
- **Garage upgrades** — Mara's Garage tunes any car you drive: Engine
  Tune (+speed), Armor Plating (-damage) and NOS Boost.
- **Radio** — three in-car stations (Sunwave FM, Palm 98.5, Talk 88) of
  synthesized music, cycled with R while driving.
- **Combat** — pistol, fists, car explosions, busted / wasted flows.
- **HUD with a live minimap** — cash, health, stars, clock, objective and
  distance, speedometer, radio station, and a minimap showing roads,
  traffic, police, the helicopter, shops, the safehouse and the mission
  beacon.
- **Start screen and save** — progress (cash, jobs done, garage levels,
  armor) persists in localStorage. Synthesized WebAudio: engine, sirens,
  gunshots, rotor wash, stings and a synthwave music loop. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Look / aim (click the game to lock the mouse) |
| E | Steal / exit car |
| Click | Shoot |
| F | Punch |
| R | Reload (on foot) / radio station (in car) |
| Shift | Run / boost |
| Space | Jump / handbrake |
| M | Next job |
| B | Shop (on foot, near a shop) |
| G | Garage upgrades (in car, near Mara's Garage) |
| H | Rest at the safehouse |
| P | Pause |
| N | Mute |

## Structure

`game/` holds the playable game; each source file has one job:

- `src/main.js` — boot, game loop, camera, menus, save, screenshot staging
- `src/city.js` — procedural Sunvale (roads, buildings, beach, traffic lights, dusk)
- `src/player.js` — Jace on foot
- `src/cars.js` — vehicle physics, AI traffic, parked cars, police cars
- `src/pedestrians.js` — sidewalk walkers
- `src/police.js` — wanted stars, heat, cruisers and officers
- `src/helicopter.js` — police helicopter (4–5 stars, searchlight)
- `src/missions.js` — Mara Voss story arc (10 jobs) + taxi fares
- `src/shops.js` — shops + safehouse (spend cash, rest, heal)
- `src/garage.js` — car upgrades (speed, armor, NOS)
- `src/radio.js` — in-car radio (3 stations)
- `src/combat.js` — shooting, melee, explosions
- `src/hud.js` — HUD + live minimap
- `src/audio.js` — synthesized WebAudio (radio stations, rotor, engine, sirens)
- `src/save.js` — localStorage persistence
- `src/input.js` — keyboard + mouse
- `src/effects.js` — particles, muzzle flashes, camera shake
- `vendor/three.min.js` — vendored three.js

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=wtacm6ft&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

# Azura Bay

[![make.fun](https://make.fun/badge/competition/gta6-01)](https://make.fun/c/gta6-01)
[![make.fun](https://make.fun/badge/entry/gta6-01)](https://make.fun/c/gta6-01)
[![make.fun](https://make.fun/badge/bounty/gta6-01)](https://make.fun/c/gta6-01)

An open-world crime game for the make.fun **gta6-01** bounty — "Make GTA 6".

Mara Voss is back in Azura Bay: getaway driver, no crew, one last shot at the
big score. Explore a sun-soaked coastal city on foot and by car, steal cars,
outrun the police, and run eight story jobs across the city — from a first
pickup at Palm Market to the final score at the Marina vault.

## What is in the game

- **A complete open world**: a 560 m coastal city — 49 blocks, 8 avenues,
  beach, boardwalk and ocean, a park, a fountain plaza, shops, a garage and a
  safehouse, palms, streetlights and a hazy skyline, all under golden-hour sun.
- **Driving and traffic**: arcade handling with handbrake, 26 traffic cars
  that drive the grid and keep their distance, stealable cars (sedans, taxis),
  and cars built as extruded silhouettes with glasshouses, spinning wheels and
  lights — not boxes.
- **Police and wanted level**: five stars of heat. Cruisers chase and ram;
  at three stars a helicopter joins with a searchlight. Heat cools when you
  lie low.
- **Missions and story**: eight jobs with beacons, minimap markers, timers
  and payouts — pickups, timed deliveries, escapes and a final score.
- **Combat**: punch on foot, ram with a car, knock pedestrians down (and pay
  for it in heat).
- **HUD and minimap**: a live 2D minimap with the player, traffic, police and
  the mission beacon; wanted stars, money, health, speed, objective and radio.
- **Sound**: three generative radio stations, an engine hum tied to speed, a
  two-tone siren and effects — all synthesized with WebAudio, no audio files.
- **Save**: stash your progress at the Safehouse; money, jobs and upgrades
  persist between visits.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop
browser (Chrome works best). No build step, no network requests.

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: **WASD** move / drive · **Shift** run · **Space** handbrake ·
**E** enter / exit car · **F** punch · **M** next job · **R** radio ·
**P** pause · **Enter** start. Touch buttons appear on touch screens.

## Structure

- `game/src/config.js` — tuning numbers, palette, city constants
- `game/src/random.js` — seeded random source
- `game/src/textures.js` — canvas-painted facades, roads, signs
- `game/src/world.js` — the city: roads, buildings, beach, park, plaza
- `game/src/vehicles.js` — car factory and traffic AI
- `game/src/people.js` — pedestrians who stroll and flee
- `game/src/police.js` — wanted level, cruisers, helicopter
- `game/src/missions.js` — the eight story jobs
- `game/src/hud.js` — HUD, live minimap, menus
- `game/src/audio.js` — generative radio, engine, siren, effects
- `game/src/input.js` — keyboard and touch input
- `game/src/shots.js` — the four staged screenshot scenes
- `game/src/save.js` — safehouse save
- `game/src/main.js` — boot and the game loop

three.js r149 is vendored under `game/vendor/three.min.js`.

## License

MIT — see [LICENSE](LICENSE).

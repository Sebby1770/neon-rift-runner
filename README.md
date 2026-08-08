# Neon Rift Runner

A full-screen **3D cyberpunk tunnel arcade** built with [Three.js](https://threejs.org/), [Vite](https://vitejs.dev/), and a lightweight Web Audio synth.

Fly a pulse craft through neon gates, collect boost and rift shards, dodge moving slicers, skim hazards for near-miss bonuses, and charge **Overdrive** for a short invulnerable speed burst.

![Neon Rift Runner](https://img.shields.io/badge/version-2.0.0-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **3D tunnel flight** with bloom, skyline, rails, particles, and nebula bands
- **Gates** — thread rings to build streak, combo, and rift charge
- **Hazards** — mines and swaying slicers; near-miss scoring when you skim them
- **Pickups** — boost, shield, and violet rift shards
- **Overdrive** — fill the Rift meter for invulnerable speed and hazard smashing
- **Zen mode** — no hull damage, chill cruise speed
- **Daily Challenge** — layout seeded from `YYYY-MM-DD` so the same day is the same run
- **Local leaderboards** — top 10 for Normal, Zen, and Daily
- **Settings** — mute, SFX volume, bloom toggle, reduced motion (persisted)
- **Touch controls** on small / coarse-pointer screens
- **Share** — copy a score blurb after a run

## Controls

| Action | Keyboard | Touch |
|--------|----------|--------|
| Move | `WASD` / arrows | On-screen pad |
| Boost | `Space` / `Shift` | Zap button |
| Pause | `Esc` | Pause button |
| Mute | Sound button | Sound button |
| Settings | Gear button | Gear button |

## Play locally

```bash
npm install
npm run dev
```

Open the Vite URL (default `http://127.0.0.1:5173`).

```bash
npm run build    # production bundle → dist/
npm run preview  # serve dist/
npm test         # vitest unit tests
npm run lint     # syntax check pure modules
```

## Architecture

```
src/
  main.js              # bootstrap, render loop, collisions, UI wiring
  styles.css
  game/
    state.js           # pure state factory + score helpers (tested)
    difficulty.js      # progressive difficulty curves (tested)
    storage.js         # localStorage scores & settings (tested)
    rng.js             # seeded PRNG for daily runs (tested)
    audio.js           # Web Audio SFX
    input.js           # keyboard / touch holds
    entities.js        # ship, gates, hazards, pickups, shockwaves
    world.js           # tunnel, skyline, particles, rails, nebula
    materials.js       # shared Three.js materials + palette
```

Gameplay and visual systems stay in plain ES modules — **no React or other UI framework**.

### Daily challenge seeding

`createDailyRng(YYYY-MM-DD)` hashes the date into a Mulberry32 seed. While a daily run is active, spawn positions and rolls use that PRNG so layouts match for everyone on the same calendar day (local timezone).

## Screenshots (what you’ll see)

- **Splash** — title lockup, Launch / Daily / Zen, best chips, tabbed leaderboard
- **HUD** — hull / boost / rift meters, score, flow combo, streak, gates
- **Callouts** — overdrive, near miss, milestones, pickups
- **Game over** — score, gates, max streak, time, best ever, NEW BEST badge, copy score
- **Settings** — mute, volume, bloom, reduced motion

## Deploy (GitHub Pages)

1. Build: `npm run build` → static files in `dist/`
2. In the GitHub repo: **Settings → Pages → Deploy from a branch** (or GitHub Actions)
3. If the site is served under a subpath (`/neon-rift-runner/`), set Vite `base` in `vite.config.js`:

```js
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({ base: '/neon-rift-runner/' });
```

4. Point Pages at the `dist` output (or use a workflow that runs `npm ci && npm run build` and uploads `dist`).

## License

MIT — see [LICENSE](./LICENSE).

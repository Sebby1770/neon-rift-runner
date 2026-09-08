# Neon Rift Runner

A full-screen **3D cyberpunk tunnel arcade** built with [Three.js](https://threejs.org/), [Vite](https://vitejs.dev/), and a lightweight Web Audio synth.

Fly a pulse craft through neon gates, collect boost and rift shards, dodge moving slicers and **gap walls**, skim hazards for near-miss bonuses, survive **Rift Storms**, unlock **achievements**, and charge **Overdrive** for a short invulnerable speed burst.

![Neon Rift Runner](https://img.shields.io/badge/version-2.2.0-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **3D tunnel flight** with bloom, skyline, rails, particles, and nebula bands
- **Difficulty presets** — Easy / Normal / Hard (spawn density, gate size, damage, near-miss window)
- **Gates** — thread rings to build streak, combo, and rift charge
- **Hazards** — mines, swaying slicers, and **gap walls** (drifting openings)
- **Rift Storm** — every ~25 gates: denser hazards, score multiplier, violet sky shift
- **Near-miss scoring** when you skim hazards
- **Pickups** — boost, shield, and violet rift shards
- **Overdrive** — fill the Rift meter for invulnerable speed and hazard smashing (screen flash)
- **Ghost best path** — translucent replay of your best run path (per mode / difficulty)
- **Zen mode** — no hull damage, chill cruise speed
- **Practice mode** — infinite hull, no game-over; Esc returns to title
- **Daily Challenge** — layout seeded from `YYYY-MM-DD` so the same day is the same run
- **Achievements** — 10 unlocks with toasts and a Settings list
- **First-run tutorial** — move, boost, gates, overdrive (re-show from Settings)
- **Local leaderboards** — top 10 for Normal (per difficulty), Zen, and Daily
- **Settings** — mute, SFX / music volume, music toggle, bloom, reduced motion, FPS meter, adaptive quality, difficulty
- **Adaptive quality** — watches real frame times and steps pixel ratio, bloom and particle density down on a struggling device, then back up when it recovers (toggleable)
- **Ambient music bed** — soft pad + arpeggio (optional)
- **Combo heat polish** — Flow meter pulses and glows at high combo
- **PWA lite** — installable shell + basic offline cache (`public/sw.js`)
- **Touch + gamepad** — on-screen pad; stick / D-pad / A / RT / Start
- **Share** — copy score text or download a PNG **share card**

## Controls

| Action | Keyboard | Touch | Gamepad |
|--------|----------|--------|---------|
| Move | `WASD` / arrows | On-screen pad | Left stick / D-pad |
| Boost | `Space` / `Shift` | Zap button | A / RT |
| Pause | `Esc` | Pause button | Start |
| Title (practice) | `Esc` | Pause → Title | Start (from pause) |
| Mute | Sound button | Sound button | — |
| Settings | Gear button | Gear button | — |

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
    difficulty.js      # progressive curves + Easy/Normal/Hard presets (tested)
    storm.js           # Rift Storm start/end/tick helpers (tested)
    ghost.js           # best-path sample / serialize / playback (tested)
    shareCard.js       # offscreen canvas score card PNG
    storage.js         # localStorage scores, settings, achievements, ghost (tested)
    achievements.js    # unlock catalog + checks (tested)
    rng.js             # seeded PRNG for daily runs (tested)
    audio.js           # Web Audio SFX + music bed
    input.js           # keyboard / touch / gamepad (tested)
    entities.js        # ship, gates, hazards (incl. gap wall), pickups
    world.js           # tunnel, skyline, particles, rails, nebula
    materials.js       # shared Three.js materials + palette
public/
  manifest.webmanifest
  sw.js                # offline shell cache
  icons/               # SVG + PNG icons
```

Gameplay and visual systems stay in plain ES modules — **no React or other UI framework**.

### Difficulty presets

`DIFFICULTY_PRESETS` in `difficulty.js` scale gate/hazard intervals, gate radius, gap walls, slicer speed, near-miss pad, and hull damage. Selection is stored in `neon-rift:settings` (`difficulty`). Normal-mode leaderboards are split by preset keys: `normal`, `normal:easy`, `normal:hard`.

### Rift Storm

Every 25 gates (normal/daily only), `storm.js` starts an 8s phase with denser hazards and a score multiplier. State fields: `stormActive`, `stormTimer`, `stormMultiplier`, `nextStormGate`.

### Ghost path

During a run, positions are sampled ~10 Hz (capped). On a new best for that board key, samples are saved under `neon-rift:ghost`. The next run interpolates a translucent ship along that path by `runTime`.

### Daily challenge seeding

`createDailyRng(YYYY-MM-DD)` hashes the date into a Mulberry32 seed. While a daily run is active, spawn positions and rolls use that PRNG so layouts match for everyone on the same calendar day (local timezone).

### Achievements

Unlocks are pure checks in `achievements.js` against a run summary (`score`, `gates`, `maxStreak`, `runTime`, `zen`, `daily`) plus extras (`nearMisses`). Progress is stored under `neon-rift:achievements`.

## Screenshots (what you’ll see)

- **Splash** — title lockup, difficulty chips, Launch / Daily / Zen / Practice, best chips, achievements count, tabbed leaderboard
- **Tutorial** — first-run flight brief
- **HUD** — hull / boost / rift meters, score, flow combo (heat glow), streak, gates; optional FPS meter
- **Callouts** — overdrive, Rift Storm, near miss, milestones, pickups, achievement toasts
- **Game over** — score, gates, max streak, time, best ever, NEW BEST badge, copy score, share card PNG
- **Settings** — mute, SFX/music volume, music, bloom, reduced motion, FPS, adaptive quality, difficulty, achievements list, re-show tutorial

## PWA / install

The app links `manifest.webmanifest` and registers a minimal service worker that caches the shell for offline reloads. Chromium-based browsers may offer “Install app” when served over HTTPS (or localhost).

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
5. Update `manifest.webmanifest` `start_url` / icon paths if using a non-root `base`.

## License

MIT — see [LICENSE](./LICENSE).

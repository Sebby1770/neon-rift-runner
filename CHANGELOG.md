# Changelog

All notable changes to this project are documented in this file.

## [2.2.0] — 2026-08-10

### Features
- **Difficulty presets** — Easy / Normal / Hard on splash + Settings; pure scales in `difficulty.js` for spawn density, gate size, hazard damage, near-miss window; persisted in settings; separate Normal leaderboards per difficulty (`normal`, `normal:easy`, `normal:hard`)
- **Rift Storm** — every ~25 gates, ~8s storm phase with denser hazards, score multiplier, violet tunnel tint, and “RIFT STORM” / “Storm clear” callouts (`storm.js`)
- **Gamepad support** — Gamepad API: left stick / D-pad move, A / RT boost, Start pause; merges with keyboard (`input.js`)
- **Ghost best path** — sample ship x,y every 0.1s; on new best, save path per mode; next run shows translucent ghost ship (`ghost.js` + storage)
- **Share card** — game-over “Share Card” draws cyberpunk score art to PNG download (`shareCard.js`)
- **FPS meter** — optional Settings toggle (default off)
- **Overdrive screen flash** — brief neon flash on overdrive (and storm start)

### Quality
- Vitest for difficulty presets, storm helpers, ghost serialize/playback, gamepad merge, per-difficulty boards
- package version `2.2.0`; README expanded
- 100 unit tests

## [2.1.0] — 2026-08-09

### Features
- **Achievements** — 10 unlocks (first gate, gate milestones, scores, streak, near-miss master, survivor, daily pilot, zen master) with toast callouts and a list in Settings; persisted in localStorage
- **First-run tutorial** — compact overlay for move / boost / gates / overdrive; dismiss once or re-show from Settings
- **Gap wall hazard** — horizontal barrier with a drifting opening; density and gap width scale with difficulty; zen still spawns no deadly hazards
- **Ambient music bed** — optional low pad + arpeggio; Music toggle + volume in Settings; respects mute
- **Combo / heat polish** — Flow stat pulses and color-shifts at high combo; HUD glow intensifies
- **Practice mode** — free-fly from splash: infinite hull, no game-over, Esc → title; sparse hazards for fun
- **PWA lite** — `manifest.webmanifest`, icons, basic service worker offline shell cache

### Quality
- Vitest coverage for achievements, tutorial/achievement storage, practice state, gap-wall helpers
- package version `2.1.0`; README expanded

## [2.0.0] — 2026-04-08

### Architecture
- Split the monolithic `src/main.js` into ES modules under `src/game/`:
  - `state.js` — pure game state factory and score helpers
  - `difficulty.js` — progressive difficulty curves
  - `storage.js` — localStorage high scores and settings
  - `rng.js` — seeded PRNG for daily challenges
  - `audio.js`, `input.js`, `entities.js`, `world.js`, `materials.js`
- Bootstrap/orchestration remains in `src/main.js`

### Features
- **High scores**: top-10 leaderboards for Normal, Zen, and Daily (localStorage)
- **Daily Challenge**: date-seeded RNG so everyone gets the same layout for a given day
- **Settings panel**: mute, SFX volume, bloom toggle, reduced motion (persisted)
- **Near-miss bonus** when skimming hazards
- **Milestone callouts** at 10/25/50/100 gates and score thresholds
- **Richer game-over**: score, gates, max streak, run time, best ever, NEW BEST badge
- **Copy score** share button
- Soft difficulty ramp: denser hazards, faster slicers, slightly smaller gates over time

### Quality
- Vitest unit tests for `state`, `difficulty`, `storage`, and `rng`
- GitHub Actions CI (`npm ci`, `test`, `build`)
- package.json bumped to `2.0.0` with repository metadata
- Expanded README

## [1.0.0] — initial

- 3D tunnel runner with gates, hazards, pickups, boost, overdrive, zen mode
- Touch controls, Web Audio synth, bloom post-processing

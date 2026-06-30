# Neon Rift Runner

A full-screen 3D arcade tunnel runner built with Three.js, Vite, and a little Web Audio.

Fly through neon gates, collect boost and rift shards, dodge moving slicers, and charge Overdrive for a short invulnerable speed burst.

This refresh adds production-style polish from the reference stack: persistent best scores, saved settings, FPS telemetry, runtime error logging, automatic performance mode, Docker/nginx deployment, and GitHub Actions CI.

## Play

- Move: `WASD` or arrow keys
- Boost: `Space` or `Shift`
- Pause: `Esc`
- Toggle performance mode: CPU button
- Touch controls appear automatically on smaller screens

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

## Check

```bash
npm run check
```

## Docker Deployment

```bash
docker build -t neon-rift-runner .
docker run --rm -p 8080:80 neon-rift-runner
```

## Operational Upgrades

- Runtime FPS, quality mode, and error-count telemetry are visible in-game.
- Best score, muted audio, and quality mode persist in localStorage.
- Browser errors and unhandled promise rejections are stored locally for debugging.
- The production container serves the built Vite app through nginx with cache and security headers.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

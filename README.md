# Neon Rift Runner

A full-screen 3D arcade tunnel runner built with Three.js, Vite, and a little Web Audio.

Fly through neon gates, collect boost and rift shards, dodge moving slicers, and charge Overdrive for a short invulnerable speed burst.

This refresh adds production-style polish from the reference stack: persistent best scores, saved settings, run-history analytics, optional Supabase leaderboard sync, FPS telemetry, runtime error logging, automatic performance mode, offline cache, a browser RPC telemetry surface, health checks, Vercel config, Docker/nginx deployment, Kubernetes manifests, and GitHub Actions CI.

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

## Vercel + Supabase

Deploy to Vercel with the included `vercel.json`. The build command is `npm run build` and the output directory is `dist`.

Optional leaderboard sync uses Supabase's REST API from the browser with a publishable/anon key. Apply the SQL in `supabase/migrations`, then set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_LEADERBOARD_TABLE=neon_rift_runs
```

When configured, completed runs are still saved locally and are also posted to Supabase. Leaderboard reads are available through `window.neonRiftRunner.rpc('leaderboard.get', { limit: 10 })`.

## Check

```bash
npm run check
```

## Docker Deployment

```bash
docker build -t neon-rift-runner .
docker run --rm -p 8080:80 neon-rift-runner
```

Staging helpers:

```bash
docker compose up --build
kubectl apply -f k8s/deployment.yaml
```

## Operational Upgrades

- Runtime FPS, quality mode, and error-count telemetry are visible in-game.
- Cache/offline status is visible in-game and backed by `public/sw.js`.
- The last 25 completed runs are retained locally for lightweight analytics.
- Best score, muted audio, and quality mode persist in localStorage.
- Browser errors and unhandled promise rejections are stored locally for debugging.
- `/health.json` supports static hosting, load balancers, and Kubernetes probes.
- `window.neonRiftRunner.rpc('telemetry.get')` exposes local runtime telemetry for debugging.
- `window.neonRiftRunner.rpc('runs.list')` and `window.neonRiftRunner.rpc('settings.export')` expose local analytics/settings snapshots.
- `window.neonRiftRunner.rpc('leaderboard.get')` reads the optional Supabase leaderboard.
- `window.neonRiftRunner.rpc('cloud.syncLast')` retries the latest run against Supabase.
- Vite manual chunks split Three.js and icons into separate vendor assets for better cache behavior.
- `vercel.json` configures static deploy output plus cache/security headers.
- The production container serves the built Vite app through nginx with cache and security headers.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

# Changelog

## 2.3.0 - 2026-07-04

- Added Vercel static deployment configuration with immutable asset caching and security headers.
- Added optional Supabase leaderboard sync for completed runs using browser-safe publishable/anon keys.
- Added `leaderboard.get` and `cloud.syncLast` RPC methods, `.env.example`, and Supabase migration SQL with RLS.
- Bumped package, health, and service-worker versions to `2.3.0`.

## 2.2.0 - 2026-07-04

- Added local run-history analytics for the last 25 completed runs.
- Added RPC methods for run history, clearing runtime errors, exporting settings, and resetting best score.
- Added visibility auto-pause so browser tab switches do not silently destroy a run.
- Added Vite manual chunking and build manifest output to split Three.js and icon vendor bundles for better caching.

## 2.1.0 - 2026-06-30

- Added a PWA manifest, service worker, and offline cache status in the runtime telemetry panel.
- Added `/health.json` for static-host health checks and load-balancer probes.
- Added a browser RPC surface at `window.neonRiftRunner.rpc(...)` for telemetry, quality mode, and best-score reset.
- Added Docker Compose and Kubernetes deployment/service manifests for staged container deployments.

## 2.0.0 - 2026-06-30

- Added persistent best score, muted audio, and quality settings through localStorage.
- Added runtime FPS, quality, and error-count telemetry to the HUD.
- Added manual and automatic performance mode for slower devices.
- Added runtime error logging for browser errors and unhandled promise rejections.
- Added Docker/nginx deployment files and GitHub Actions CI.

## 1.0.0 - 2026-05-06

- Initial Three.js arcade tunnel runner with gates, hazards, pickups, overdrive, Web Audio, and touch controls.

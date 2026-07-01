# Changelog

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

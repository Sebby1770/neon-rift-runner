import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const sw = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('service worker cache versioning', () => {
  it('names its cache after the current package version', () => {
    // `activate` deletes every cache whose key is not CACHE, so the name is the
    // only thing that evicts stale assets. It sat at v2.1.0 through the 2.2.0
    // release: the old cache was never purged and installed players kept being
    // served 2.1.0 files.
    const match = sw.match(/const CACHE = '([^']+)'/);
    expect(match, 'sw.js must declare a CACHE constant').not.toBeNull();
    expect(match[1]).toBe(`neon-rift-v${pkg.version}`);
  });

  it('serves navigations network-first so a deploy can reach installed players', () => {
    // Cache-first HTML pins an install to the build it first loaded, because the
    // shell names the hashed asset bundles.
    expect(sw).toMatch(/request\.mode === 'navigate'/);
    const navBlock = sw.slice(sw.indexOf("request.mode === 'navigate'"));
    expect(navBlock.indexOf('fetch(request)')).toBeLessThan(navBlock.indexOf('caches.match'));
  });

  it('still falls back to the cached shell when offline', () => {
    expect(sw).toMatch(/\.catch\(\(\) => caches\.match/);
  });

  it('caches only same-origin successful responses', () => {
    expect(sw).toMatch(/response\.ok && request\.url\.startsWith\(self\.location\.origin\)/);
  });

  it('purges caches from previous versions on activate', () => {
    expect(sw).toMatch(/keys\.filter\(\(k\) => k !== CACHE\)\.map\(\(k\) => caches\.delete\(k\)\)/);
  });
});

describe('content security policy', () => {
  it('ships a CSP meta tag', () => {
    expect(html).toMatch(/http-equiv="Content-Security-Policy"/);
  });

  it('keeps script-src strict', () => {
    const csp = html.match(/content="(default-src[^"]+)"/)?.[1] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
    expect(csp).toContain("object-src 'none'");
  });

  it('has no inline <script> for the CSP to block', () => {
    // The service worker registration lives in src/main.js precisely so that
    // script-src can stay strict.
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    expect(inline).toEqual([]);
  });

  it('still allows the assets the game actually uses', () => {
    const csp = html.match(/content="(default-src[^"]+)"/)?.[1] ?? '';
    // Share card renders to a canvas and downloads via a blob or data URL.
    expect(csp).toMatch(/img-src[^;]*data:/);
    expect(csp).toMatch(/img-src[^;]*blob:/);
    // The bundler injects a <style> tag.
    expect(csp).toMatch(/style-src[^;]*unsafe-inline/);
  });
});

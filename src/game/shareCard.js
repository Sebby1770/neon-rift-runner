/**
 * Draw a cyberpunk share card (score stats) onto an offscreen canvas.
 * Pure-ish: uses DOM canvas APIs when available.
 */

/**
 * @param {object} summary - run summary { score, gates, maxStreak, runTime, ... }
 * @param {object} opts
 * @param {string} [opts.modeLabel]
 * @param {string} [opts.difficultyLabel]
 * @param {boolean} [opts.isNewBest]
 * @param {string} [opts.title]
 * @returns {HTMLCanvasElement|null}
 */
export function drawShareCard(summary, opts = {}) {
  if (typeof document === 'undefined') return null;
  const width = 900;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const score = Math.round(summary?.score || 0);
  const gates = summary?.gates ?? 0;
  const streak = summary?.maxStreak ?? 0;
  const runTime = summary?.runTime ?? 0;
  const modeLabel = opts.modeLabel || 'Normal Run';
  const difficultyLabel = opts.difficultyLabel || '';
  const isNewBest = !!opts.isNewBest;
  const title = opts.title || 'NEON RIFT RUNNER';

  // Background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050609');
  bg.addColorStop(0.45, '#0a1218');
  bg.addColorStop(1, '#0d1520');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Accent glows
  const glowA = ctx.createRadialGradient(120, 80, 10, 120, 80, 280);
  glowA.addColorStop(0, 'rgba(41, 246, 201, 0.28)');
  glowA.addColorStop(1, 'rgba(41, 246, 201, 0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(780, 400, 10, 780, 400, 320);
  glowB.addColorStop(0, 'rgba(255, 177, 61, 0.22)');
  glowB.addColorStop(1, 'rgba(255, 177, 61, 0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  // Frame
  ctx.strokeStyle = 'rgba(41, 246, 201, 0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, width - 36, height - 36, 16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 240, 104, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 28, 28, width - 56, height - 56, 12);
  ctx.stroke();

  // Eyebrow
  ctx.fillStyle = '#fff068';
  ctx.font = '800 16px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0.12em';
  ctx.fillText('PULSE FLIGHT ARCADE', 56, 72);

  // Title
  ctx.fillStyle = '#f8fbff';
  ctx.font = '900 42px Inter, system-ui, sans-serif';
  ctx.fillText(title, 56, 122);

  // Mode line
  ctx.fillStyle = 'rgba(248, 251, 255, 0.72)';
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  const modeLine = difficultyLabel ? `${modeLabel} · ${difficultyLabel}` : modeLabel;
  ctx.fillText(modeLine, 56, 158);

  if (isNewBest) {
    ctx.fillStyle = '#38f8ce';
    ctx.font = '900 18px Inter, system-ui, sans-serif';
    ctx.fillText('★ NEW BEST', 56, 190);
  }

  // Score
  ctx.fillStyle = 'rgba(248, 251, 255, 0.55)';
  ctx.font = '800 14px Inter, system-ui, sans-serif';
  ctx.fillText('SCORE', 56, 240);

  ctx.fillStyle = '#fff068';
  ctx.font = '900 72px Inter, system-ui, sans-serif';
  ctx.fillText(score.toLocaleString('en-US'), 56, 310);

  // Stats row
  const timeStr = formatTime(runTime);
  const stats = [
    { label: 'GATES', value: String(gates) },
    { label: 'MAX STREAK', value: String(streak) },
    { label: 'TIME', value: timeStr },
  ];
  let x = 56;
  for (const stat of stats) {
    ctx.fillStyle = 'rgba(248, 251, 255, 0.5)';
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    ctx.fillText(stat.label, x, 360);
    ctx.fillStyle = '#f8fbff';
    ctx.font = '900 28px Inter, system-ui, sans-serif';
    ctx.fillText(stat.value, x, 396);
    x += 200;
  }

  // Tagline
  ctx.fillStyle = 'rgba(41, 246, 201, 0.85)';
  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillText('Thread the gates. Steal charge. Outrun the collapsing skyline.', 56, 440);

  return canvas;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Trigger a PNG download of the canvas.
 * @returns {Promise<boolean>}
 */
export function downloadCanvasPng(canvas, filename = 'neon-rift-score.png') {
  if (!canvas || typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback data URL
          try {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            resolve(true);
          } catch {
            resolve(false);
          }
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        resolve(true);
      }, 'image/png');
    } catch {
      resolve(false);
    }
  });
}

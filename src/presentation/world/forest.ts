/**
 * Tijdelijke wereld-achtergrond: lucht, heuvels en bomen als eenvoudige vormen.
 * Wordt later vervangen door een echte wereldkaart.
 */
const MAX_PIXELS = 4096 * 4096; // Safari faalt stil bij te grote canvassen.

export function drawForest(canvas: HTMLCanvasElement): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  let dpr = window.devicePixelRatio || 1;
  if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9fdcff');
  sky.addColorStop(1, '#e6f7ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Zon
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(w * 0.85, h * 0.12, Math.min(w, h) * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Heuvels
  hill(ctx, w, h, 0.62, '#8fd18f');
  hill(ctx, w, h, 0.72, '#6cbf6c');

  // Bomen, deterministisch verspreid zodat de wereld niet verspringt bij resize.
  const trees = 9;
  for (let i = 0; i < trees; i++) {
    const x = ((i + 0.5) / trees) * w + Math.sin(i * 7.3) * w * 0.03;
    const base = h * (0.7 + 0.06 * Math.sin(i * 3.1));
    const size = Math.min(w, h) * (0.09 + 0.03 * Math.cos(i * 5.7));
    tree(ctx, x, base, size);
  }

  ctx.fillStyle = '#4f9f55';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
}

function hill(ctx: CanvasRenderingContext2D, w: number, h: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * y);
  ctx.bezierCurveTo(w * 0.25, h * (y - 0.12), w * 0.55, h * (y + 0.08), w, h * (y - 0.06));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function tree(ctx: CanvasRenderingContext2D, x: number, base: number, size: number): void {
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - size * 0.1, base - size * 0.5, size * 0.2, size * 0.5);
  ctx.fillStyle = '#2e7d32';
  for (let i = 0; i < 3; i++) {
    const top = base - size * (1.1 + i * 0.45);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - size * (0.55 - i * 0.1), top + size * 0.8);
    ctx.lineTo(x + size * (0.55 - i * 0.1), top + size * 0.8);
    ctx.closePath();
    ctx.fill();
  }
}

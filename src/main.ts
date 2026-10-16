import './style.css';
import { setupPwa } from './pwa';

// Fase 0: alleen een leeg wereldcanvas en een startknop, om de
// build-, PWA- en Pages-keten te verifiëren. Gameplay volgt in fase 1.
function drawPlaceholder(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: w, clientHeight: h } = canvas;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#7cc47f';
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
}

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const ui = document.querySelector<HTMLDivElement>('#ui')!;
drawPlaceholder(canvas);
window.addEventListener('resize', () => drawPlaceholder(canvas));

const start = document.createElement('button');
start.className = 'big-button';
start.type = 'button';
start.textContent = 'Start';
ui.append(start);

setupPwa();

import './style.css';
import { startApp } from './presentation/app';
import { drawForest } from './presentation/world/forest';
import { playSound, unlockAudio } from './presentation/sound';
import { setupPwa } from './pwa';
import { createLocalStorage } from './storage/storage';

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const ui = document.querySelector<HTMLDivElement>('#ui')!;

drawForest(canvas);
window.addEventListener('resize', () => drawForest(canvas));

// iOS staat geluid pas toe na een aanraking.
window.addEventListener('pointerdown', unlockAudio, { capture: true });

startApp(ui, createLocalStorage(), Math.random, playSound);
setupPwa();

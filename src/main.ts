import './style.css';
import { startApp } from './presentation/app';
import { drawForest } from './presentation/world/forest';
import { setupPwa } from './pwa';
import { createLocalStorage } from './storage/storage';

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const ui = document.querySelector<HTMLDivElement>('#ui')!;

drawForest(canvas);
window.addEventListener('resize', () => drawForest(canvas));

startApp(ui, createLocalStorage());
setupPwa();

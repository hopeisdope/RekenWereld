import { el } from '../dom';

/**
 * Eén zwevende wijzende hand per scherm. Wordt boven het doel-element gezet,
 * ook na draaien van de iPad (opnieuw positioneren bij resize).
 */
export class PointingHand {
  readonly el = el('span', { class: 'float-hand', 'aria-hidden': 'true' }, '👆');
  private target: HTMLElement | null = null;
  private readonly onResize = () => this.place();

  constructor(private readonly container: HTMLElement) {
    container.append(this.el);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  pointAt(target: HTMLElement | null): void {
    // `data-pointed` markeert het doel (handig voor tests; niet zichtbaar).
    if (this.target !== target) this.target?.removeAttribute('data-pointed');
    target?.setAttribute('data-pointed', '');
    this.target = target;
    this.place();
    // Nog een keer na de layout (nieuwe elementen hebben dan hun maat).
    requestAnimationFrame(() => this.place());
  }

  /** Het element waar de hand nu op staat (voor tests en voordoen). */
  get current(): HTMLElement | null {
    return this.target;
  }

  private place(): void {
    const t = this.target;
    if (!t || !t.isConnected) {
      this.el.classList.remove('show');
      t?.removeAttribute('data-pointed');
      return;
    }
    const box = this.container.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    this.el.style.left = `${r.left - box.left + r.width * 0.55}px`;
    this.el.style.top = `${r.top - box.top + r.height * 0.55}px`;
    this.el.classList.add('show');
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.el.remove();
  }
}

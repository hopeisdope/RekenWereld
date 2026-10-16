export interface Screen {
  el: HTMLElement;
  /** Opruimen (timers, spraak) bij het verlaten van het scherm. */
  destroy?(): void;
}

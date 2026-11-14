/**
 * Terug naar de spelletjesportal op de root van hetzelfde domein
 * (https://hopeisdope.github.io/).
 *
 * LET OP: dit is de enige uitzondering op de padregel uit CLAUDE.md. Hier wordt bewust
 * níet `import.meta.env.BASE_URL` gebruikt, want die wijst naar /RekenWereld/ zelf;
 * de portal staat op de root van de origin.
 */
export function portalUrl(origin: string): string {
  return `${origin}/`;
}

/** Minimale vorm van `window.location` (voor tests). */
export type PortalLocation = Pick<Location, 'origin' | 'assign'>;

/** Verlaat de app richting de portal. Voortgang moet vóór deze aanroep bewaard zijn. */
export function goToPortal(loc: PortalLocation = window.location): void {
  loc.assign(portalUrl(loc.origin));
}

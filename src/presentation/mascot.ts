/**
 * Uil Ollie als eigen SVG, zodat hij er op elk apparaat hetzelfde uitziet
 * (emoji verschillen per systeem). Houdingen via een class op de <svg>:
 * idle, point (vleugel wijst naar rechts; spiegel met `flip`), happy, think, wave.
 */
export type Pose = 'idle' | 'point' | 'happy' | 'think' | 'wave';

const SVG_NS = 'http://www.w3.org/2000/svg';

const OWL = `
  <ellipse class="shadow" cx="50" cy="106" rx="26" ry="4"/>
  <g class="body-group">
    <ellipse class="foot" cx="40" cy="100" rx="7" ry="4"/>
    <ellipse class="foot" cx="60" cy="100" rx="7" ry="4"/>
    <g class="wing wing-l"><ellipse cx="19" cy="66" rx="10" ry="22"/></g>
    <g class="wing wing-r"><ellipse cx="81" cy="66" rx="10" ry="22"/></g>
    <ellipse class="body" cx="50" cy="66" rx="32" ry="36"/>
    <ellipse class="belly" cx="50" cy="74" rx="20" ry="24"/>
    <path class="feathers" d="M42 70 l4 4 l4 -4 l4 4 l4 -4 M42 80 l4 4 l4 -4 l4 4 l4 -4"/>
    <g class="head">
      <polygon class="tuft" points="22,26 26,8 38,22"/>
      <polygon class="tuft" points="78,26 74,8 62,22"/>
      <ellipse class="face" cx="50" cy="36" rx="34" ry="26"/>
      <circle class="eye-ring" cx="36" cy="38" r="13"/>
      <circle class="eye-ring" cx="64" cy="38" r="13"/>
      <circle class="eye" cx="36" cy="38" r="10"/>
      <circle class="eye" cx="64" cy="38" r="10"/>
      <g class="pupils">
        <circle class="pupil" cx="37" cy="39" r="5"/>
        <circle class="pupil" cx="63" cy="39" r="5"/>
        <circle class="glint" cx="39" cy="37" r="1.6"/>
        <circle class="glint" cx="65" cy="37" r="1.6"/>
      </g>
      <g class="lids">
        <rect x="24" y="26" width="24" height="24" rx="12"/>
        <rect x="52" y="26" width="24" height="24" rx="12"/>
      </g>
      <polygon class="beak" points="45,47 55,47 50,57"/>
    </g>
  </g>`;

export function mascot(pose: Pose = 'idle', extraClass = '', flip = false): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 112');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = OWL;
  setPose(svg, pose, flip);
  if (extraClass) svg.classList.add(...extraClass.split(' ').filter(Boolean));
  return svg;
}

export function setPose(svg: SVGSVGElement, pose: Pose, flip = false): void {
  const keep = [...svg.classList].filter((c) => !c.startsWith('pose-') && c !== 'flip' && c !== 'owl');
  svg.setAttribute('class', ['owl', `pose-${pose}`, flip && 'flip', ...keep].filter(Boolean).join(' '));
}

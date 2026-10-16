type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

/** Kleine helper om DOM-elementen op te bouwen zonder framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (name === 'class') node.className = String(value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Grote knop; `onTap` wordt hooguit één keer per tik aangeroepen. */
export function bigButton(label: Child | Child[], onTap: () => void, className = 'big-button'): HTMLButtonElement {
  const button = el('button', { type: 'button', class: className }, ...(Array.isArray(label) ? label : [label]));
  button.addEventListener('click', onTap);
  return button;
}

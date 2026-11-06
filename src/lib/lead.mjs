/**
 * The lead paragraph: every page opens its text with a gold drop cap.
 *
 * A page's first paragraph of running text carries `.lead-dropcap`. Its first
 * letter becomes the drop cap through `::first-letter`, with no extra markup,
 * so screen readers and copy-paste see the word whole. A paragraph that opens
 * with a figure ("50 appearances…") takes the whole number instead: CSS can only
 * select its first digit, so the number goes in a `.lead-dropcap-figure` span
 * and the paragraph gets `.lead-dropcap--figure`, which turns `::first-letter`
 * off.
 *
 * Two ways in, one rule:
 * - pages: `src/components/Lead.astro`, which renders the paragraph from a string;
 * - Markdown (essays and talks): `hastLead` below, registered in astro.config.mjs,
 *   which marks the first top-level paragraph of every document.
 *
 * Why: documentation/BRAND.md, "The drop cap". Styles: "Drop cap" in
 * src/styles/global.css. Held by `npm run check:dropcap`. Plain `.mjs` so
 * astro.config.mjs can import it.
 */

/** A whole leading number: `50`, `1,200`, `1.200`, `100+`. */
const FIGURE = /^\d+(?:[.,]\d{3})*\+?/;

/**
 * Split off the leading figure of a paragraph's text.
 * @param {string} text
 * @returns {[figure: string, rest: string] | null} null when the text starts with anything else
 */
export function leadFigure(text) {
  const match = FIGURE.exec(text);
  return match ? [match[0], text.slice(match[0].length)] : null;
}

/** @typedef {import('hast').Element} Element */
/** @typedef {import('hast').ElementContent} ElementContent */

/**
 * Hast plugin (Sätteri): the first top-level `<p>` of every Markdown document is
 * the lead. A heading or a figure before it is fine; the drop cap goes on the
 * first paragraph of text.
 * @type {import('satteri').HastPluginDefinition}
 */
export const hastLead = {
  name: 'lead-dropcap',
  after(root, ctx) {
    const lead = /** @type {Element | undefined} */ (
      root.children.find((node) => node.type === 'element' && node.tagName === 'p')
    );
    if (!lead) return;

    // The first text of the paragraph, even inside a link or emphasis.
    /** @type {Element} */
    let holder = lead;
    while (holder.children[0]?.type === 'element') holder = holder.children[0];
    const first = holder.children[0];
    const split = first?.type === 'text' ? leadFigure(first.value) : null;

    if (!split) {
      ctx.setProperty(lead, 'className', ['lead-dropcap']);
      return;
    }
    ctx.setProperty(lead, 'className', ['lead-dropcap', 'lead-dropcap--figure']);
    /** @type {ElementContent[]} */
    const parts = [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['lead-dropcap-figure'] },
        children: [{ type: 'text', value: split[0] }],
      },
    ];
    if (split[1]) parts.push({ type: 'text', value: split[1] });
    ctx.replaceNode(/** @type {ElementContent} */ (first), parts);
  },
};

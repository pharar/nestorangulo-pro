/**
 * Hast plugin (Sätteri, Astro's Markdown processor): Spanish footnote chrome.
 *
 * The renderer emits English accessibility text for footnotes: an sr-only
 * "Footnotes" heading (`<h2 id="footnote-label">`) and
 * `aria-label="Back to reference N"` on each back-link. For content under a
 * `-es/` collection folder (`src/content/writing-es/`, `src/content/talks-es/`)
 * those become "Notas" / "Volver a la referencia N". The plugin factory returns
 * nothing for any other file, so English output is untouched. Plain `.mjs` so
 * astro.config.mjs can import it. See documentation/I18N.md.
 */
const SPANISH_CONTENT = /[\\/]content[\\/][^\\/]+-es[\\/]/;

/** @type {(ctx: { fileURL?: URL }) => import('satteri').HastPluginDefinition | null} */
export const hastFootnotesEs = (ctx) => {
  const path = ctx.fileURL ? decodeURIComponent(ctx.fileURL.pathname) : '';
  if (!SPANISH_CONTENT.test(path)) return null;
  return {
    name: 'footnotes-es',
    element: {
      filter: ['h2', 'a'],
      visit(node, ctx) {
        const props = node.properties ?? {};
        if (node.tagName === 'h2' && props.id === 'footnote-label') {
          for (let i = node.children.length - 1; i >= 0; i--) ctx.removeChildAt(node, i);
          ctx.appendChild(node, { type: 'text', value: 'Notas' });
        } else if (node.tagName === 'a') {
          // hast spells it `ariaLabel`; try both names when writing back.
          const value = props.ariaLabel ?? props['aria-label'];
          const label =
            typeof value === 'string' &&
            value.replace(/^Back to reference (\d+(?:-\d+)?)$/, 'Volver a la referencia $1');
          if (label && label !== value) ctx.setProperty(node, 'aria-label', label);
        }
      },
    },
  };
};

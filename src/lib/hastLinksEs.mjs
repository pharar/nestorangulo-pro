/**
 * Hast plugin (Sätteri): localise internal links in Spanish content.
 *
 * Under `src/content/*-es/`, a root-relative `href` such as `/speaking/<id>/`
 * becomes `/es/speaking/<id>/` when that Spanish page exists (see
 * `i18nLinks.mjs`); otherwise it stays as written. English files are never
 * touched. See documentation/I18N.md.
 */
import { localizeHref } from './i18nLinks.mjs';

const SPANISH_CONTENT = /[\\/]content[\\/][^\\/]+-es[\\/]/;

/** @type {(ctx: { fileURL?: URL }) => import('satteri').HastPluginDefinition | null} */
export const hastLinksEs = (ctx) => {
  const path = ctx.fileURL ? decodeURIComponent(ctx.fileURL.pathname) : '';
  if (!SPANISH_CONTENT.test(path)) return null;
  return {
    name: 'links-es',
    element: {
      filter: ['a'],
      visit(node, ctx) {
        const href = node.properties?.href;
        if (typeof href !== 'string') return;
        const next = localizeHref(href);
        if (next !== href) ctx.setProperty(node, 'href', next);
      },
    },
  };
};

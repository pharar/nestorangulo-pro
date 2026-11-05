/**
 * URL convention for the Markdown twins of the HTML pages.
 *
 *   /                  -> /index.md
 *   /about/            -> /about.md
 *   /speaking/         -> /speaking.md
 *   /speaking/<id>/    -> /speaking/<id>.md
 *   /es/               -> /es/index.md      (a locale root keeps `index`, since
 *   /es/about/         -> /es/about.md       `/es.md` would read as a page)
 *
 * The site is built with `trailingSlash: 'always'`, so every HTML page lives at
 * `<path>/`; its Markdown version drops the slash and gains `.md`. Other parts
 * of the site (llms.txt, `<link rel="alternate" type="text/markdown">`) depend
 * on this exact shape — change it here and only here.
 */
import { SITE_URL } from '../../config';
import { isLang } from '../../i18n/config';

/** Origin without a trailing slash, e.g. `https://nestorangulo.pro`. */
export const ORIGIN: string = SITE_URL.replace(/\/+$/, '');

/** Pages that intentionally have no Markdown version. */
const NO_MARKDOWN = new Set(['/404']);

/**
 * HTML pathname -> Markdown pathname, or `null` when the page has no Markdown
 * version (404, or anything that is already a file such as `/favicon.ico`).
 *
 * Accepts the canonical trailing-slash form and tolerates the slashless one.
 * It is a pure mapping: it does not check that the page exists.
 */
export function markdownPathFor(pathname: string): string | null {
  let path = pathname.split(/[?#]/, 1)[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/' || path === '/index.html') return '/index.md';
  const root = path.match(/^\/([a-z]{2})(?:\/(?:index\.html)?)?$/);
  if (root && isLang(root[1])) return `/${root[1]}/index.md`;

  path = path.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  if (NO_MARKDOWN.has(path)) return null;
  // The last segment has an extension: a file, not a page.
  if (/\.[a-z0-9]+$/i.test(path.slice(path.lastIndexOf('/') + 1))) return null;
  return `${path}.md`;
}

/** Inverse of `markdownPathFor`: `/about.md` -> `/about/`, `/index.md` -> `/`. */
export function htmlPathFor(mdPath: string): string {
  if (mdPath === '/index.md') return '/';
  const root = mdPath.match(/^\/([a-z]{2})\/index\.md$/);
  if (root && isLang(root[1])) return `/${root[1]}/`;
  return `${mdPath.replace(/\.md$/, '')}/`;
}

/** Absolute URL on this site for a root-relative path (`/about/` -> `https://…/about/`). */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) return pathOrUrl; // https:, mailto:, …
  if (pathOrUrl.startsWith('//')) return `https:${pathOrUrl}`;
  return `${ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

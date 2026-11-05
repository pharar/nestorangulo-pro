/**
 * Which Spanish pages exist, known from the content alone (no build output),
 * and the rewrite of a neutral internal link to its `/es/` equivalent.
 *
 * Authors write `/speaking/<id>/` in both languages. Spanish Markdown gets
 * `/es/speaking/<id>/` when that page exists, the English URL otherwise.
 * Existence rules (mirroring `src/lib/i18nContent.ts`):
 *   - static pages: one `src/pages/es/<name>.astro` per page (404 excepted);
 *   - talks: every non-draft English talk that has a `talks-es/<id>` overlay;
 *   - essays: non-draft English essays that have a `writing-es/<id>` file.
 * Plain `.mjs` (read from disk with node fs) so astro.config.mjs can import it.
 * Used by the hast plugin, the Markdown twins and the sitemap config.
 * See documentation/I18N.md.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
/** @type {Set<string> | undefined} */
let cache;

/** Ids (filename without extension) in a content folder. */
function ids(dir) {
  const full = join(ROOT, 'src/content', dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => /\.(md|mdx)$/.test(f))
    .map((f) => f.replace(/\.(md|mdx)$/, ''));
}

function isDraft(dir, id) {
  const file = ['md', 'mdx']
    .map((e) => join(ROOT, 'src/content', dir, `${id}.${e}`))
    .find(existsSync);
  if (!file) return true;
  const front = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  return /^draft:\s*true\s*$/m.test(front);
}

/** Every English route (trailing-slash form) that also exists in Spanish. */
export function spanishRoutes() {
  if (cache) return cache;
  const routes = new Set();
  const pagesEs = join(ROOT, 'src/pages/es');
  for (const f of readdirSync(pagesEs)) {
    const m = f.match(/^(.+)\.astro$/);
    if (!m || m[1] === '404' || m[1].startsWith('[')) continue;
    routes.add(m[1] === 'index' ? '/' : `/${m[1]}/`);
  }
  const overlays = {
    speaking: ['talks', 'talks-es'],
    writing: ['writing', 'writing-es'],
  };
  for (const [section, [en, es]] of Object.entries(overlays)) {
    const spanish = new Set(ids(es));
    for (const id of ids(en)) {
      if (spanish.has(id) && !isDraft(en, id)) routes.add(`/${section}/${id}/`);
    }
  }
  cache = routes;
  return routes;
}

/**
 * Does this English route (`/writing/x/`) have a Spanish page?
 * @param {string} path
 * @returns {boolean}
 */
export function hasSpanishRoute(path) {
  return spanishRoutes().has(path.endsWith('/') ? path : `${path}/`);
}

/**
 * `/speaking/x/#a` -> `/es/speaking/x/#a` when the Spanish page exists.
 * Anything else (external, anchor, asset, already `/es/`, no counterpart) is
 * returned unchanged.
 * @param {string} href
 * @returns {string}
 */
export function localizeHref(href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const m = href.match(/^([^?#]*)(.*)$/);
  const path = m[1];
  const rest = m[2];
  if (path === '/es' || path.startsWith('/es/')) return href;
  if (/^\/(_astro|og)\//.test(path)) return href;
  if (/\.[a-z0-9]+$/i.test(path.split('/').pop() ?? '')) return href;
  return hasSpanishRoute(path) ? `/es${path}${rest}` : href;
}

/**
 * Rewrite the targets of Markdown links and reference definitions in a source body.
 * @param {string} md
 * @returns {string}
 */
export function localizeMarkdownLinks(md) {
  return md
    .replace(/(\]\()(\/(?!\/)[^)\s]*)/g, (_, open, path) => open + localizeHref(path))
    .replace(/^(\[[^\]]+\]:\s*)(\/(?!\/)\S*)/gm, (_, open, path) => open + localizeHref(path));
}

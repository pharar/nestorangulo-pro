import { DEFAULT_LANG, LANGS, LOCALE_TAGS, isLang, otherLang, type Lang } from './config';

/** Language of a route, from its first path segment (`/es/about/` -> `es`). */
export function langFromUrl(url: URL | string): Lang {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const first = pathname.split(/[?#]/, 1)[0].split('/')[1];
  return isLang(first) && first !== DEFAULT_LANG ? first : DEFAULT_LANG;
}

/** Remove a language prefix: `/es/about/` -> `/about/`, `/es/` -> `/`. */
export function stripLang(path: string): string {
  for (const lang of LANGS) {
    if (lang === DEFAULT_LANG) continue;
    if (path === `/${lang}`) return '/';
    if (path.startsWith(`/${lang}/`)) return path.slice(lang.length + 1);
  }
  return path;
}

/**
 * The path in `lang`. Takes a path in either language:
 * `localizePath('/about/', 'es')` and `localizePath('/es/about/', 'es')` both
 * give `/es/about/`. Hashes and query strings are preserved; external URLs and
 * non-path hrefs (`#x`, `mailto:`) are returned untouched.
 */
export function localizePath(path: string, lang: Lang): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const bare = stripLang(path);
  return lang === DEFAULT_LANG ? bare : `/${lang}${bare}`;
}

/** The same page in the other language (assumes it exists). */
export function alternatePath(path: string): string {
  return localizePath(path, otherLang(langFromUrl(path)));
}

/** Sections that have an index page worth falling back to. */
const SECTION_INDEXES = new Set(['writing', 'speaking']);

/**
 * Where the language switch should point. With an equivalent page, that page;
 * without one (an essay with no translation), the other language's nearest
 * section index (`/writing/`), or its home.
 */
export function switchTarget(pathname: string, hasAlternate = true): string {
  const target = otherLang(langFromUrl(pathname));
  const bare = stripLang(pathname);
  if (hasAlternate) return localizePath(bare, target);
  const section = bare.split('/')[1];
  return localizePath(SECTION_INDEXES.has(section) ? `/${section}/` : '/', target);
}

/** Locale-aware long date: `May 4, 2026` / `4 de mayo de 2026`. */
export function formatDate(
  date: Date,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  return date.toLocaleDateString(LOCALE_TAGS[lang], opts);
}

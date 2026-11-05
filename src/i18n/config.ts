/**
 * Locale registry. Keep in step with `i18n` in astro.config.mjs.
 *
 * `en` is the default and lives at the root (`/about/`); every other language
 * lives under its code (`/es/about/`) with the same path segments.
 */
export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/** BCP-47 tag per language (hreflang in the sitemap, Intl formatting). */
export const LOCALE_TAGS: Record<Lang, string> = { en: 'en-US', es: 'es-ES' };

/** Open Graph locale per language. */
export const OG_LOCALES: Record<Lang, string> = { en: 'en_US', es: 'es_ES' };

/** Native name of each language, for `Intl`-free labels. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

export function isLang(value: string | undefined | null): value is Lang {
  return !!value && (LANGS as readonly string[]).includes(value);
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}

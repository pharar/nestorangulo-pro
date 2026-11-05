import type { Lang } from './config';

/**
 * Text that differs per language. Proper names, titles and other text that is
 * the same in every language stay plain strings.
 */
export type Localized = string | Record<Lang, string>;

/** The text in `lang`; a plain string is returned as is. */
export function localized(value: Localized, lang: Lang): string {
  return typeof value === 'string' ? value : value[lang];
}

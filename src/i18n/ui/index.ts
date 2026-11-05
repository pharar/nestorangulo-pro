import type { Lang } from '../config';

/**
 * Build a typed dictionary. `es` must have exactly the keys of `en`: a missing
 * or extra key is a type error (`npx astro check`).
 */
export function defineDict<T extends Record<string, string>>(dict: {
  en: T;
  es: { [K in keyof T]: string };
}) {
  return dict;
}

/** `useTranslations(dict, lang)` -> `t('key')`, with `{name}` interpolation. */
export function useTranslations<T extends Record<string, string>>(
  dict: { en: T; es: { [K in keyof T]: string } },
  lang: Lang
) {
  const strings: Record<string, string> = dict[lang];
  return (key: keyof T & string, vars?: Record<string, string | number>): string => {
    const value = strings[key];
    return vars ? value.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m)) : value;
  };
}

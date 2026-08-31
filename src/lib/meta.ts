/** Language and description helpers shared by SEO.astro and BaseLayout.astro. */

/** The languages talks are actually authored in (see `content.config.ts`). */
export type Lang = 'en' | 'es';

const OG_LOCALE: Record<Lang, string> = {
  en: 'en_US',
  es: 'es_ES',
};

export function ogLocale(lang: string): string {
  return OG_LOCALE[lang as Lang] ?? OG_LOCALE.en;
}

/**
 * Meta descriptions are truncated by search engines at roughly 155–160
 * characters, mid-word and without warning. Cutting deliberately at a sentence
 * — or failing that a word — boundary keeps the snippet readable.
 *
 * Only the meta tag is shortened; the full text still renders on the page.
 */
const MAX = 155;

export function metaDescription(text: string, max = MAX): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;

  // Prefer ending on a complete sentence, but not if that discards most of it.
  const sentenceEnd = clean.slice(0, max + 1).search(/[.!?](?=[^.!?]*$)/);
  if (sentenceEnd >= max * 0.6) return clean.slice(0, sentenceEnd + 1);

  const cut = clean.lastIndexOf(' ', max - 1);
  return `${clean.slice(0, cut > 0 ? cut : max - 1).replace(/[,;:—-]$/, '')}…`;
}

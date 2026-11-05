/**
 * Every page that has a Markdown version, in a stable order: core pages first
 * (home, about, speaking, writing, contact), then talks newest first, then
 * essays newest first. Spanish twins (`lang: 'es'`) follow the English ones, in
 * the same order; add each localised page list at the end of `buildMarkdownPages`.
 *
 * Consumers (llms.txt, llms-full.txt) iterate this; add a new collection by
 * appending its page list here.
 */
import { aboutPage } from './pages/about';
import { contactPage } from './pages/contact';
import { homePage } from './pages/home';
import { speakingPage, talkPages } from './pages/talks';
import { writingPage, writingPostPages } from './pages/writing';
import { langFromUrl } from '../../i18n/utils';
import type { Lang } from '../../i18n/config';
import type { MarkdownPage, MarkdownSection } from './types';

async function buildMarkdownPages(): Promise<MarkdownPage[]> {
  return [
    await homePage(),
    await aboutPage(),
    await speakingPage(),
    await writingPage(),
    contactPage(),
    ...(await talkPages()),
    ...(await writingPostPages()),
    // Spanish twins. Localise a page: append its `…('es')` builder here.
    await homePage('es'),
  ];
}

/**
 * SEO.astro asks for this on every HTML page (to decide whether to advertise a
 * twin), so a build would otherwise render every Markdown page once per HTML
 * page — O(pages²). Content cannot change during `astro build`, so memoize
 * there; in dev, rebuild on each call so edits to a talk show up on reload.
 */
let cached: Promise<MarkdownPage[]> | undefined;

export function getMarkdownPages(): Promise<MarkdownPage[]> {
  if (!import.meta.env.PROD) return buildMarkdownPages();
  cached ??= buildMarkdownPages();
  return cached;
}

/**
 * Pages of one section in one locale (default English). "Locale" is the route
 * (`/es/…`), not `p.lang`: a talk given in Spanish lives on the English route.
 */
export async function getMarkdownPagesBySection(
  section: MarkdownSection,
  lang: Lang = 'en'
): Promise<MarkdownPage[]> {
  return (await getMarkdownPages()).filter(
    (p) => p.section === section && langFromUrl(p.path) === lang
  );
}

/** Every twin under one locale's routes, in registry order. */
export async function getMarkdownPagesByLang(lang: Lang): Promise<MarkdownPage[]> {
  return (await getMarkdownPages()).filter((p) => langFromUrl(p.path) === lang);
}

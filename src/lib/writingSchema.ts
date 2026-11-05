import type { CollectionEntry } from 'astro:content';
import { SITE_URL, AUTHOR } from '../config';
import { PERSON_ID, ref, type GraphNode } from './structuredData';
import { talkEventId, talkUrl } from './talkSchema';
import type { Lang } from '../i18n/config';
import { useWriting } from '../i18n/ui/writing';
import { themeLabel } from '../i18n/ui/themes';
import { localizePath } from '../i18n/utils';

type Essay = CollectionEntry<'writing'>;
type Talk = CollectionEntry<'talks'>;

/** `2026-10-30T00:00:00Z` -> `2026-10-30`. Dates are authored as plain days. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function essayUrl(id: string, lang: Lang = 'en'): string {
  return `${SITE_URL}${localizePath(`/writing/${id}/`, lang)}`;
}

export function essayPostingId(id: string, lang: Lang = 'en'): string {
  return `${essayUrl(id, lang)}#article`;
}

/**
 * Ids of the talks an essay links to (`/speaking/<id>/` in its body — the
 * footnotes that point at the talk an argument comes from).
 */
export function talksLinkedFrom(entry: { body?: string }, talks: Talk[]): Talk[] {
  const linked = new Set(
    [...(entry.body ?? '').matchAll(/\]\((?:\/es)?\/speaking\/([^/)\s#?]+)\/?[^)]*\)/g)].map(
      (m) => m[1]
    )
  );
  return talks.filter((t) => linked.has(t.id));
}

/**
 * The essay's `BlogPosting` node, for the page's `@graph`.
 *
 * `author` and `publisher` point at the site's Person entity, so the essays
 * accrue to the same identity the talks do. Talks the essay links to are
 * `mentions` (schema.org `citation` and `isBasedOn` expect a CreativeWork,
 * and a talk page's primary entity is an Event). As with talks, nothing is
 * emitted that the reader cannot see on the page.
 */
function otherLanguageArticle(id: string, lang: Lang, inLanguage: string): GraphNode {
  return {
    '@type': 'BlogPosting',
    '@id': essayPostingId(id, lang),
    url: essayUrl(id, lang),
    inLanguage,
  };
}

export interface EssayNodeOptions {
  /** Route/content language of the page. English by default. */
  lang?: Lang;
  /** Merged data (English + Spanish overlay). Defaults to the entry's own. */
  data?: Essay['data'];
  linkedTalks?: Talk[];
  /**
   * The other-language version exists. On the English essay it emits
   * `workTranslation`; on the Spanish one, `translationOfWork` back to the
   * original. Only pass true when both pages are built.
   */
  hasTranslation?: boolean;
}

export function essayNode(entry: Essay, options: EssayNodeOptions = {}): GraphNode {
  const { lang = 'en', linkedTalks = [], hasTranslation = false } = options;
  const { title, subtitle, date, updated, summary, description, themes, ogImage } =
    options.data ?? entry.data;
  const language = lang === 'en' ? entry.data.language : lang;
  const url = essayUrl(entry.id, lang);
  const themeNames = themes.map((theme) => themeLabel(theme, lang));
  return {
    '@type': 'BlogPosting',
    '@id': essayPostingId(entry.id, lang),
    headline: title,
    ...(subtitle ? { alternativeHeadline: subtitle } : {}),
    description: description ?? summary,
    url,
    mainEntityOfPage: ref(`${url}#webpage`),
    datePublished: isoDay(date),
    dateModified: isoDay(updated ?? date),
    inLanguage: language,
    ...(ogImage ? { image: `${SITE_URL}${ogImage}` } : {}),
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
    // The other-language article is declared inline (id + url + language), not
    // a bare reference: its own page is not in this page's graph.
    ...(hasTranslation
      ? lang === 'es'
        ? { translationOfWork: otherLanguageArticle(entry.id, 'en', entry.data.language) }
        : { workTranslation: otherLanguageArticle(entry.id, 'es', 'es') }
      : {}),
    ...(themes.length
      ? {
          about: themeNames.map((name) => ({ '@type': 'Thing', name })),
          keywords: themeNames.join(', '),
        }
      : {}),
    ...(linkedTalks.length
      ? {
          mentions: linkedTalks.map((t) => ({
            '@type': 'Event',
            '@id': talkEventId(t.id, lang),
            name: t.data.title,
            url: talkUrl(t.id, lang),
          })),
        }
      : {}),
  };
}

export function writingListId(lang: Lang = 'en'): string {
  return `${SITE_URL}${localizePath('/writing/', lang)}#essays`;
}

export const WRITING_LIST_ID = writingListId('en');

/** `ItemList` for /writing, newest first (the order the page shows them in). */
export function writingListNode(
  entries: { id: string; data: Pick<Essay['data'], 'title'> }[],
  lang: Lang = 'en'
): GraphNode {
  return {
    '@type': 'ItemList',
    '@id': writingListId(lang),
    name: `${useWriting(lang)('listLabel')} — ${AUTHOR}`,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: essayUrl(e.id, lang),
      name: e.data.title,
    })),
  };
}

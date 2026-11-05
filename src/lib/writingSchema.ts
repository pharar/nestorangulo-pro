import type { CollectionEntry } from 'astro:content';
import { SITE_URL, AUTHOR } from '../config';
import { PERSON_ID, ref, type GraphNode } from './structuredData';
import { talkEventId, talkUrl } from './talkSchema';

type Essay = CollectionEntry<'writing'>;
type Talk = CollectionEntry<'talks'>;

/** `2026-10-30T00:00:00Z` -> `2026-10-30`. Dates are authored as plain days. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function essayUrl(id: string): string {
  return `${SITE_URL}/writing/${id}/`;
}

export function essayPostingId(id: string): string {
  return `${essayUrl(id)}#article`;
}

/**
 * Ids of the talks an essay links to (`/speaking/<id>/` in its body — the
 * footnotes that point at the talk an argument comes from).
 */
export function talksLinkedFrom(entry: Essay, talks: Talk[]): Talk[] {
  const linked = new Set(
    [...(entry.body ?? '').matchAll(/\]\(\/speaking\/([^/)\s#?]+)\/?[^)]*\)/g)].map((m) => m[1])
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
export function essayNode(entry: Essay, linkedTalks: Talk[] = []): GraphNode {
  const { title, subtitle, date, updated, summary, description, language, themes, ogImage } =
    entry.data;
  const url = essayUrl(entry.id);
  return {
    '@type': 'BlogPosting',
    '@id': essayPostingId(entry.id),
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
    ...(themes.length
      ? {
          about: themes.map((name) => ({ '@type': 'Thing', name })),
          keywords: themes.join(', '),
        }
      : {}),
    ...(linkedTalks.length
      ? {
          mentions: linkedTalks.map((t) => ({
            '@type': 'Event',
            '@id': talkEventId(t.id),
            name: t.data.title,
            url: talkUrl(t.id),
          })),
        }
      : {}),
  };
}

export const WRITING_LIST_ID = `${SITE_URL}/writing/#essays`;

/** `ItemList` for /writing, newest first (the order the page shows them in). */
export function writingListNode(entries: Essay[]): GraphNode {
  return {
    '@type': 'ItemList',
    '@id': WRITING_LIST_ID,
    name: `Writing — ${AUTHOR}`,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: essayUrl(e.id),
      name: e.data.title,
    })),
  };
}

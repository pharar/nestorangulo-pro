import type { CollectionEntry } from 'astro:content';
import { SITE_URL, AUTHOR } from '../config';

type Essay = CollectionEntry<'writing'>;

/** `2026-10-30T00:00:00Z` -> `2026-10-30`. Dates are authored as plain days. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * schema.org markup for an essay page.
 *
 * `Article` with `author` pointing at the site's Person entity, so the essays
 * accrue to the same identity the talks do. As with talks, nothing is emitted
 * that the reader cannot see on the page.
 */
export function essaySchema(entry: Essay) {
  const { title, date, updated, summary, description, language, ogImage } = entry.data;
  const url = `${SITE_URL}/writing/${entry.id}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: title,
    description: description ?? summary,
    url,
    mainEntityOfPage: url,
    datePublished: isoDay(date),
    dateModified: isoDay(updated ?? date),
    inLanguage: language,
    ...(ogImage ? { image: `${SITE_URL}${ogImage}` } : {}),
    author: { '@id': `${SITE_URL}/#person`, '@type': 'Person', name: AUTHOR },
    publisher: { '@id': `${SITE_URL}/#person`, '@type': 'Person', name: AUTHOR },
  };
}

/** The /writing listing as a CollectionPage of Articles. */
export function writingListSchema(entries: Essay[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/writing/#collection`,
    name: `Writing — ${AUTHOR}`,
    url: `${SITE_URL}/writing/`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: entries.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/writing/${e.id}/`,
        name: e.data.title,
      })),
    },
  };
}

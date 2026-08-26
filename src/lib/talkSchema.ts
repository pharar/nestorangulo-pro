import type { CollectionEntry } from 'astro:content';
import { SITE_URL, AUTHOR } from '../config';

type Talk = CollectionEntry<'talks'>;

/**
 * schema.org markup for a talk page.
 *
 * The page documents a speaking engagement, so `Event` is the primary entity:
 * it is what carries `performer`, which is the edge that ties 35 conference
 * appearances to the Person entity. Without it a crawler sees prose about a
 * conference and has to guess who spoke.
 *
 * Everything emitted here has to be visible on the page too — structured data
 * that describes something the reader cannot see is a manual-action risk.
 */

/** A city is a place; the literal string "Online" is not. */
function isVirtual(location?: string): boolean {
  return !location || /^online$/i.test(location.trim());
}

/** `2019-11-02T00:00:00Z` -> `2019-11-02`. Dates are authored as plain days. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "Tokyo, Japan" -> locality + country. Anything that isn't exactly two parts
 * stays as an unparsed name, because guessing at address structure is worse
 * than omitting it.
 */
function placeOf(location: string) {
  const parts = location.split(',').map((p) => p.trim());
  if (parts.length !== 2) return { '@type': 'Place', name: location };
  return {
    '@type': 'Place',
    name: location,
    address: {
      '@type': 'PostalAddress',
      addressLocality: parts[0],
      addressCountry: parts[1],
    },
  };
}

/**
 * Thumbnails, where the host makes them derivable from the URL.
 *
 * Google wants `thumbnailUrl` on a VideoObject. YouTube and Dailymotion expose
 * a predictable path; wordpress.tv, which hosts most of these talks, does not —
 * those VideoObjects ship without one rather than with a fabricated URL.
 */
export function videoThumbnail(url: string): string | undefined {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const dm = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dm) return `https://www.dailymotion.com/thumbnail/video/${dm[1]}`;
  return undefined;
}

export function talkUrl(id: string): string {
  return `${SITE_URL}/speaking/${id}/`;
}

export function talkSchema(entry: Talk) {
  const d = entry.data;
  const url = talkUrl(entry.id);
  const day = isoDay(d.date);
  const description = d.description ?? d.summary;
  const virtual = isVirtual(d.location);

  const person = {
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: AUTHOR,
    url: SITE_URL,
  };

  const event: Record<string, unknown> = {
    '@type': 'Event',
    '@id': `${url}#event`,
    name: d.title,
    url,
    startDate: day,
    // Single-session talks: schema.org treats a missing endDate as open-ended.
    endDate: day,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: virtual
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: virtual
      ? { '@type': 'VirtualLocation', url: d.videoUrl ?? d.eventUrl ?? url }
      : placeOf(d.location as string),
    performer: person,
    superEvent: {
      '@type': 'Event',
      name: d.event,
      ...(d.eventUrl ? { url: d.eventUrl } : {}),
    },
    inLanguage: d.language,
    about: d.themes.map((name) => ({ '@type': 'Thing', name })),
    keywords: d.themes.join(', '),
  };

  if (description) event.description = description;

  const slides = d.slidesUrl ?? d.slidesUrlExt;
  if (slides) {
    event.workPerformed = {
      '@type': 'PresentationDigitalDocument',
      name: `${d.title} — slides`,
      url: slides,
      inLanguage: d.language,
      author: { '@id': person['@id'] },
      ...(d.slidesUrl ? { encodingFormat: 'application/pdf' } : {}),
    };
  }

  if (d.videoUrl) {
    const thumbnail = videoThumbnail(d.videoUrl);
    event.recordedIn = {
      '@type': 'VideoObject',
      name: d.title,
      contentUrl: d.videoUrl,
      // The talk date, not the upload date — the page states no upload date, so
      // claiming a precise one would be inventing data.
      uploadDate: day,
      inLanguage: d.language,
      ...(description ? { description } : {}),
      ...(thumbnail ? { thumbnailUrl: thumbnail } : {}),
    };
  }

  return { '@context': 'https://schema.org', '@graph': [event] };
}

/**
 * `ItemList` for /speaking — the index was as silent as the detail pages.
 *
 * Ordered newest-first by date, which is what `ItemListOrderDescending` claims.
 * Note this is deliberately NOT the visual order: the page pins featured talks
 * to the top and then groups the rest by year. The chronological list is the
 * one that can be stated truthfully in a single `itemListOrder`.
 */
export function speakingListSchema(talks: Talk[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}/speaking/#talks`,
    name: `Speaking — ${AUTHOR}`,
    numberOfItems: talks.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: talks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: talkUrl(t.id),
      name: t.data.title,
    })),
  };
}

import type { CollectionEntry } from 'astro:content';
import { SITE_URL, AUTHOR } from '../config';
import { PERSON_ID, personStubNode, ref } from './structuredData';
import type { Lang } from '../i18n/config';
import { localizePath } from '../i18n/utils';

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

/**
 * A city is a place; the literal string "Online" is not. A webinar is online
 * by definition, whatever the location field says.
 */
function isVirtual(location?: string, format?: string): boolean {
  return format === 'webinar' || !location || /^online$/i.test(location.trim());
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

export function talkUrl(id: string, lang: Lang = 'en'): string {
  return `${SITE_URL}${localizePath(`/speaking/${id}/`, lang)}`;
}

export function talkEventId(id: string, lang: Lang = 'en'): string {
  return `${talkUrl(id, lang)}#event`;
}

/**
 * The talk's `Event` node, for the page's `@graph`. The performer is a bare
 * `@id` reference: the graph it is placed in carries the Person node.
 */
export function talkEventNode(
  entry: Talk,
  lang: Lang = 'en',
  /** Localized data (Spanish overlay applied); event facts are the same either way. */
  data: Talk['data'] = entry.data
): Record<string, unknown> {
  const d = data;
  const url = talkUrl(entry.id, lang);
  const day = isoDay(d.date);
  const description = d.description ?? d.summary;
  const virtual = isVirtual(d.location, d.format);
  const person = ref(PERSON_ID);

  const event: Record<string, unknown> = {
    '@type': 'Event',
    '@id': talkEventId(entry.id, lang),
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
      author: person,
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

  return event;
}

/** Standalone wrapper, kept for callers outside the page `@graph`. */
export function talkSchema(entry: Talk) {
  return {
    '@context': 'https://schema.org',
    '@graph': [{ ...talkEventNode(entry), performer: personStubNode() }],
  };
}

export const SPEAKING_LIST_ID = `${SITE_URL}/speaking/#talks`;

export function speakingListId(lang: Lang = 'en'): string {
  return `${SITE_URL}${localizePath('/speaking/', lang)}#talks`;
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
  return { '@context': 'https://schema.org', ...speakingListNode(talks) };
}

export function speakingListNode(
  talks: Talk[],
  lang: Lang = 'en',
  /** Section title, e.g. `Speaking`; defaults to the English one. */
  sectionName = 'Speaking'
): Record<string, unknown> {
  return {
    '@type': 'ItemList',
    '@id': speakingListId(lang),
    name: `${sectionName} — ${AUTHOR}`,
    numberOfItems: talks.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: talks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: talkUrl(t.id, lang),
      name: t.data.title,
    })),
  };
}

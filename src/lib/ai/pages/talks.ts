/**
 * Markdown for `/speaking/` and every `/speaking/<id>/`.
 *
 * Facts come from the `talks` collection frontmatter; the talk body is the
 * entry's authored Markdown, untranslated, in the talk's own `language`.
 *
 * DUPLICATION: `FORMAT_LABELS`, the speaking intro/tagline and the
 * featured-then-by-year grouping mirror `src/pages/speaking.astro` and
 * `src/pages/speaking/[...id].astro`. Edit together.
 */
import type { CollectionEntry } from 'astro:content';
import { AUTHOR } from '../../../config';
import { getPublishedTalks } from '../../talks';
import { authored, blocks, isoDay, link, list, longDate, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

type Talk = CollectionEntry<'talks'>;

export const FORMAT_LABELS: Record<Talk['data']['format'], string> = {
  'conference-talk': 'Conference Talk',
  'meetup-talk': 'Meetup Talk',
  panel: 'Panel',
  podcast: 'Podcast',
  webinar: 'Webinar',
  ama: 'AMA',
  workshop: 'Workshop',
};

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', es: 'Spanish (Español)' };

/** Published talks, newest first. */
export async function getTalksNewestFirst(): Promise<Talk[]> {
  return (await getPublishedTalks()).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

function talkPath(id: string): string {
  return `/speaking/${id}/`;
}

function talkDescription(t: Talk): string {
  const d = t.data;
  return (
    d.description ??
    d.summary ??
    `${FORMAT_LABELS[d.format]} by ${AUTHOR} at ${d.event}, ${longDate(d.date)}.`
  );
}

/** Video · Slides · Event links, in the order the HTML shows them. */
function resourceLinks(t: Talk): string[] {
  const d = t.data;
  const slides = d.slidesUrl ?? d.slidesUrlExt;
  return [
    d.videoUrl && link('Video', d.videoUrl),
    slides && link('Slides', slides),
    d.eventUrl && link('Event', d.eventUrl),
  ].filter((x): x is string => Boolean(x));
}

function listItem(t: Talk): string {
  const d = t.data;
  const meta = [d.event, d.location, isoDay(d.date), FORMAT_LABELS[d.format]].filter(Boolean);
  const links = resourceLinks(t);
  return [
    `${link(d.title, talkPath(t.id))} — ${text(meta.join(' · '))}`,
    `  Themes: ${text(d.themes.join(', '))}.${links.length ? ` ${links.join(' · ')}` : ''}`,
  ].join('\n');
}

export async function speakingPage(): Promise<MarkdownPage> {
  const talks = await getTalksNewestFirst();
  const featured = talks.filter((t) => t.data.featured);
  const rest = talks.filter((t) => !t.data.featured);

  const years = new Map<number, Talk[]>();
  for (const t of rest) {
    const y = t.data.date.getUTCFullYear();
    years.set(y, [...(years.get(y) ?? []), t]);
  }

  const body = blocks(
    paragraph(
      'web security · vulnerability intelligence · software supply chain · security culture'
    ),
    paragraph(
      `${talks.length} appearances at WordCamps, industry conferences, podcasts, and webinars spanning web security, vulnerability intelligence, software supply chain, and security culture — across Europe and Japan.`
    ),
    featured.length > 0 && blocks('## Featured', list(featured.map(listItem))),
    years.size > 0 &&
      blocks(
        '## Archive',
        ...[...years.entries()]
          .sort(([a], [b]) => b - a)
          .map(([year, items]) => blocks(`### ${year}`, list(items.map(listItem))))
      )
  );

  return makePage({
    path: '/speaking/',
    title: `Speaking — ${AUTHOR}`,
    label: 'Speaking',
    description: `${talks.length} talks across WordCamps, conferences, podcasts and webinars — web security, vulnerability intelligence, software supply chain, and security culture.`,
    section: 'core',
    body,
  });
}

export function talkPage(t: Talk): MarkdownPage {
  const d = t.data;
  const slides = d.slidesUrl ?? d.slidesUrlExt;

  const facts = list(
    [
      `Format: ${FORMAT_LABELS[d.format]}`,
      `Event: ${d.eventUrl ? link(d.event, d.eventUrl) : text(d.event)}`,
      d.location && `Location: ${text(d.location)}`,
      `Date: ${isoDay(d.date)} (${longDate(d.date)})`,
      `Language: ${LANGUAGE_NAMES[d.language] ?? d.language}`,
      `Speaker: ${link(AUTHOR, '/about/')}`,
      `Themes: ${text(d.themes.join(', '))}`,
      d.videoUrl && `Video: ${link('Watch video', d.videoUrl)}`,
      slides && `Slides: ${link(d.slidesUrl ? 'View slides (PDF)' : 'View slides', slides)}`,
      d.slidesUrl &&
        d.slidesUrlExt &&
        `Slides on the event site: ${link('Event-hosted slides', d.slidesUrlExt)}`,
    ].filter((x): x is string => Boolean(x))
  );

  const body = blocks(
    facts,
    d.sourceNote && paragraph(`Note: ${d.sourceNote}`),
    authored(t.body),
    `${link('← All talks', '/speaking/')}`
  );

  return makePage({
    path: talkPath(t.id),
    title: `${d.title} — ${AUTHOR}`,
    label: d.title,
    description: talkDescription(t),
    lang: d.language,
    section: 'speaking',
    date: isoDay(d.date),
    body,
  });
}

/** One page per published talk, newest first. */
export async function talkPages(): Promise<MarkdownPage[]> {
  return (await getTalksNewestFirst()).map(talkPage);
}

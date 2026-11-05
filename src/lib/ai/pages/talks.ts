/**
 * Markdown for `/speaking/` and every `/speaking/<id>/`.
 *
 * Facts come from the `talks` collection frontmatter; on the English route the
 * body is the entry's authored Markdown in the talk's own `language`, on `/es/`
 * it is the `talksEs` overlay (summary + body).
 *
 * DUPLICATION: the featured-then-by-year grouping and the Video · Slides · Event
 * link order mirror `src/views/Speaking.astro`, `src/views/parts/TalkItem.astro`
 * and `src/views/SpeakingTalk.astro`. Edit together.
 */
import { AUTHOR } from '../../../config';
import type { Lang } from '../../../i18n/config';
import {
  deliveryLanguageName,
  formatLabel,
  placeLabel,
  useSpeaking,
} from '../../../i18n/ui/speaking';
import { themeLabel } from '../../../i18n/ui/themes';
import { formatDate, localizePath } from '../../../i18n/utils';
import { getLocalizedTalks, type LocalizedTalk } from '../../i18nContent';
import { authored, blocks, isoDay, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

/**
 * Copy (labels, intro, tagline, format labels, location names) lives in
 * `src/i18n/ui/speaking.ts`, shared with the HTML views, so only the
 * featured-then-by-year grouping and the link order are mirrored here.
 */

/** Long date in UTC, so the build machine's zone can't shift it. */
function longDate(d: Date, lang: Lang): string {
  return formatDate(d, lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Published talks in `lang`, newest first. */
export async function getTalksNewestFirst(lang: Lang = 'en'): Promise<LocalizedTalk[]> {
  return (await getLocalizedTalks(lang)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );
}

function talkPath(id: string, lang: Lang): string {
  return localizePath(`/speaking/${id}/`, lang);
}

function talkDescription(item: LocalizedTalk, lang: Lang): string {
  const d = item.data;
  const t = useSpeaking(lang);
  return (
    d.description ??
    d.summary ??
    t('mdDescriptionFallback', {
      format: formatLabel(d.format, lang),
      author: AUTHOR,
      event: d.event,
      date: longDate(d.date, lang),
    })
  );
}

/** Video · Slides · Event links, in the order the HTML shows them. */
function resourceLinks(item: LocalizedTalk, lang: Lang): string[] {
  const d = item.data;
  const t = useSpeaking(lang);
  const slides = d.slidesUrl ?? d.slidesUrlExt;
  return [
    d.videoUrl && link(t('mdVideo'), d.videoUrl),
    slides && link(t('mdSlides'), slides),
    d.eventUrl && link(t('mdEvent'), d.eventUrl),
  ].filter((x): x is string => Boolean(x));
}

function listItem(item: LocalizedTalk, lang: Lang): string {
  const d = item.data;
  const t = useSpeaking(lang);
  const meta = [
    d.event,
    d.location && placeLabel(d.location, lang),
    isoDay(d.date),
    formatLabel(d.format, lang),
  ].filter(Boolean);
  const links = resourceLinks(item, lang);
  return [
    `${link(d.title, talkPath(item.id, lang))} — ${text(meta.join(' · '))}`,
    `  ${t('mdThemes')}: ${text(d.themes.map((x) => themeLabel(x, lang)).join(', '))}.${links.length ? ` ${links.join(' · ')}` : ''}`,
  ].join('\n');
}

export async function speakingPage(lang: Lang = 'en'): Promise<MarkdownPage> {
  const t = useSpeaking(lang);
  const talks = await getTalksNewestFirst(lang);
  const featured = talks.filter((x) => x.data.featured);
  const rest = talks.filter((x) => !x.data.featured);

  const years = new Map<number, LocalizedTalk[]>();
  for (const x of rest) {
    const y = x.data.date.getUTCFullYear();
    years.set(y, [...(years.get(y) ?? []), x]);
  }

  const body = blocks(
    paragraph(t('tagline')),
    paragraph(t('intro', { count: talks.length })),
    featured.length > 0 &&
      blocks(`## ${t('mdFeatured')}`, list(featured.map((x) => listItem(x, lang)))),
    years.size > 0 &&
      blocks(
        `## ${t('mdArchive')}`,
        ...[...years.entries()]
          .sort(([a], [b]) => b - a)
          .map(([year, items]) => blocks(`### ${year}`, list(items.map((x) => listItem(x, lang)))))
      )
  );

  return makePage({
    path: localizePath('/speaking/', lang),
    title: t('mdTitle', { author: AUTHOR }),
    label: t('navLabel'),
    description: t('description', { count: talks.length }),
    lang,
    section: 'core',
    body,
  });
}

/**
 * One talk. `lang` is the route language: on `/es/` the facts and body are the
 * Spanish overlay's; on the English route the page keeps the talk's own
 * delivery language.
 */
export function talkPage(item: LocalizedTalk): MarkdownPage {
  const lang = item.lang;
  const t = useSpeaking(lang);
  const d = item.data;
  const slides = d.slidesUrl ?? d.slidesUrlExt;
  const body = item.overlay?.body ?? item.entry.body;

  const facts = list(
    [
      `${t('mdFormat')}: ${formatLabel(d.format, lang)}`,
      `${t('mdEvent')}: ${d.eventUrl ? link(d.event, d.eventUrl) : text(d.event)}`,
      d.location && `${t('mdLocation')}: ${text(placeLabel(d.location, lang))}`,
      `${t('mdDate')}: ${isoDay(d.date)} (${longDate(d.date, lang)})`,
      `${t('mdLanguage')}: ${deliveryLanguageName(d.language, lang)}`,
      `${t('mdSpeaker')}: ${link(AUTHOR, localizePath('/about/', lang))}`,
      `${t('mdThemes')}: ${text(d.themes.map((x) => themeLabel(x, lang)).join(', '))}`,
      d.videoUrl && `${t('mdVideo')}: ${link(t('mdWatchVideo'), d.videoUrl)}`,
      slides &&
        `${t('mdSlides')}: ${link(d.slidesUrl ? t('mdViewSlidesPdf') : t('mdViewSlides'), slides)}`,
      d.slidesUrl &&
        d.slidesUrlExt &&
        `${t('mdSlidesOnEventSite')}: ${link(t('mdEventSlides'), d.slidesUrlExt)}`,
    ].filter((x): x is string => Boolean(x))
  );

  const md = blocks(
    facts,
    d.sourceNote && paragraph(`${t('mdNote')}: ${d.sourceNote}`),
    authored(body),
    `${link(t('mdAllTalks'), localizePath('/speaking/', lang))}`
  );

  return makePage({
    path: talkPath(item.id, lang),
    title: `${d.title} — ${AUTHOR}`,
    label: d.title,
    description: talkDescription(item, lang),
    // /es/ pages are Spanish; the English route keeps the delivery language.
    lang: lang === 'es' ? 'es' : d.language,
    section: 'speaking',
    date: isoDay(d.date),
    body: md,
  });
}

/** One page per published talk in `lang`, newest first. */
export async function talkPages(lang: Lang = 'en'): Promise<MarkdownPage[]> {
  return (await getTalksNewestFirst(lang)).map(talkPage);
}

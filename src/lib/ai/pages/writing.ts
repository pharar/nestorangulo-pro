/**
 * Markdown for `/writing/` and every `/writing/<id>/`, and the `/es/` versions
 * (only essays with a Spanish translation).
 *
 * Facts come from the `writing` collection frontmatter; the essay body is the
 * entry's authored Markdown, in the essay's own `language`.
 *
 * DUPLICATION: the intro line, the empty-state copy and the listing fields
 * mirror `src/views/Writing.astro` and `src/views/WritingPost.astro` (the
 * copy lives in `src/i18n/ui/writing.ts`, shared with them).
 * Edit together.
 */
import type { ImageMetadata } from 'astro';
import { AUTHOR } from '../../../config';
import type { Lang } from '../../../i18n/config';
import { useWriting } from '../../../i18n/ui/writing';
import { themeLabel } from '../../../i18n/ui/themes';
import { formatDate, localizePath } from '../../../i18n/utils';
import { getLocalizedEssays, type LocalizedEssay } from '../../i18nContent';
import { authored, blocks, isoDay, link, list, longDate, paragraph, text, url } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', es: 'Spanish (Español)' };

function essayPath(id: string, lang: Lang): string {
  return localizePath(`/writing/${id}/`, lang);
}

function essayDescription(e: LocalizedEssay): string {
  return e.data.description ?? e.data.summary;
}

/** Long date for the facts list: English keeps `longDate`, Spanish uses es-ES (UTC). */
function dayLong(d: Date, lang: Lang): string {
  return lang === 'en'
    ? longDate(d)
    : formatDate(d, lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Essay figures are referenced relatively (`../../images/writing/x.jpg`) so
 * Astro processes them for the HTML. Off-site those paths mean nothing, so the
 * twin points at the asset Astro emitted for the same file instead.
 */
const IMAGES = import.meta.glob<{ default: ImageMetadata }>(
  '../../../images/writing/*.{jpg,jpeg,png,webp,avif,gif,svg}',
  { eager: true }
);

function imageUrl(relative: string): string | undefined {
  const name = relative.split('/').pop();
  const hit = Object.entries(IMAGES).find(([path]) => path.split('/').pop() === name);
  return hit ? url(hit[1].default.src) : undefined;
}

/** `![alt](../../images/…)` -> `![alt](https://…/_astro/…)`; unknown files keep their alt text. */
function resolveImages(md: string): string {
  return md.replace(/!\[([^\]]*)\]\((\.{1,2}\/[^)\s]+)\)/g, (_, alt: string, src: string) => {
    const resolved = imageUrl(src);
    return resolved ? `![${alt}](${resolved})` : `*Figure: ${alt}*`;
  });
}

function listItem(e: LocalizedEssay, lang: Lang): string {
  const t = useWriting(lang);
  const d = e.data;
  const themes = d.themes.map((theme) => themeLabel(theme, lang)).join(', ');
  return [
    `${link(d.title, essayPath(e.id, lang))} — ${isoDay(d.date)}`,
    d.subtitle && `  ${text(d.subtitle)}`,
    `  ${text(d.summary)}`,
    d.themes.length > 0 && `  ${t('mdThemes')}: ${text(themes)}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function writingPage(lang: Lang = 'en'): Promise<MarkdownPage> {
  const t = useWriting(lang);
  const essays = await getLocalizedEssays(lang);

  const body = blocks(
    paragraph(t('intro')),
    essays.length > 0
      ? list(essays.map((e) => listItem(e, lang)))
      : blocks(
          paragraph(t('mdComingNext')),
          link(t('mdSpeakingArchive'), localizePath('/speaking/', lang))
        )
  );

  return makePage({
    path: localizePath('/writing/', lang),
    title: `${t('listLabel')} — ${AUTHOR}`,
    label: t('listLabel'),
    description: t('listDescription'),
    lang,
    section: 'core',
    body,
  });
}

export function writingPostPage(e: LocalizedEssay): MarkdownPage {
  const lang = e.lang;
  const t = useWriting(lang);
  const d = e.data;
  const body = e.overlay?.body ?? e.entry.body;
  const contentLang = lang === 'en' ? d.language : lang;
  const languageName =
    lang === 'en' ? (LANGUAGE_NAMES[contentLang] ?? contentLang) : t('mdLanguageName');

  const facts = list(
    [
      d.subtitle && `${t('mdSubtitle')}: ${text(d.subtitle)}`,
      `${t('mdPublished')}: ${isoDay(d.date)} (${dayLong(d.date, lang)})`,
      d.updated && `${t('mdUpdated')}: ${isoDay(d.updated)} (${dayLong(d.updated, lang)})`,
      `${t('mdLanguage')}: ${languageName}`,
      `${t('mdAuthor')}: ${link(AUTHOR, localizePath('/about/', lang))}`,
      d.themes.length > 0 &&
        `${t('mdThemes')}: ${text(d.themes.map((theme) => themeLabel(theme, lang)).join(', '))}`,
    ].filter((x): x is string => Boolean(x))
  );

  const cover = d.cover ? `![${text(d.coverAlt ?? '')}](${url(d.cover.src)})` : '';

  const md = blocks(
    facts,
    cover,
    resolveImages(authored(body)),
    `${link(t('mdAllWriting'), localizePath('/writing/', lang))}`
  );

  return makePage({
    path: essayPath(e.id, lang),
    title: `${d.title} — ${AUTHOR}`,
    label: d.title,
    description: essayDescription(e),
    lang: contentLang,
    section: 'writing',
    date: isoDay(d.date),
    body: md,
  });
}

/** One page per published essay in `lang`, newest first. */
export async function writingPostPages(lang: Lang = 'en'): Promise<MarkdownPage[]> {
  return (await getLocalizedEssays(lang)).map(writingPostPage);
}

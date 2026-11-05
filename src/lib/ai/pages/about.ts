/**
 * Markdown for `/about/` and `/es/about/`.
 *
 * Copy comes from `src/i18n/ui/about.ts` (shared with `src/views/About.astro` and
 * its components, so page and twin cannot drift); credentials, service roles and
 * publications from `src/data/*`.
 *
 * DUPLICATION: only the structure is repeated — the credential/service meta lines
 * mirror `Credentials.astro` / `Service.astro`, and the publication citation
 * format (`authors()` below) mirrors `Publications.astro`. Edit together.
 */
import { credentials } from '../../../data/credentials';
import { publications, type Publication } from '../../../data/publications';
import { serviceRoles } from '../../../data/service';
import type { Lang } from '../../../i18n/config';
import { localized } from '../../../i18n/localized';
import { useAbout } from '../../../i18n/ui/about';
import { localizePath } from '../../../i18n/utils';
import { formatYearMonth } from '../../yearMonth';
import { getPublishedTalks, talkCountRounded } from '../../talks';
import { blocks, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

type T = ReturnType<typeof useAbout>;

function credentialItem(c: (typeof credentials)[number], t: T, lang: Lang): string {
  const meta = [
    c.issuer,
    c.type ? localized(c.type, lang) : undefined,
    c.eqfLevel ? t('eqf', { n: c.eqfLevel }) : undefined,
    c.validUntil ? t('validUntil', { date: formatYearMonth(c.validUntil, lang) }) : undefined,
    c.yearCompleted ? String(c.yearCompleted) : undefined,
    c.since ? t('since', { date: formatYearMonth(c.since, lang) }) : undefined,
  ].filter(Boolean) as string[];
  let line = `**${text(localized(c.title, lang))}** — ${text(meta.join(' · '))}`;
  if (c.verifyUrl) line += ` (${link(t('verify'), c.verifyUrl)})`;
  if (c.note) line += `. ${text(localized(c.note, lang))}`;
  return line;
}

function serviceItem(r: (typeof serviceRoles)[number], t: T, lang: Lang): string {
  const when = r.since
    ? r.until
      ? `${formatYearMonth(r.since, lang)} – ${formatYearMonth(r.until, lang)}`
      : t('since', { date: formatYearMonth(r.since, lang) })
    : undefined;
  const parts = [r.organization, r.type ? localized(r.type, lang) : undefined, when].filter(
    Boolean
  ) as string[];
  let line = `**${text(r.title)}** — ${text(parts.join(' · '))}`;
  if (r.note) line += `. ${text(localized(r.note, lang))}`;
  return line;
}

function authors(coAuthors: string[] = [], t: T, lang: Lang): string {
  const all = ['Angulo de Ugarte, N.', ...coAuthors];
  if (all.length === 1) return all[0];
  const last = all[all.length - 1];
  const rest = all.slice(0, -1).join(', ');
  return lang === 'es' ? `${rest} ${t('pubAnd')} ${last}` : `${rest}, & ${last}`;
}

function publicationItem(p: Publication, t: T, lang: Lang): string {
  const type = p.type === 'book_chapter' ? t('pubBookChapter') : t('pubConferencePaper');
  const parts = [
    `${text(authors(p.coAuthors, t, lang))} (${p.year}). ${text(p.title)}.`,
    p.in ? `${t('pubIn')} _${text(p.in)}_.` : '',
    p.venue ? `_${text(p.venue)}_.` : '',
    p.publisher ? `${text(p.publisher)}.` : '',
    p.isbn ? `ISBN ${text(p.isbn)}.` : '',
    `(${type})`,
  ];
  return parts.filter(Boolean).join(' ');
}

export async function aboutPage(lang: Lang = 'en'): Promise<MarkdownPage> {
  const t = useAbout(lang);
  const count = (await getPublishedTalks()).length;
  const rounded = talkCountRounded(count);
  const to = (path: string) => localizePath(path, lang);

  const body = blocks(
    paragraph(t('tagline')),
    `## ${t('bioLabel')}`,
    paragraph(t('bio1')),
    paragraph(t('bio2')),
    paragraph(t('bio3')),
    paragraph(t('bio4', { rounded })),
    `## ${t('credentialsHeading')}`,
    list(credentials.map((c) => credentialItem(c, t, lang))),
    `## ${t('speakingHeading')}`,
    paragraph(t('speakingText', { count })),
    list([
      link(t('speakingArchive'), to('/speaking/')),
      link(t('speakingWptv'), 'https://wordpress.tv/?s=nestor+angulo'),
    ]),
    `## ${t('serviceHeading')}`,
    list(serviceRoles.map((r) => serviceItem(r, t, lang))),
    `## ${t('publicationsHeading')}`,
    publications.map((p, i) => `${i + 1}. ${publicationItem(p, t, lang)}`).join('\n'),
    `## ${t('pressHeading')}`,
    `### ${t('oneLinerLabel')}`,
    `> ${text(t('oneLiner', { rounded }))}`,
    `### ${t('shortBioLabel')}`,
    `> ${text(t('shortBio', { rounded }))}`,
    `### ${t('photoLabel')}`,
    list([
      link(t('photoPortraitMd'), '/images/photo-nestor-hires-a.jpg'),
      link(t('photoAthensMd'), '/images/photo-nestor-hires-b.jpg'),
    ]),
    paragraph(t('photoNote'))
  );

  return makePage({
    path: to('/about/'),
    title: t('title'),
    label: t('breadcrumb'),
    description: t('description', { rounded }),
    lang,
    section: 'core',
    body,
  });
}

/**
 * Markdown for `/writing/` and every `/writing/<id>/`.
 *
 * Facts come from the `writing` collection frontmatter; the essay body is the
 * entry's authored Markdown, in the essay's own `language`.
 *
 * DUPLICATION: the intro line, the empty-state copy and the listing fields
 * mirror `src/pages/writing.astro` and `src/pages/writing/[...id].astro`.
 * Edit together.
 */
import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { AUTHOR } from '../../../config';
import { getPublishedEssays } from '../../writing';
import { authored, blocks, isoDay, link, list, longDate, paragraph, text, url } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

type Essay = CollectionEntry<'writing'>;

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', es: 'Spanish (Español)' };

const DESCRIPTION =
  'Essays on security program design, vulnerability intelligence, incident response, and organizational security practice.';

function essayPath(id: string): string {
  return `/writing/${id}/`;
}

function essayDescription(e: Essay): string {
  return e.data.description ?? e.data.summary;
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

function listItem(e: Essay): string {
  const d = e.data;
  return [
    `${link(d.title, essayPath(e.id))} — ${isoDay(d.date)}`,
    d.subtitle && `  ${text(d.subtitle)}`,
    `  ${text(d.summary)}`,
    d.themes.length > 0 && `  Themes: ${text(d.themes.join(', '))}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function writingPage(): Promise<MarkdownPage> {
  const essays = await getPublishedEssays();

  const body = blocks(
    paragraph(
      'Essays on security program design, vulnerability intelligence, and operational practice.'
    ),
    essays.length > 0
      ? list(essays.map(listItem))
      : blocks(
          paragraph('Coming next. In the meantime, see the talks:'),
          link('Speaking archive', '/speaking/')
        )
  );

  return makePage({
    path: '/writing/',
    title: `Writing — ${AUTHOR}`,
    label: 'Writing',
    description: DESCRIPTION,
    section: 'core',
    body,
  });
}

export function writingPostPage(e: Essay): MarkdownPage {
  const d = e.data;

  const facts = list(
    [
      d.subtitle && `Subtitle: ${text(d.subtitle)}`,
      `Published: ${isoDay(d.date)} (${longDate(d.date)})`,
      d.updated && `Updated: ${isoDay(d.updated)} (${longDate(d.updated)})`,
      `Language: ${LANGUAGE_NAMES[d.language] ?? d.language}`,
      `Author: ${link(AUTHOR, '/about/')}`,
      d.themes.length > 0 && `Themes: ${text(d.themes.join(', '))}`,
    ].filter((x): x is string => Boolean(x))
  );

  const cover = d.cover ? `![${text(d.coverAlt ?? '')}](${url(d.cover.src)})` : '';

  const body = blocks(
    facts,
    cover,
    resolveImages(authored(e.body)),
    `${link('← All writing', '/writing/')}`
  );

  return makePage({
    path: essayPath(e.id),
    title: `${d.title} — ${AUTHOR}`,
    label: d.title,
    description: essayDescription(e),
    lang: d.language,
    section: 'writing',
    date: isoDay(d.date),
    body,
  });
}

/** One page per published essay, newest first. */
export async function writingPostPages(): Promise<MarkdownPage[]> {
  return (await getPublishedEssays()).map(writingPostPage);
}

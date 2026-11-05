import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { AUTHOR, DEFAULT_DESCRIPTION } from '../config';

/**
 * The essays feed. Published essays only, newest first. Each item carries the
 * listing blurb (`description ?? summary`) and not the full text: the feed is
 * a pointer to the page, which is where the essay, its footnotes and its
 * figures are meant to be read. See documentation/WRITING.md.
 */
export async function GET(context: APIContext) {
  const essays = (await getCollection('writing'))
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `Writing — ${AUTHOR}`,
    description: DEFAULT_DESCRIPTION,
    site: context.site!,
    items: essays.map((e) => ({
      title: e.data.title,
      link: `/writing/${e.id}/`,
      pubDate: e.data.date,
      description: e.data.description ?? e.data.summary,
      categories: e.data.themes,
    })),
  });
}

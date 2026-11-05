import { getCollection } from 'astro:content';

/**
 * Published essays (no drafts), newest first. The HTML routes and the Markdown
 * twins both list from here, so the two can never disagree on what exists.
 */
export async function getPublishedEssays() {
  return (await getCollection('writing'))
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

import { getCollection } from 'astro:content';

/**
 * Articles default to `draft: true` (see content.config.ts), so this filter is the
 * only thing standing between a working draft and the public site. Every consumer
 * goes through it — do not call `getCollection('articles')` directly in a page.
 */
export async function getPublishedArticles() {
  const all = await getCollection('articles');
  return all
    .filter((a) => !a.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

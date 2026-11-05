import type { APIRoute, GetStaticPaths } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getPublishedEssays } from '../../lib/writing';
import { markdownResponse } from '../../lib/ai/page';
import { writingPostPage } from '../../lib/ai/pages/writing';

export const getStaticPaths = (async () => {
  const essays = await getPublishedEssays();
  return essays.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'writing'> }> = ({ props }) =>
  markdownResponse(writingPostPage(props.entry));

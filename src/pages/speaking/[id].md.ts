import type { APIRoute, GetStaticPaths } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getPublishedTalks } from '../../lib/talks';
import { markdownResponse } from '../../lib/ai/page';
import { talkPage } from '../../lib/ai/pages/talks';

export const getStaticPaths = (async () => {
  const talks = await getPublishedTalks();
  return talks.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'talks'> }> = ({ props }) =>
  markdownResponse(talkPage(props.entry));

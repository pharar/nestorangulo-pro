import type { APIRoute, GetStaticPaths } from 'astro';
import { getLocalizedEssays, type LocalizedEssay } from '../../../lib/i18nContent';
import { markdownResponse } from '../../../lib/ai/page';
import { writingPostPage } from '../../../lib/ai/pages/writing';

export const getStaticPaths = (async () => {
  const essays = await getLocalizedEssays('es');
  return essays.map((item) => ({ params: { id: item.id }, props: { item } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ item: LocalizedEssay }> = ({ props }) =>
  markdownResponse(writingPostPage(props.item));

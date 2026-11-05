import type { APIRoute, GetStaticPaths } from 'astro';
import { getLocalizedTalks, type LocalizedTalk } from '../../../lib/i18nContent';
import { markdownResponse } from '../../../lib/ai/page';
import { talkPage } from '../../../lib/ai/pages/talks';

export const getStaticPaths = (async () => {
  const talks = await getLocalizedTalks('es');
  return talks.map((talk) => ({ params: { id: talk.id }, props: { talk } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ talk: LocalizedTalk }> = ({ props }) =>
  markdownResponse(talkPage(props.talk));

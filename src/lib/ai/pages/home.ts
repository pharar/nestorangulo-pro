/**
 * Markdown for `/` and `/es/`.
 *
 * All copy comes from `src/i18n/ui/home.ts`, the same dictionary the HTML view
 * (`src/views/Home.astro`) renders, so the twin and the page cannot drift.
 * Only the Markdown-specific bits (the link list) are assembled here.
 */
import { AUTHOR, JOB_TITLE } from '../../../config';
import type { Lang } from '../../../i18n/config';
import { useHome } from '../../../i18n/ui/home';
import { localizePath } from '../../../i18n/utils';
import { getPublishedTalks, talkCountRounded } from '../../talks';
import { blocks, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

export async function homePage(lang: Lang = 'en'): Promise<MarkdownPage> {
  const t = useHome(lang);
  const count = (await getPublishedTalks()).length;
  const rounded = talkCountRounded(count);
  const to = (path: string) => localizePath(path, lang);

  const body = blocks(
    paragraph(`${AUTHOR} · ${JOB_TITLE} · CISSP`),
    `## ${t('headline')}`,
    paragraph(`${t('tagline1')} ${t('tagline2')} ${t('tagline3')}`),
    paragraph(t('manifesto1')),
    paragraph(t('manifesto2')),
    paragraph(t('manifesto3')),
    paragraph(t('manifesto4', { rounded })),
    `## ${t('exploreLabel')}`,
    list([
      `${link(t('writingLabel'), to('/writing/'))} — ${text(t('writingDesc'))}`,
      `${link(t('speakingLabel'), to('/speaking/'))} — ${text(t('speakingDesc', { count }))}`,
      `${link(t('aboutLabel'), to('/about/'))} — ${text(t('aboutDesc'))}`,
      `${link(t('contactLabel'), to('/contact/'))} — ${text(t('contactDesc'))}`,
    ])
  );

  return makePage({
    path: to('/'),
    title: t('title'),
    label: lang === 'en' ? 'Home' : 'Inicio',
    description: t('description'),
    lang,
    section: 'core',
    body,
  });
}

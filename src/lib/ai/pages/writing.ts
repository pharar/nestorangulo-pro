/**
 * Markdown for `/writing/`.
 *
 * The writing collection is not on this branch yet, so this mirrors the
 * current placeholder page. DUPLICATION: copy from `src/pages/writing.astro`.
 *
 * When the collection lands:
 *   1. add `writingPostPage(entry)` here (mirror `talkPage` in ./talks.ts,
 *      `section: 'writing'`) and a `writingPostPages()` lister;
 *   2. list the posts in `writingPage()` below;
 *   3. add `...(await writingPostPages())` in ../registry.ts;
 *   4. add `src/pages/writing/[id].md.ts` (copy `speaking/[id].md.ts`).
 */
import { AUTHOR } from '../../../config';
import { blocks, link, paragraph } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

export function writingPage(): MarkdownPage {
  const body = blocks(
    paragraph(
      'Essays on security program design, vulnerability intelligence, and operational practice.'
    ),
    paragraph('Coming next. In the meantime, see the talks:'),
    link('Speaking archive', '/speaking/')
  );

  return makePage({
    path: '/writing/',
    title: `Writing — ${AUTHOR}`,
    label: 'Writing',
    description:
      'Essays on security program design, vulnerability intelligence, incident response, and organizational security practice.',
    section: 'core',
    body,
  });
}

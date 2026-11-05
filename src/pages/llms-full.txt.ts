/**
 * `/llms-full.txt` — every Markdown twin (src/lib/ai/registry.ts order: core
 * pages, then talks newest first) concatenated into one file, for agents that
 * want the whole site in a single fetch. Each page keeps its own `# ` header
 * and `Canonical:` line; an HTML comment naming its `.md` URL separates them.
 * See documentation/AI-READABLE.md.
 */
import type { APIRoute } from 'astro';
import { AUTHOR, DEFAULT_DESCRIPTION } from '../config';
import { blocks, text, url } from '../lib/ai/markdown';
import { markdownResponse } from '../lib/ai/page';
import { getMarkdownPages } from '../lib/ai/registry';

export const GET: APIRoute = async () => {
  const pages = await getMarkdownPages();

  const preamble = blocks(
    `# ${text(`${AUTHOR} — full site content`)}`,
    `> ${text(`Personal site of ${AUTHOR}. ${DEFAULT_DESCRIPTION}`)}`,
    `${text(`The Markdown version of all ${pages.length} pages of the site, one after another, each starting with its own title, summary and canonical URL. The curated index is`)} ${url('/llms.txt')}${text('; cite the canonical HTML URLs.')}`
  );

  const sections = pages.map(
    (p, i) => `---\n\n<!-- Page ${i + 1} of ${pages.length}: ${p.mdUrl} -->\n\n${p.markdown.trim()}`
  );

  return markdownResponse(`${[preamble, ...sections].join('\n\n')}\n`);
};

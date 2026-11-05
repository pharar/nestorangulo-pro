/**
 * `/llms.txt` — the curated index of the site for LLMs and agents, per
 * https://llmstxt.org/: `# ` H1, `> ` summary, a plain paragraph, then `## `
 * sections of `- [label](url): description` links.
 *
 * Every entry comes from the Markdown registry (src/lib/ai/registry.ts), so a
 * page listed here always has a `.md` twin; the facts come from config.ts and
 * the Person schema, not new copy. See documentation/AI-READABLE.md.
 */
import type { APIRoute } from 'astro';
import { AUTHOR, DEFAULT_DESCRIPTION, JOB_TITLE } from '../config';
import { personSchema } from '../lib/person';
import { blocks, link, list, paragraph, text } from '../lib/ai/markdown';
import { markdownResponse } from '../lib/ai/page';
import { getMarkdownPagesBySection } from '../lib/ai/registry';
import type { MarkdownPage } from '../lib/ai/types';

const languageName = new Intl.DisplayNames(['en'], { type: 'language' });

function entry(p: MarkdownPage, meta: string[] = []): string {
  const prefix = meta.length ? `${text(meta.join(' · '))} — ` : '';
  return `${link(p.label, p.mdUrl)}: ${prefix}${text(p.description)}`;
}

function talkEntry(p: MarkdownPage): string {
  return entry(
    p,
    [p.date, languageName.of(p.lang) ?? p.lang].filter((x): x is string => !!x)
  );
}

export const GET: APIRoute = async () => {
  const [core, talks, essays] = await Promise.all([
    getMarkdownPagesBySection('core'),
    getMarkdownPagesBySection('speaking'),
    getMarkdownPagesBySection('writing'),
  ]);

  const p = personSchema;
  const facts = paragraph(
    `${AUTHOR} is ${JOB_TITLE} and holds the ${p.hasCredential.name} (${p.hasCredential.issuedBy.name}); ` +
      `${p.memberOf.roleName} at the ${p.memberOf.name}; alumnus of ${p.alumniOf.name}. ` +
      `Areas: ${p.knowsAbout.filter((k) => k !== p.hasCredential.name).join(', ')}. ` +
      `The site archives ${talks.length} talks. Each link below points to a page's Markdown version; ` +
      'the HTML page at the same path (/about/ for /about.md) is canonical and is the URL to cite. ' +
      'llms-full.txt holds all of them in one file.'
  );

  const body = blocks(
    `# ${text(AUTHOR)}`,
    `> ${text(`Personal site of ${AUTHOR}. ${DEFAULT_DESCRIPTION}`)}`,
    facts,
    '## Core pages',
    list(core.map((c) => entry(c))),
    talks.length > 0 && blocks('## Speaking', list(talks.map(talkEntry))),
    essays.length > 0 &&
      blocks('## Writing', list(essays.map((e) => entry(e, e.date ? [e.date] : [])))),
    '## Optional',
    list([
      `${link('llms-full.txt', '/llms-full.txt')}: ${text('Every page above, concatenated into one Markdown file.')}`,
      `${link('Sitemap', '/sitemap-index.xml')}: ${text('XML sitemap of the canonical HTML pages.')}`,
      `${link('Home (HTML)', '/')}: ${text('The canonical HTML home page.')}`,
    ])
  );

  return markdownResponse(`${body}\n`);
};

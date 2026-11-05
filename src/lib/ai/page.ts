import { blocks, pageHeader } from './markdown';
import { absoluteUrl, markdownPathFor } from './paths';
import type { MarkdownPage, MarkdownSection } from './types';

export interface PageInput {
  /** HTML pathname, trailing-slash form: `/about/`. */
  path: string;
  title: string;
  label: string;
  description: string;
  lang?: string;
  section: MarkdownSection;
  date?: string;
  /** Markdown after the header (no `# Title` — the header provides it). */
  body: string;
}

/** Assemble a `MarkdownPage`: derive URLs and prepend the standard header. */
export function makePage(input: PageInput): MarkdownPage {
  const mdPath = markdownPathFor(input.path);
  if (!mdPath) throw new Error(`No Markdown path for ${input.path}`);
  const htmlUrl = absoluteUrl(input.path);
  const markdown = `${blocks(pageHeader(input.title, input.description, htmlUrl), input.body)}\n`;
  return {
    path: input.path,
    htmlUrl,
    mdPath,
    mdUrl: absoluteUrl(mdPath),
    title: input.title,
    label: input.label,
    description: input.description,
    lang: input.lang ?? 'en',
    section: input.section,
    ...(input.date ? { date: input.date } : {}),
    markdown,
  };
}

/** Response for a `.md` endpoint. */
export function markdownResponse(page: MarkdownPage | string): Response {
  const body = typeof page === 'string' ? page : page.markdown;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

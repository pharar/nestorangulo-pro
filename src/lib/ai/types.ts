/**
 * `core`     — top-level pages (home, about, speaking index, writing index, contact)
 * `speaking` — one entry per talk
 * `writing`  — one entry per essay
 */
export type MarkdownSection = 'core' | 'speaking' | 'writing';

export interface MarkdownPage {
  /** HTML pathname, canonical trailing-slash form: `/about/`. */
  path: string;
  /** Absolute canonical HTML URL: `https://nestorangulo.pro/about/`. */
  htmlUrl: string;
  /** Root-relative Markdown pathname: `/about.md`. */
  mdPath: string;
  /** Absolute Markdown URL: `https://nestorangulo.pro/about.md`. */
  mdUrl: string;
  /** The page's `<title>`, as the HTML page states it. */
  title: string;
  /** Short name for link lists (llms.txt): `About`, or the talk title. */
  label: string;
  /** Full (untruncated) page description. */
  description: string;
  /** BCP 47 content language of the page: `en`, `es`. */
  lang: string;
  section: MarkdownSection;
  /** ISO day for dated content (talks, essays). */
  date?: string;
  /** The complete Markdown document, header included. */
  markdown: string;
}

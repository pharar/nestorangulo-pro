/**
 * Small, dependency-free helpers for emitting Markdown safely.
 *
 * Data from collections and `src/data/*` is plain text: it goes through
 * `text()` so a stray `*`, `[` or `<` cannot turn into emphasis, a link or an
 * HTML tag. Authored Markdown (talk bodies) is passed through as-is, with only
 * its root-relative links made absolute.
 */
import { absoluteUrl } from './paths';

/** Escape plain text for use inline in Markdown. */
export function text(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>|]/g, (c) => `\\${c}`);
}

/** Escape text that may start a line, so it is never read as a block marker. */
export function paragraph(value: string): string {
  return text(value).replace(/^([#>+-]|\d+[.)])(?=\s|$)/, (m) => `\\${m}`);
}

/** A URL safe to put inside `(...)`, made absolute when root-relative. */
export function url(href: string): string {
  return absoluteUrl(href.trim()).replace(/[\s()<>]/g, (c) => encodeURIComponent(c));
}

/** `[label](https://…)`, with the label escaped and the URL made absolute. */
export function link(label: string, href: string): string {
  return `[${text(label)}](${url(href)})`;
}

/** Bulleted list; items are already-rendered Markdown. Empty input -> ''. */
export function list(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

/** Join blocks with blank lines, dropping empty ones. */
export function blocks(...parts: Array<string | false | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => p.trim())
    .join('\n\n');
}

/**
 * Authored Markdown (a collection entry body): make root-relative link and
 * image targets absolute so the document still works off-site.
 */
export function authored(md: string | undefined): string {
  if (!md) return '';
  return md
    .replace(
      /(\]\()(\/(?!\/)[^)\s]*)/g,
      (_, open: string, path: string) => open + absoluteUrl(path)
    )
    .replace(
      /^(\[[^\]]+\]:\s*)(\/(?!\/)\S*)/gm,
      (_, open: string, path: string) => open + absoluteUrl(path)
    )
    .trim();
}

/** The header every `.md` page starts with. */
export function pageHeader(title: string, description: string, canonical: string): string {
  return blocks(`# ${text(title)}`, `> ${text(description)}`, `Canonical: ${url(canonical)}`);
}

/** `2019-11-02T00:00:00Z` -> `2019-11-02`. Dates are authored as plain days. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** `2019-11-02` -> `November 2, 2019` (UTC, so the build machine's zone can't shift it). */
export function longDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2025-01` -> `Jan 2025`; `2025` -> `2025`. Mirrors the about-page components. */
export function yearMonth(value: string): string {
  const [year, month] = value.split('-');
  return month ? `${MONTHS[parseInt(month, 10) - 1]} ${year}` : year;
}

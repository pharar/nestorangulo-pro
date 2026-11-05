/**
 * Read and edit the frontmatter of a content card, one field at a time.
 *
 * Why not parse, change and re-serialise: a YAML round-trip rewrites quotes,
 * drops comments (`date: 2023-10-21 # ⚠` carries a review marker the owner put
 * there) and reorders nothing but reflows everything. Those cards are authored
 * prose; an automated flip of `draft: true` must change that one line and not a
 * byte more. So edits here are textual, by line, inside the frontmatter block —
 * and then verified by parsing the result and checking the value landed and
 * every other key kept its value.
 *
 * Scope is deliberately narrow: top-level scalars (boolean, string, ISO date,
 * URL). Lists such as `themes` are refused, not guessed at.
 *
 * Callers: the `post` and `talk` skills' scripts. Dependency: `yaml`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'yaml';

const FENCE = /^---[ \t]*\r?\n([\s\S]*?)(\r?\n)---[ \t]*(?:\r?\n|$)/;

/** Splits a file into the frontmatter text and the byte offsets around it. */
function split(text, file) {
  const m = text.match(FENCE);
  if (!m) throw new Error(`${file}: no frontmatter block (--- … ---)`);
  const start = m[0].indexOf(m[1], 3);
  return { frontmatter: m[1], start, end: start + m[1].length };
}

function parseYaml(frontmatter, file) {
  try {
    return parse(frontmatter) ?? {};
  } catch (err) {
    throw new Error(`${file}: frontmatter is not valid YAML: ${err.message}`);
  }
}

/** `{ data, body, frontmatter }` — parsed fields, text after the block, raw block text. */
export function readEntry(file) {
  const text = readFileSync(file, 'utf8');
  const { frontmatter, end } = split(text, file);
  const body = text.slice(end).replace(/^\r?\n---[ \t]*\r?\n?/, '');
  return { data: parseYaml(frontmatter, file), body, frontmatter };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the top-level line for `key`. Returns null when absent; throws when its
 * value is a block, sequence, flow collection or multi-line scalar.
 */
function locate(lines, key, file) {
  const keyRe = new RegExp(`^${escapeRe(key)}:(.*)$`);
  const i = lines.findIndex((l) => keyRe.test(l));
  if (i === -1) return null;

  const rest = lines[i].match(keyRe)[1];
  const value = rest.trim();
  const next = lines[i + 1] ?? '';
  const nonScalar =
    /^[|>]/.test(value) ||
    /^[[{]/.test(value) ||
    (value === '' && /^(\s+|-\s)/.test(next)) ||
    (/^'/.test(value) && !/^'(?:[^']|'')*'(?:\s+#.*)?$/.test(value)) ||
    (/^"/.test(value) && !/^"(?:[^"\\]|\\.)*"(?:\s+#.*)?$/.test(value));
  if (nonScalar) {
    throw new Error(
      `${file}: "${key}" is a block or multi-line value; only scalar fields are edited`
    );
  }

  // Keep a trailing comment (and the spacing before it) exactly as written.
  const lead = rest.match(/^\s*/)[0];
  const quoted = value.match(/^('(?:[^']|'')*'|"(?:[^"\\]|\\.)*")(\s+#.*)?$/);
  const comment = quoted ? (quoted[2] ?? '') : (value.match(/\s+#.*$/)?.[0] ?? '');
  return { index: i, lead: lead || ' ', comment };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/[^\s#]+$/;

/** How a JS value is written: booleans and numbers bare, dates and URLs unquoted, the rest single-quoted. */
function render(value, as) {
  if (typeof value === 'boolean') return { text: String(value), expect: value };
  if (value instanceof Date) value = value.toISOString().slice(0, 10);
  if (typeof value !== 'string') throw new Error(`unsupported value type: ${typeof value}`);
  if (/[\r\n]/.test(value)) throw new Error('multi-line values are not supported');

  const kind = as ?? (ISO_DATE.test(value) ? 'date' : URL_RE.test(value) ? 'url' : 'string');
  if (kind === 'date' && !ISO_DATE.test(value)) throw new Error(`not an ISO date: ${value}`);
  if (kind === 'url' && !URL_RE.test(value)) throw new Error(`not a plain URL: ${value}`);
  if (kind === 'date' || kind === 'url') return { text: value, expect: value };
  return { text: `'${value.replace(/'/g, "''")}'`, expect: value };
}

/** Applies `edit(lines)` to the frontmatter lines, verifies, and writes unless dryRun. */
function rewrite(file, key, dryRun, expect, edit) {
  const text = readFileSync(file, 'utf8');
  const { frontmatter, start, end } = split(text, file);
  const eol = frontmatter.includes('\r\n') ? '\r\n' : '\n';
  const lines = frontmatter.split(/\r?\n/);
  const beforeData = parseYaml(frontmatter, file);

  const { before, after } = edit(lines);
  const nextFrontmatter = lines.join(eol);
  const afterData = parseYaml(nextFrontmatter, file);

  const wanted = { ...beforeData };
  if (expect.remove) delete wanted[key];
  else wanted[key] = expect.value;
  if (!isDeepStrictEqual(afterData, wanted)) {
    throw new Error(
      `${file}: editing "${key}" did not produce the expected frontmatter; nothing written`
    );
  }

  const changed = nextFrontmatter !== frontmatter;
  if (changed && !dryRun) {
    writeFileSync(file, text.slice(0, start) + nextFrontmatter + text.slice(end));
  }
  return { changed, before, after };
}

/**
 * Sets one top-level scalar. Replaces the line when the key exists (keeping any
 * trailing comment), otherwise appends it as the last line of the block.
 * `as` forces how a string is written: 'string' | 'date' | 'url'.
 */
export function setField(file, key, value, { dryRun = false, as } = {}) {
  const { text, expect } = render(value, as);
  return rewrite(file, key, dryRun, { value: expect }, (lines) => {
    const found = locate(lines, key, file);
    if (!found) {
      lines.push(`${key}: ${text}`);
      return { before: null, after: lines.at(-1) };
    }
    const before = lines[found.index];
    lines[found.index] = `${key}:${found.lead}${text}${found.comment}`;
    return { before, after: lines[found.index] };
  });
}

/** Removes one top-level scalar. A key that is not there is not an error: `changed` is false. */
export function removeField(file, key, { dryRun = false } = {}) {
  return rewrite(file, key, dryRun, { remove: true }, (lines) => {
    const found = locate(lines, key, file);
    if (!found) return { before: null, after: null };
    const [before] = lines.splice(found.index, 1);
    return { before, after: null };
  });
}

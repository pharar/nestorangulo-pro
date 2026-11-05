/**
 * Every page that has a Markdown version, in a stable order: core pages first
 * (home, about, speaking, writing, contact), then talks newest first.
 *
 * Consumers (llms.txt, llms-full.txt) iterate this; add a new collection by
 * appending its page list here.
 */
import { aboutPage } from './pages/about';
import { contactPage } from './pages/contact';
import { homePage } from './pages/home';
import { speakingPage, talkPages } from './pages/talks';
import { writingPage } from './pages/writing';
import type { MarkdownPage, MarkdownSection } from './types';

async function buildMarkdownPages(): Promise<MarkdownPage[]> {
  return [
    await homePage(),
    await aboutPage(),
    await speakingPage(),
    writingPage(),
    contactPage(),
    ...(await talkPages()),
  ];
}

/**
 * SEO.astro asks for this on every HTML page (to decide whether to advertise a
 * twin), so a build would otherwise render every Markdown page once per HTML
 * page — O(pages²). Content cannot change during `astro build`, so memoize
 * there; in dev, rebuild on each call so edits to a talk show up on reload.
 */
let cached: Promise<MarkdownPage[]> | undefined;

export function getMarkdownPages(): Promise<MarkdownPage[]> {
  if (!import.meta.env.PROD) return buildMarkdownPages();
  cached ??= buildMarkdownPages();
  return cached;
}

export async function getMarkdownPagesBySection(section: MarkdownSection): Promise<MarkdownPage[]> {
  return (await getMarkdownPages()).filter((p) => p.section === section);
}

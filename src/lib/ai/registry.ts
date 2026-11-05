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

export async function getMarkdownPages(): Promise<MarkdownPage[]> {
  return [
    await homePage(),
    await aboutPage(),
    await speakingPage(),
    writingPage(),
    contactPage(),
    ...(await talkPages()),
  ];
}

export async function getMarkdownPagesBySection(section: MarkdownSection): Promise<MarkdownPage[]> {
  return (await getMarkdownPages()).filter((p) => p.section === section);
}

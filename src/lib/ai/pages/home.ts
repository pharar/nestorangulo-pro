/**
 * Markdown for `/`.
 *
 * DUPLICATION: the hero, manifesto and section-card copy below is hard-coded
 * in `src/pages/index.astro` and reproduced here. Edit both together.
 */
import { AUTHOR, DEFAULT_DESCRIPTION, DEFAULT_TITLE, JOB_TITLE } from '../../../config';
import { getPublishedTalks, talkCountRounded } from '../../talks';
import { blocks, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

export async function homePage(): Promise<MarkdownPage> {
  const count = (await getPublishedTalks()).length;
  const rounded = talkCountRounded(count);

  const body = blocks(
    paragraph(`${AUTHOR} · ${JOB_TITLE} · CISSP`),
    '## Building security programs from zero',
    paragraph('Builder of programs. Operator at incident scale. Strategist at the exec table.'),
    paragraph(
      "Security programs don't fail because of bad tools or misconfigured alerts. They fail because they were designed for a different organization than the one that has to run them — shaped around compliance frameworks instead of engineering workflows, written in a language that only makes sense inside a security team, and treated as infrastructure when they're actually a relationship with every team in the company."
    ),
    paragraph(
      "I spent eight years inside incident response at Sucuri and GoDaddy. At the scale we operated — thousands of incidents per year, live malware campaigns, e-commerce skimmers running in production, intrusions on critical infrastructure — the gap between security theater and security practice becomes impossible to hide. You either build things that work under pressure or you don't."
    ),
    paragraph(
      'At Patchstack, I built the security program from scratch. Not a policy document dropped into a shared drive — a functioning program: secure development lifecycle, threat modeling embedded in engineering, incident response playbooks, vulnerability intelligence workflows, and coordinated disclosure operating at the scale of the global #1 CNA in 2023 and 2025, ahead of GitHub and Kernel.org. The hardest part was never the technology. It was the organizational negotiation: making security useful instead of obstructive, translating risk into decisions that product and engineering teams can act on.'
    ),
    paragraph(
      `This site is a working archive. Essays on security program design, talks from ${rounded} international conference appearances, and the thinking behind the work.`
    ),
    '## Explore this site',
    list([
      `${link('Writing', '/writing/')} — ${text('Essays on security program design, vulnerability intelligence, and what incident response at scale actually teaches. (Coming next.)')}`,
      `${link('Speaking', '/speaking/')} — ${text(`${count} international conference appearances. Slides, notes, and editorial commentary on each.`)}`,
      `${link('About', '/about/')} — ${text("Background, credentials, and what I've built across Patchstack and Sucuri/GoDaddy.")}`,
      `${link('Contact', '/contact/')} — ${text('Professional inquiries, speaking invitations, or conversation.')}`,
    ])
  );

  return makePage({
    path: '/',
    title: DEFAULT_TITLE,
    label: 'Home',
    description: DEFAULT_DESCRIPTION,
    section: 'core',
    body,
  });
}

/**
 * Markdown for `/contact/`.
 *
 * DUPLICATION: the contact list is declared inline in `src/pages/contact.astro`
 * and reproduced here. Edit both together (or move it to `src/data/`).
 */
import { AUTHOR } from '../../../config';
import { blocks, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

const CONTACTS: Array<{ label: string; href: string; display: string; note?: string }> = [
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/pharar',
    display: '/in/pharar',
    note: 'Primary channel for professional contact and conversation.',
  },
  {
    label: 'Email',
    href: 'mailto:hello@nestorangulo.pro',
    display: 'hello@nestorangulo.pro',
    note: 'For longer conversations or speaking invitations.',
  },
  { label: 'GitHub', href: 'https://github.com/pharar', display: 'github.com/pharar' },
  {
    label: 'Bluesky',
    href: 'https://bsky.app/profile/nestorangulo.pro',
    display: '@nestorangulo.pro',
  },
  { label: 'X', href: 'https://x.com/pharar', display: '@pharar' },
  {
    label: 'ORCID',
    href: 'https://orcid.org/0000-0001-6605-7761',
    display: '0000-0001-6605-7761',
    note: 'Academic publications and conference proceedings.',
  },
];

export function contactPage(): MarkdownPage {
  const body = blocks(
    paragraph('Professional inquiries, speaking invitations, or conversation.'),
    list(
      CONTACTS.map(
        (c) =>
          `**${text(c.label)}**: ${link(c.display, c.href)}${c.note ? ` — ${text(c.note)}` : ''}`
      )
    )
  );

  return makePage({
    path: '/contact/',
    title: `Contact — ${AUTHOR}`,
    label: 'Contact',
    description: `Reach ${AUTHOR} on LinkedIn, email, GitHub, Bluesky, X, and ORCID.`,
    section: 'core',
    body,
  });
}

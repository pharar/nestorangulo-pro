import type { contact } from '../i18n/ui/contact';

export interface Contact {
  label: string;
  href: string;
  display: string;
  /** Key of the note in the contact dictionary (`src/i18n/ui/contact.ts`). */
  note?: keyof (typeof contact)['en'];
  external: boolean;
}

/** Shared by the Contact view and its Markdown twin. */
export const contacts: Contact[] = [
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/pharar',
    display: '/in/pharar',
    note: 'linkedinNote',
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:hello@nestorangulo.pro',
    display: 'hello@nestorangulo.pro',
    note: 'emailNote',
    external: false,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/pharar',
    display: 'github.com/pharar',
    external: true,
  },
  {
    label: 'Bluesky',
    href: 'https://bsky.app/profile/nestorangulo.pro',
    display: '@nestorangulo.pro',
    external: true,
  },
  { label: 'X', href: 'https://x.com/pharar', display: '@pharar', external: true },
  {
    label: 'ORCID',
    href: 'https://orcid.org/0000-0001-6605-7761',
    display: '0000-0001-6605-7761',
    note: 'orcidNote',
    external: true,
  },
];

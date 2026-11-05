/**
 * Markdown for `/contact/` and `/es/contact/`.
 *
 * The contact list is `src/data/contacts.ts` and the copy is
 * `src/i18n/ui/contact.ts`, both shared with `src/views/Contact.astro`.
 */
import { contacts } from '../../../data/contacts';
import type { Lang } from '../../../i18n/config';
import { useContact } from '../../../i18n/ui/contact';
import { localizePath } from '../../../i18n/utils';
import { blocks, link, list, paragraph, text } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

export function contactPage(lang: Lang = 'en'): MarkdownPage {
  const t = useContact(lang);
  const body = blocks(
    paragraph(t('intro')),
    list(
      contacts.map(
        (c) =>
          `**${text(c.label)}**: ${link(c.display, c.href)}${c.note ? ` — ${text(t(c.note))}` : ''}`
      )
    )
  );

  return makePage({
    path: localizePath('/contact/', lang),
    title: t('title'),
    label: t('breadcrumb'),
    description: t('description'),
    lang,
    section: 'core',
    body,
  });
}

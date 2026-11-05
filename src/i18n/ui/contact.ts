import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/** Contact page copy: shared by src/views/Contact.astro and src/lib/ai/pages/contact.ts. */
export const contact = defineDict({
  en: {
    title: 'Contact — Nestor Angulo de Ugarte',
    description: 'Reach Nestor Angulo de Ugarte on LinkedIn, email, GitHub, Bluesky, X, and ORCID.',
    breadcrumb: 'Contact',
    h1: 'Contact',
    intro: 'Professional inquiries, speaking invitations, or conversation.',
    linkedinNote: 'Primary channel for professional contact and conversation.',
    emailNote: 'For longer conversations or speaking invitations.',
    orcidNote: 'Academic publications and conference proceedings.',
  },
  es: {
    title: 'Contacto — Nestor Angulo de Ugarte',
    description:
      'Contacta con Nestor Angulo de Ugarte por LinkedIn, email, GitHub, Bluesky, X y ORCID.',
    breadcrumb: 'Contacto',
    h1: 'Contacto',
    intro: 'Consultas profesionales, invitaciones para dar charlas o simplemente conversar.',
    linkedinNote: 'Canal principal para el contacto profesional y para conversar.',
    emailNote: 'Para conversaciones más largas o invitaciones a charlas.',
    orcidNote: 'Publicaciones académicas y actas de congresos.',
  },
});

export const useContact = (lang: Lang) => useTranslations(contact, lang);

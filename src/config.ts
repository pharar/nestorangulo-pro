const site = import.meta.env.SITE;
if (!site) throw new Error('Astro `site` is not set in astro.config.mjs');

export const SITE_URL = site;
export const SITE_NAME = 'nestorangulo.pro';
export const AUTHOR = 'Nestor Angulo de Ugarte';
export const JOB_TITLE = 'Head of Security';
export const DEFAULT_TITLE = `${AUTHOR} — ${JOB_TITLE} · CISSP`;
export const DEFAULT_DESCRIPTION =
  'Head of Security and CISSP. I build security programs from zero — vulnerability intelligence, incident response, ISO 27001 and SOC 2.';
export const SAME_AS = [
  'https://linkedin.com/in/pharar',
  'https://github.com/pharar',
  'https://x.com/pharar',
  'https://bsky.app/profile/nestorangulo.pro',
  'https://orcid.org/0000-0001-6605-7761',
  'https://gravatar.com/pharar',
  'https://www.credly.com/badges/e7de5c98-5d06-416b-bc3d-cd11b64d6416/linked_in_profile',
  'https://about.me/pharar',
];

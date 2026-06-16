const SITE_URL = 'https://nestorangulo.pro';

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: 'Nestor Angulo de Ugarte',
  givenName: 'Nestor',
  familyName: 'Angulo de Ugarte',
  url: SITE_URL,
  image: `${SITE_URL}/images/photo-nestor.jpg`,
  jobTitle: 'Head of Security',
  description:
    'Head of Security and CISSP. I build security programs from zero — vulnerability intelligence, incident response, ISO 27001 and SOC 2.',
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'Universidad de Las Palmas de Gran Canaria',
    alternateName: 'ULPGC',
  },
  knowsAbout: [
    'Security Program Building',
    'Incident Response',
    'Vulnerability Intelligence',
    'Governance Risk and Compliance',
    'ISO 27001',
    'SOC 2',
    'Web Security',
    'CISSP',
  ],
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    credentialCategory: 'certification',
    name: 'CISSP',
    issuedBy: { '@type': 'Organization', name: 'ISC2' },
  },
  memberOf: {
    '@type': 'Organization',
    name: 'ISC2 Spain Chapter',
    roleName: 'Head of Technology',
  },
  sameAs: [
    'https://linkedin.com/in/pharar',
    'https://github.com/pharar',
    'https://x.com/pharar',
    'https://bsky.app/profile/nestorangulo.pro',
    'https://orcid.org/0000-0001-6605-7761',
    'https://gravatar.com/pharar',
    'https://www.credly.com/badges/e7de5c98-5d06-416b-bc3d-cd11b64d6416/linked_in_profile',
    'https://about.me/pharar',
  ],
};

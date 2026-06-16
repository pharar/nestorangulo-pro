import { SITE_URL, AUTHOR, JOB_TITLE, DEFAULT_DESCRIPTION, SAME_AS } from '../config';

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: AUTHOR,
  givenName: 'Nestor',
  familyName: 'Angulo de Ugarte',
  url: SITE_URL,
  image: `${SITE_URL}/images/photo-nestor.jpg`,
  jobTitle: JOB_TITLE,
  description: DEFAULT_DESCRIPTION,
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
  sameAs: SAME_AS,
};

import type { Localized } from '../i18n/localized';

export interface ServiceRole {
  title: string;
  organization: string;
  since?: string;
  until?: string;
  type?: Localized;
  note?: Localized;
}

export const serviceRoles: ServiceRole[] = [
  {
    title: 'Head of Technology',
    organization: 'ISC2 Spain Chapter',
    since: '2025-01',
    type: { en: 'Board role', es: 'Cargo en la junta directiva' },
  },
];

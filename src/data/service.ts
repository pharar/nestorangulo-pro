export interface ServiceRole {
  title: string;
  organization: string;
  since?: string;
  until?: string;
  type?: string;
  note?: string;
}

export const serviceRoles: ServiceRole[] = [
  {
    title: 'Head of Technology',
    organization: 'ISC2 Spain Chapter',
    since: '2025-01',
    type: 'Board role',
  },
];

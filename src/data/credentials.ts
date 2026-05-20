export interface Credential {
  title: string;
  issuer: string;
  validUntil?: string;
  yearCompleted?: number;
  since?: string;
  eqfLevel?: number;
  verifyUrl?: string;
  note?: string;
  type?: string;
}

export const credentials: Credential[] = [
  {
    title: 'CISSP — Certified Information Systems Security Professional',
    issuer: 'ISC2',
    validUntil: '2028-05',
    eqfLevel: 7,
    verifyUrl:
      'https://www.credly.com/badges/e7de5c98-5d06-416b-bc3d-cd11b64d6416/linked_in_profile',
  },
  {
    title: 'Computer Science Engineer',
    issuer: 'Universidad de Las Palmas de Gran Canaria',
    yearCompleted: 2013,
    eqfLevel: 7,
    note: 'Formal training in AI — neural networks, genetic algorithms, automata.',
  },
];

export interface Publication {
  type: 'book_chapter' | 'conference_paper';
  title: string;
  in?: string;
  publisher?: string;
  year: number;
  isbn?: string;
  venue?: string;
  coAuthors?: string[];
}

export const publications: Publication[] = [
  {
    type: 'book_chapter',
    title: 'Evolutionary Computation Applied to Urban Traffic Optimization',
    in: 'Advances in Evolutionary Algorithms',
    publisher: 'IN-TECH',
    year: 2008,
    isbn: '978-3-902613-32-5',
    coAuthors: ['J.J. Sánchez Medina', 'M.J. Galán Moreno', 'E. Rubio Royo'],
  },
  {
    type: 'conference_paper',
    title:
      'Simulation Times vs. Network Size in a Genetic Algorithm Based Urban Traffic Optimization Architecture',
    venue: 'International Conference on Genetic and Evolutionary Methods (GEM)',
    year: 2008,
    coAuthors: ['J.J. Sánchez-Medina', 'M.J. Galán', 'E. Rubio'],
  },
];

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const talks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/talks' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      event: z.string(),
      location: z.string().optional(),
      date: z.coerce.date(),
      summary: z.string(),
      description: z.string().optional(),
      format: z.enum([
        'conference-talk',
        'meetup-talk',
        'panel',
        'podcast',
        'webinar',
        'ama',
        'workshop',
      ]),
      language: z.enum(['en', 'es']).default('en'),
      themes: z.array(
        z.enum([
          'Incident Response',
          'Web Security',
          'WordPress Security',
          'Malware',
          'Vulnerability Intelligence',
          'Open Source Security',
          'Software Supply Chain',
          'Security Leadership',
          'GRC',
          'Industrial Cybersecurity',
          'AI Security',
          'Security Awareness',
        ]),
      ),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      slidesUrl: z.url().optional(),
      slidesUrlExt: z.url().optional(),
      videoUrl: z.url().optional(),
      eventUrl: z.url().optional(),
      sourceNote: z.string().optional(),
    }),
});

export const collections = { talks };

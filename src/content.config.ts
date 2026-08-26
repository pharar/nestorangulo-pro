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
      summary: z.string().optional(),
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
        ])
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

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Meta description. Doubles as the list-page blurb, so keep it 140-160 chars. */
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      language: z.enum(['en', 'es']).default('en'),
      // Same taxonomy as `talks` on purpose: it is what lets a theme page pull an
      // article and a talk side by side. Add a theme here only if you add it there.
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
        ])
      ),
      /** Free-form, for long-tail SEO. Not a taxonomy — do not build navigation on these. */
      tags: z.array(z.string()).optional(),
      featured: z.boolean().default(false),
      // Defaults to true, unlike `talks`. A half-written article that leaks is worse
      // than a talk entry that does: publishing is the deliberate act here.
      draft: z.boolean().default(true),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** Set when the piece is republished elsewhere (LinkedIn, Medium) and this is the original. */
      canonicalUrl: z.url().optional(),
      sourceNote: z.string().optional(),
    }),
});

export const collections = { talks, articles };

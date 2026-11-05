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

/**
 * Essays. Deliberately a smaller schema than `talks`: an essay has no event,
 * venue or format — just the piece, when it was published, and what it is
 * about. `summary` is the listing blurb; `description` (optional) overrides it
 * for the meta tag when the blurb is too long or too conversational.
 */
const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One line shown under the title on the page and in the listing. */
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      /** Last substantive edit, when it differs from `date`. */
      updated: z.coerce.date().optional(),
      summary: z.string(),
      description: z.string().optional(),
      language: z.enum(['en', 'es']).default('en'),
      themes: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** Path under public/ for the social card; falls back to the site default. */
      ogImage: z.string().optional(),
    }),
});

/**
 * Spanish overlay for `talks`, matched by id (same filename). Any field left
 * out falls back to the English entry. The body replaces the English body.
 */
const talksEs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/talks-es' }),
  schema: z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    sourceNote: z.string().optional(),
  }),
});

/**
 * Spanish translation of a `writing` entry with the same id. Dates, themes,
 * cover, ogImage and draft come from the English entry.
 */
const writingEs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing-es' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    summary: z.string(),
    description: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { talks, writing, talksEs, writingEs };

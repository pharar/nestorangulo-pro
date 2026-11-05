// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import { hastFootnotesEs } from './src/lib/hastFootnotesEs.mjs';

/**
 * Cloudflare Pages serves `404.html` from the root for every unmatched path,
 * and, when `/es/404.html` exists, uses it for unmatched paths under `/es/`.
 * Astro builds `src/pages/es/404.astro` as `dist/es/404/index.html` (the
 * directory format), which Pages would treat as an ordinary page at `/es/404/`.
 * Move it to `dist/es/404.html` and drop the directory so it is only the
 * fallback, never a URL of its own.
 */
/** @returns {import('astro').AstroIntegration} */
const spanish404 = () => ({
  name: 'spanish-404',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const root = fileURLToPath(dir);
      await cp(`${root}es/404/index.html`, `${root}es/404.html`);
      await rm(`${root}es/404`, { recursive: true });
    },
  },
});

export default defineConfig({
  site: 'https://nestorangulo.pro',
  output: 'static',
  // Canonical URL form. Astro builds directory-style (`/about/index.html`) and
  // Cloudflare 308-redirects the slashless form, so the trailing slash is the
  // real URL — declaring it keeps dev, the sitemap and `Astro.url.href`
  // (which `SEO.astro` uses as the canonical) all agreeing on one shape.
  trailingSlash: 'always',
  // Locales: `en` lives at the root (unchanged URLs), `es` under `/es/…`.
  // Keep in step with src/i18n/config.ts. See documentation/I18N.md.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  // Spanish footnote labels (Spanish content only); see the plugin for details.
  markdown: { processor: satteri({ hastPlugins: [hastFootnotesEs] }) },
  integrations: [
    spanish404(),
    sitemap({
      // Error pages are not URLs of their own (see `spanish404` above).
      filter: (page) => !/\/404\/?$/.test(page),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es-ES' },
      },
    }),
  ],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'"],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
});

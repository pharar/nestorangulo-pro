// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  integrations: [
    sitemap({
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

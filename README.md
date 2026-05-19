# nestorangulo.pro

Personal authority site for Nestor Angulo de Ugarte — Head of Security, CISSP, security program builder.

Built with [Astro 6](https://astro.build), deployed on [Cloudflare Pages](https://pages.cloudflare.com).

## Requirements

- Node 24 LTS ("Krypton") — `nvm use` will read `.nvmrc`
- npm ≥ 10

## Local development

```bash
nvm use
npm install
npm run dev        # http://localhost:4321
```

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build to `./dist` |
| `npm run preview` | Preview the production build |
| `npm run check` | Astro + TypeScript type checking |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting (used in CI) |

## Project structure

```
.
├── .github/workflows/ci.yml   — Type-check, build, Lighthouse audit
├── src/
│   ├── components/            — SEO, Header, Footer
│   ├── layouts/               — BaseLayout
│   ├── pages/                 — Route pages (index, about, talks, writing, contact)
│   └── styles/                — tokens.css (design system), global.css
├── public/                    — Static assets (favicon, robots.txt)
├── astro.config.mjs
├── lighthouserc.json
└── DEPLOY.md                  — Cloudflare Pages setup guide
```

## CI

Every push to `main` and every PR runs:

1. **Type-check** — `astro check` with TypeScript strict
2. **Build** — `astro build` to verify static output
3. **Lighthouse audit** — on PRs only; asserts a11y ≥ 0.95, SEO ≥ 0.95, perf ≥ 0.9

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full Cloudflare Pages setup.

## Planned chunks

- **Chunk 1** ✅ Scaffolding, design system, landing, contact, CI
- **Chunk 2** — `/about` full biography
- **Chunk 3** — `/talks` with Astro Content Collections
- **Chunk 4** — `/writing` with MDX blog posts

## License

[MIT](./LICENSE) — Nestor Angulo de Ugarte

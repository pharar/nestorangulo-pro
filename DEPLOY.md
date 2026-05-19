# Deploying to Cloudflare Pages

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- The repo pushed to `github.com/pharar/nestorangulo-pro`
- Node 24 LTS locally (`nvm use`)

---

## First-time setup

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/pharar/nestorangulo-pro.git
git branch -M main
git push -u origin main
```

### 2. Connect to Cloudflare Pages

1. Go to **Cloudflare dashboard** → **Workers & Pages** → **Create**
2. Choose **Pages** → **Connect to Git**
3. Authorize GitHub and select `pharar/nestorangulo-pro`
4. Configure the build:

   | Setting | Value |
   |---|---|
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(leave blank)* |

5. Click **Save and Deploy**

### 3. Set the Node version

Cloudflare Pages defaults to an older Node version. Override it:

**Option A — Environment variable (recommended):**

In your project → **Settings** → **Environment variables** → add:

```
NODE_VERSION = 24
```

Set it for both **Production** and **Preview** environments.

**Option B — `.nvmrc` (already present):**

Cloudflare Pages also respects `.nvmrc`. The file in this repo contains `24`, so this may work without the env var — but the explicit variable is more reliable.

### 4. Add a custom domain

1. Project → **Custom domains** → **Set up a custom domain**
2. Enter `nestorangulo.pro`
3. Follow the DNS instructions (add a CNAME record, or let Cloudflare manage DNS automatically if the domain is on Cloudflare)
4. Also add `www.nestorangulo.pro` if desired — Cloudflare Pages will redirect it

---

## Deployments

- **Production**: every push to `main` triggers a deploy
- **Preview**: every PR gets its own preview URL (shown in the PR checks)

Logs and deployment history are in the Cloudflare Pages dashboard.

---

## Environment variables

This project currently requires no environment variables at build time.

---

## Rollback

In the Cloudflare Pages dashboard → **Deployments**, click any previous deployment → **Rollback to this deployment**.

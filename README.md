# Nvoicely

Full-stack invoice management web application for freelancers and small businesses.

## What it does

- Create, edit, and manage invoices with line items, taxes, and multi-currency support (IDR, USD, EUR, and more)
- Maintain a client database and link invoices to clients
- Track business expenses
- Schedule recurring invoices (weekly, monthly, etc.)
- Send invoices to clients via email
- Export invoices to PDF
- Dashboard with revenue and outstanding balance overview

## Tech stack

- **Frontend:** TanStack Start (SSR + file-based routing), React 19, Tailwind CSS v4, shadcn/ui, Radix primitives
- **Backend:** Appwrite (auth, databases, storage, functions)
- **PDF generation:** @react-pdf/renderer
- **Email:** Appwrite Functions + Resend
- **Forms:** React Hook Form + Zod
- **State:** TanStack Query
- **Hosting:** Cloudflare Workers

## Getting started

```bash
pnpm install
cp .env.example .env  # fill in Appwrite credentials
pnpm run setup        # provision Appwrite databases
pnpm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build (Vite + Cloudflare worker) |
| `pnpm preview` | Run the built worker locally (workerd) |
| `pnpm typecheck` | Type-check with `tsc` |
| `pnpm deploy` | Build and deploy to Cloudflare Workers manually |
| `pnpm setup` | Provision Appwrite databases |
| `pnpm seed` | Seed sample data |

## Deployment

Hosted on **Cloudflare Workers** via the `@cloudflare/vite-plugin` (config in `wrangler.jsonc`).
Deploys are automatic through **Cloudflare Workers Builds** — every push to `master` builds
and deploys the Git integration; no manual step needed. `pnpm deploy` is available for an
ad-hoc manual deploy.

### Environment variables

Env vars split by when they are needed:

| Variable | When | Where (Cloudflare) |
| --- | --- | --- |
| `VITE_APPWRITE_ENDPOINT` | build-time (baked into client) | Workers **Build** variables |
| `VITE_APPWRITE_PROJECT_ID` | build-time | Workers **Build** variables |
| `APPWRITE_ENDPOINT` | runtime | Worker **Variables** / `wrangler.jsonc` |
| `APPWRITE_PROJECT_ID` | runtime | Worker **Variables** / `wrangler.jsonc` |
| `APPWRITE_DATABASE_ID` | runtime | Worker **Variables** / `wrangler.jsonc` |
| `APPWRITE_API_KEY` | runtime | Worker **Secret** |

> The `VITE_*` variables must be set as **Build** variables (a different place from the
> runtime Variables/Secrets). If they are missing at build time the app throws a masked
> `HTTPError` 500 on load (the Appwrite client rejects an empty endpoint).

## Releases

Versioning is automated with [release-please](https://github.com/googleapis/release-please).
Push [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `feat!:`)
to `master` and release-please keeps an open release PR with an updated `CHANGELOG.md`.
Merging that PR bumps `package.json`, tags `vX.Y.Z`, and publishes a GitHub Release.

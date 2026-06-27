# MapLibre Geoman **Pro** — Custom GIS Editor

A single-view, GIS-editor-style web app showing how to build a **fully custom**
GIS application on [Geoman Pro](https://geoman.io). Geoman provides the
draw/edit engine; everything around it — toolbar, layer manager, metadata
editor, auth and persistence — is custom application code.

## Features

- **Single editor canvas** — a full-screen MapLibre map; Geoman's own control
  bar is disabled (`settings.useControlsUi: false`) so every control is custom.
- **Custom toolbar** — point / line / polygon / rectangle / circle drawing plus
  Pro edit modes (rotate, cut, lasso select), move, and delete — all driving
  Geoman programmatically.
- **Layers** — create / delete layers, set the **active (editable) layer**,
  customize **fill _and_ border** colours (applied live), and toggle visibility.
  Display and editing are separated: every layer is drawn by its own native
  MapLibre source + fill/line/circle layers, while exactly one active layer is
  loaded into Geoman for editing (its native source is emptied so it isn't drawn
  twice). Switching the active layer commits the previous one back to its
  display layers and loads the next into Geoman.
- **Per-feature metadata editor** — edit an arbitrary `string → string` map on
  the selected feature; written to the feature's properties and persisted.
- **GitHub auth** via [Better Auth](https://better-auth.com); data is **private
  per user**. Email/password sign-in is enabled outside production for local dev
  and e2e.
- **Persistence** — layers and features are stored in Postgres via Drizzle and
  loaded back into Geoman on sign-in.

## Stack

| Concern      | Choice                                           |
| ------------ | ------------------------------------------------ |
| Framework    | Next.js 16 (App Router) + React 19 + Tailwind v4 |
| Map          | MapLibre GL + `@geoman-io/maplibre-geoman-pro`   |
| Auth         | Better Auth (GitHub OAuth; dev email/password)   |
| Database     | Postgres + Drizzle ORM                           |
| Client state | Zustand                                          |
| Tests        | Playwright (UI + API e2e)                         |

## Prerequisites

- Node 20+ and **pnpm 11**
- **Docker** (for the local Postgres) — or any Postgres reachable via `DATABASE_URL`
- Access to the private `@geoman-io` registry. This app ships an `.npmrc`
  pointing `@geoman-io` at `https://npm.geoman.io/`; you need a registry auth
  token in your pnpm config (`pnpm config set //npm.geoman.io/:_authToken <token>`).

## Getting started

```bash
pnpm install

cp .env.example .env.local
# edit .env.local: BETTER_AUTH_SECRET (openssl rand -base64 32) and,
# optionally, GitHub OAuth credentials.

pnpm db:up         # start Postgres (docker compose) on host port 5435
pnpm db:migrate    # apply the Drizzle migrations
pnpm dev           # http://localhost:3000
```

In dev, use the **Dev sign-in** form (email/password) in the top-right card — no
GitHub app required. To use GitHub locally, create an OAuth app with callback
`http://localhost:3000/api/auth/callback/github` and set `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET`.

## Scripts

| Script                   | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `pnpm dev`               | Dev server                               |
| `pnpm build`             | Production build                         |
| `pnpm db:up` / `db:down` | Start / stop the Docker Postgres         |
| `pnpm db:generate`       | Generate a migration from the schema     |
| `pnpm db:migrate`        | Apply migrations                         |
| `pnpm db:studio`         | Drizzle Studio                           |
| `pnpm e2e`               | Run Playwright tests (boots DB + server) |
| `pnpm lint`              | ESLint                                   |

## How it fits together

```
components/map/GisMap.tsx          MapLibre + Geoman Pro init (no default UI, UUID ids)
components/map/MapView.tsx         Controller lifecycle + overlay layout
components/overlays/*              Custom UI: Toolbar, LayerPanel, MetadataEditor, SignInPanel, UserMenu
lib/geoman/editorController.ts     Display ⇄ edit split, layer ops, gm:* event wiring
lib/geoman/displayLayers.ts        Native MapLibre source/layers per app-layer
lib/geoman/geomanRender.ts         Recolour/hide the active layer's gm_main layers
lib/geoman/featureSync.ts          Read drawn features / import-back / find by id
hooks/useEditorStore.ts            Zustand store (client source of truth)
lib/api-client.ts                  Typed fetch wrappers for the REST API
app/api/{layers,features}/*        Per-user CRUD route handlers (zod-validated)
lib/{auth,db}                      Better Auth + Drizzle
```

Geoman events drive persistence: `gm:create` assigns the new feature to the
active layer and saves it; `gm:editend`/`dragend`/`rotateend`/`scaleend`/`cut`
persist geometry changes; `gm:remove` deletes; `gm:selection` opens the metadata
editor.

## Deploying to Vercel

1. Provision Postgres (Vercel Postgres / Neon) and set `DATABASE_URL`.
2. Set env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your deploy URL),
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and a GitHub OAuth app whose
   callback is `https://<your-domain>/api/auth/callback/github`.
3. **Private registry on CI**: append an auth line to `.npmrc` that references an
   env var, and set it in Vercel:
   ```ini
   //npm.geoman.io/:_authToken=${GEOMAN_NPM_TOKEN}
   ```
   (left out of the committed `.npmrc` so local installs keep using your machine
   token; add it for the Vercel build and set `GEOMAN_NPM_TOKEN`.)
4. Run `pnpm db:migrate` against the production database once.

This app is intentionally **standalone** (its own lockfile and `.npmrc`) and is
excluded from the parent examples pnpm workspace so the private-registry
redirect stays scoped to it.

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
  loaded into Geoman for editing. Switching the active layer keeps the same
  source and style layers. Undo/redo temporarily materializes inactive layers
  so a history step still addresses the feature in its original layer.
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

The dev command copies MapLibre's worker into `public/vendor/maplibre` before
starting, just like the production build. If you use another port, set
`BETTER_AUTH_URL` to that origin in `.env.local` (for example,
`http://localhost:3002`) or Better Auth will reject sign-in.

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

The browser suite exercises draw, copy/paste, drag, scale, rotate, vertex edits,
undo/redo, switching layers and reload persistence, plus activation smoke tests
for the remaining toolbar tools. To reuse a server on a different port:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3002 pnpm e2e
```

`PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an already-installed Chromium.

## How it fits together

```
components/map/GisMap.tsx          MapLibre + Geoman Pro init (no default UI, UUID ids)
components/map/MapView.tsx         Controller lifecycle + overlay layout
components/overlays/*              Custom UI: Toolbar, LayerPanel, MetadataEditor, SignInPanel, UserMenu
lib/geoman/editorController.ts     Display ⇄ edit split, layer ops, gm:* event wiring
lib/geoman/featureSync.ts          Read drawn features / import-back / find by id
hooks/useEditorStore.ts            Zustand store (client source of truth)
lib/api-client.ts                  Typed fetch wrappers for the REST API
app/api/{layers,features}/*        Per-user CRUD route handlers (zod-validated)
lib/{auth,db}                      Better Auth + Drizzle
```

Geoman events drive persistence: `gm:create` assigns the new feature to the
feature's own layer and saves it; `gm:editend`/`dragend`/`rotateend`/`scaleend`/`cut`
persist geometry changes; `gm:remove` deletes; `gm:selection` opens the metadata
editor. Undo/redo update events are persisted too, so reloading does not bring
back an undone geometry. Pasting uses the same history-aware create path as drawing.

## Deploying to Vercel

1. Provision Postgres (Vercel Postgres / Neon) and set `DATABASE_URL`.
2. Set env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your deploy URL),
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and a GitHub OAuth app whose
   callback is `https://<your-domain>/api/auth/callback/github`.
3. **Private registry on CI**: set `NPM_TOKEN_GEOMAN` in Vercel's Production,
   Preview and Development environments. Apply it before installing; pnpm 11
   does not expand an environment variable placeholder in the committed `.npmrc`:
   ```bash
   pnpm config set "//npm.geoman.io/:_authToken" "$NPM_TOKEN_GEOMAN" && pnpm install --frozen-lockfile
   ```
4. Run `pnpm db:migrate` against the production database once.

This app is intentionally **standalone** (its own lockfile and `.npmrc`) and is
excluded from the parent examples pnpm workspace so the private-registry
redirect stays scoped to it.

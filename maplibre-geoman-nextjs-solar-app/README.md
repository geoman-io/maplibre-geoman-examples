# SunPlan — Geoman **Pro** Rooftop Solar Demo

A **lightweight** rooftop-solar mounting & planning app built on
[Geoman Pro](https://geoman.io). It shows how a focused vertical product can sit
on top of Geoman's draw/edit engine with **no backend at all** — the whole
project lives in `localStorage`, so it runs with just `pnpm install && pnpm dev`.

The UI is a modern SaaS shell: a top nav, a left array-designer + layers rail, a
map workspace, and a right roof-plane inspector. On first load the app seeds a
sample gable-roofed house (two roof planes + obstructions) and auto-lays out the
panels so every tool has something to act on immediately.

## The four planning features

- **Auto panel-array layout** — tile a roof plane's placeable area with module
  rectangles in a grid aligned to the roof's azimuth, respecting the fire
  setback and routing around obstructions (`lib/solar/layout.ts`). Run it
  per-roof from the inspector or for the whole project from the sidebar.
- **Fire setback / keep-outs** — the placeable area is the roof inset by the
  setback with the obstructions cut out (turf negative buffer + difference,
  `lib/solar/setback.ts`); *Show setback area* renders it.
- **System size & production estimate** — a live summary of panel count, DC kW,
  estimated annual kWh, and roof coverage % (`lib/solar/production.ts`).
- **Orientation-aware production** — each roof plane carries an azimuth + tilt;
  these drive both the array alignment and an irradiance derate (best for a
  south-facing plane at ~30° tilt), shown per-roof in the inspector.

## How it's built on Geoman

- **Domain layers** — Roof Planes, Obstructions, Setback Area and PV Modules are
  ordinary Geoman data layers, each with a typed attribute schema
  (`lib/solar/domain.ts`). The Roof Planes layer is active by default.
- **Editing** — every layer is an editable Geoman data layer; the full Pro
  toolset (draw, edit vertices, split, union, lasso, …) is wired as a custom
  toolbar driving Geoman programmatically (`settings.useControlsUi: false`).
- **Geometry** — module placement works in a local metric frame
  (`lib/solar/geo.ts`); turf handles the setback buffer, obstruction difference,
  and point-in-polygon / intersection tests.
- **Persistence** — there is no server. A Zustand store holds the project and a
  `persist` middleware mirrors it to `localStorage`; the controller writes
  straight to the store (no API layer).

## Stack

| Concern      | Choice                                           |
| ------------ | ------------------------------------------------ |
| Framework    | Next.js 16 (App Router) + React 19 + Tailwind v4 |
| Map          | MapLibre GL + `@geoman-io/maplibre-geoman-pro`   |
| Geometry     | turf (buffer / difference / intersects / …)      |
| State        | Zustand + `persist` → `localStorage`             |
| Persistence  | localStorage only — **no auth, no database**     |
| Tests        | Playwright (UI e2e)                              |

## Prerequisites

- Node 20+ and **pnpm 11**
- Access to the private `@geoman-io` registry. This app ships an `.npmrc`
  pointing `@geoman-io` at `https://npm.geoman.io/`; you need a registry auth
  token in your pnpm config (`pnpm config set //npm.geoman.io/:_authToken <token>`).

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

That's it — no env file, database, or sign-in. *Reset* in the sidebar restores
the sample rooftop; *Export* downloads the design as GeoJSON. Clearing site data
(localStorage key `sunplan-project`) also resets it.

## Scripts

| Script        | Purpose                          |
| ------------- | -------------------------------- |
| `pnpm dev`    | Dev server                       |
| `pnpm build`  | Production build                 |
| `pnpm e2e`    | Run the Playwright smoke test    |
| `pnpm lint`   | ESLint                           |

## How it fits together

```
components/shell/TopNav.tsx        SaaS top bar (brand + nav)
components/shell/Sidebar.tsx       Left rail: array designer + layers + export/reset
components/shell/Inspector.tsx     Right rail: roof-plane inspector + attribute editor
components/map/GisMap.tsx          MapLibre + Geoman Pro init (no default UI, UUID ids)
components/map/MapView.tsx         App shell layout + controller lifecycle
components/overlays/ArrayPanel.tsx Module/setback settings, auto-layout, system summary
components/overlays/RoofPanel.tsx  Roof orientation + per-roof production + actions
components/overlays/*              Toolbar, LayerPanel, MetadataEditor, StatusBar, …
lib/geoman/editorController.ts     Layer ops, gm:* event wiring, solar actions (store-backed)
lib/solar/domain.ts                Canonical layers + typed attribute schemas
lib/solar/modules.ts               PV module catalog (dimensions + watts)
lib/solar/layout.ts                Auto panel-array layout
lib/solar/setback.ts               Placeable area (setback inset minus obstructions)
lib/solar/production.ts            System size + annual kWh + orientation derate
lib/solar/seed.ts                  The sample rooftop
hooks/useEditorStore.ts            Zustand store (localStorage-persisted project)
hooks/useArrayConfig.ts            Array settings (localStorage-persisted)
```

Geoman events drive the store: `gm:create` adds the new feature to the active
layer; `gm:editend`/`dragend`/`rotateend`/`scaleend`/`cut` persist geometry
changes; `gm:remove` deletes; `gm:selection` opens the roof-plane inspector.

This app is intentionally **standalone** (its own lockfile and `.npmrc`) and is
excluded from the parent examples pnpm workspace so the private-registry
redirect stays scoped to it.

# Geoman Studio — vertical editor examples (React + Vite)

A **plain React + Vite** app that shows how to build a real, SaaS-style editor on
[Geoman Pro](https://geoman.io) — **one per niche vertical**, each with its own
typed **data model**, a **custom toolbar with custom icons**, a vertical-specific
**sidebar + inspector**, and domain **integrations that actually do work**. No
backend — every project persists to `localStorage`.

A brand bar switches between verticals; the body is that vertical's full editor.

## The verticals

| Vertical | Data model | Custom toolbar | Integrations |
| --- | --- | --- | --- |
| **Floor plan** | Rooms (type / dept / seats), Doors, Desks | draw room, room-rect, **split room**, **merge rooms**, add door, place desk | thematic rooms by department, live **area + occupancy** rollup, **topological** shared-wall editing + snapping |
| **Utility network** | Mains, Service laterals, Valves, Hydrants | draw main, service lateral, **split main**, **insert valve** (click a pipe), place hydrant | snap-to-connect, total **main length + fitting inventory**, click-a-main-to-drop-a-valve |
| **Cadastral** | Parcels (APN / owner / land use), Easements | draw parcel, **subdivide** (split), **consolidate** (union), draw easement, **carve** (difference) | thematic by land use, area in acres, **renumber parcels** (north→south, west→east), topological shared boundaries |

Each opens with a seeded sample so the tools have something to act on.

## How it's structured

A small **framework** in `src/core/` does everything generic; a vertical is just
a `VerticalDef` (`src/verticals/<name>/def.tsx`) plus its Sidebar/Inspector:

```
src/core/controller.ts   Geoman ↔ store ↔ localStorage engine; the primitives
                         (drawInto, enableEdit, pick, addFeature, …) toolbars call
src/core/vertical.ts     VerticalDef + ToolDef types + seed/project builder
src/core/Toolbar.tsx     custom toolbar — renders a vertical's tool groups (custom icons)
src/core/VerticalEditor.tsx  mounts the map + controller, renders the vertical's chrome
src/core/GeomanMap.tsx   MapLibre + Geoman (native control bar OFF)
src/core/store.ts        Zustand editor store (features/layers/selection/tool)
src/core/ui.tsx          shared Card / LayerList / MetricGrid / AttributeForm / …
src/core/icons.tsx       shared editing icons + an `svg()` wrapper
src/verticals/<v>/def.tsx      data model (layers + schemas), seed, custom toolbar
src/verticals/<v>/Sidebar.tsx  vertical-specific summary + legend + actions
src/verticals/<v>/Inspector.tsx  selected-feature metrics + attribute editor
```

**Events → data flow:** the controller wires `gm:create / editend / dragend /
rotateend / scaleend / cut / remove` to the store and saves to `localStorage` on
every change; `gm:selection` drives the inspector.

**Add a vertical:** write a `def.tsx` (layers + seed + toolbar with your own
`svg()` icons + domain runs) and a Sidebar/Inspector, then add it to the list in
`src/App.tsx`. The framework handles the rest.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

No env, database, or sign-in. Each vertical persists under `localStorage` key
`geoman-verticals:<vertical>`; *Reset* restores its sample.

You need access to the private `@geoman-io` registry — this app ships an `.npmrc`
pointing `@geoman-io` at `https://npm.geoman.io/`; put a registry token in your
pnpm config (`pnpm config set //npm.geoman.io/:_authToken <token>`).

## Scripts

| Script           | Purpose                        |
| ---------------- | ------------------------------ |
| `pnpm dev`       | Vite dev server                |
| `pnpm build`     | Type-check + production build  |
| `pnpm typecheck` | `tsc --noEmit`                 |
| `pnpm e2e`       | Playwright smoke test          |

> Tailwind v4 note: utilities are in `@layer utilities`, which lose to
> third-party *unlayered* CSS — maplibre-gl.css's `.maplibregl-map { position:
> relative }` beats a Tailwind `.absolute`, so the map is a flex child, not
> `absolute inset-0`.

Standalone (own lockfile + `.npmrc`), excluded from the parent examples pnpm
workspace so the private-registry redirect stays scoped here.

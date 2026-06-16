# This repo is a pnpm workspace (see pnpm-workspace.yaml).
# pnpm is pinned via the root package.json "packageManager" field (pnpm@11.7.0).
# Node is pinned via .tool-versions (Angular 22 requires Node >= 22.22.3).

# Install all workspace dependencies (single lockfile at the root).
install:
  pnpm install

# Build every example app.
build:
  pnpm -r build

# Type-check / svelte-check the apps that expose a "check" script.
check:
  pnpm -r --if-present check

# Lint the apps that expose a "lint" script.
lint:
  pnpm -r --if-present lint

# Run every app's dev server in parallel.
dev:
  pnpm -r --parallel dev

# Build a single app, e.g. `just app maplibre-geoman-react`.
app name:
  pnpm --filter ./{{name}} build

# Remove build artifacts and node_modules across the workspace.
clean:
  pnpm -r exec rm -rf dist .next .angular
  rm -rf node_modules

# Bump the Geoman libraries to their latest published versions in the catalog,
# then refresh the lockfile. Versions live in pnpm-workspace.yaml (catalog:).
update-geoman:
  pnpm up -r --latest "@geoman-io/maplibre-geoman-free" "@geoman-io/mapbox-geoman-free"

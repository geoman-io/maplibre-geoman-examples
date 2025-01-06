build: build-vue build-vite build-react build-preact build-svelte build-nextjs

build-vue:
  cd maplibre-geoman-vue; npm install; npm run build

build-vite:
  cd maplibre-geoman-vite; npm install; npm run build

build-react:
  cd maplibre-geoman-react; npm install; npm run build

build-preact:
  cd maplibre-geoman-preact; npm install; npm run build

build-svelte:
  cd maplibre-geoman-svelte; npm install; npm run build

build-nextjs:
  cd maplibre-geoman-nextjs && npm install && npm run build

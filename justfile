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

fix:
  cd maplibre-geoman-svelte && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd maplibre-geoman-nextjs  && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd maplibre-geoman-preact  && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd maplibre-geoman-react  && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd maplibre-geoman-vite  && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd maplibre-geoman-vue  && npm uninstall @geoman-io/maplibre-geoman-free && npm install @geoman-io/maplibre-geoman-free
  cd mapbox-geoman-svelte  && npm uninstall @geoman-io/mapbox-geoman-free && npm install @geoman-io/mapbox-geoman-free
  
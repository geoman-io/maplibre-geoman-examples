<template>
  <div class="geoman-map" ref="mapElement"></div>
</template>

<script setup lang="ts">
import { Geoman, GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
import { demoFeatures } from '@/fixtures/features.ts';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { onMounted, ref } from 'vue';
import mapStyle from './style';

// MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
// point it at one before creating a map. Vite serves the worker via the `?worker&url` query.
ml.setWorkerUrl(workerUrl);


const emit = defineEmits(['gm-event']);
const mapElement = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!mapElement.value) {
    console.log('Missing map element');
    return;
  }

  const map = new ml.Map({
    container: mapElement.value,
    style: mapStyle,
    center: [0, 51],
    zoom: 5,
  });


  const gmOptions: GmOptionsPartial = {
    controls: {
      helper: {
        snapping: {
          uiEnabled: true,
          active: true,
        },
      },
    },
  };

  // create a new geoman instance
  const geoman = new Geoman(map, gmOptions);
  const mapOn = geoman.mapAdapter.on.bind(geoman.mapAdapter) as unknown as (
    eventName: string,
    listener: (event: unknown) => void,
  ) => void;

  const loadDevShapes = () => {
    if (!geoman) {
      console.warn('Geoman not loaded yet');
      return;
    }

    const gm = geoman;

    demoFeatures.forEach((shapeGeoJson) => {
      gm.features.importGeoJsonFeature(shapeGeoJson);
    });

    console.log('Shapes loaded', demoFeatures);
  };

  // Enable to listen to all events
  //   map.gm.setGlobalEventsListener((event: GlobalEventsListenerParemeters) => {
  //   if (event.type === 'converted') {
  //     console.log('Regular event', event);
  //   } else if (event.type === 'system') {
  //     console.log('System event', event);
  //   }
  // });

  // load shapes
  mapOn('gm:loaded', () => {
    console.log('Geoman fully loaded');

    // Here we can define and add a geojson shape to the map (or load it from a server)
    loadDevShapes();

    // enable drawing tools
    geoman.enableDraw('line');
  });

  // Mode events
  mapOn('gm:globaldrawmodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globaleditmodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globalremovemodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globalrotatemodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globaldragmodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globalcutmodetoggled', (event) => emit('gm-event', event));
  mapOn('gm:globalsnappingmodetoggled', (event) => emit('gm-event', event));

  // Drawing events
  //geoman.mapAdapter.on('gm:draw', (event) => emit('gm-event', event)); // Enable to listen to all draw events
  mapOn('gm:create', (event) => emit('gm-event', event));

  // Edit events
  //geoman.mapAdapter.on('gm:edit', (event) => emit('gm-event', event)); // Enable to listen to all edit events
  mapOn('gm:editstart', (event) => emit('gm-event', event));
  mapOn('gm:editend', (event) => emit('gm-event', event));

  // Remove events
  mapOn('gm:remove', (event) => emit('gm-event', event));

  // Rotate events
  //geoman.mapAdapter.on('gm:rotate', (event) => emit('gm-event', event)); // Enable to listen to all rotate events
  mapOn('gm:rotatestart', (event) => emit('gm-event', event));
  mapOn('gm:rotateend', (event) => emit('gm-event', event));


  // Drag events
  //geoman.mapAdapter.on('gm:drag', (event) => emit('gm-event', event)); // Enable to listen to all drag events
  mapOn('gm:dragstart', (event) => emit('gm-event', event));
  mapOn('gm:dragend', (event) => emit('gm-event', event));

  // Cut events
  mapOn('gm:cut', (event) => emit('gm-event', event));

  // Enable to listen to all helper and control events
  mapOn('gm:helper', (event) => emit('gm-event', event));
  mapOn('gm:control', (event) => emit('gm-event', event));
});
</script>

<style scoped lang="scss">
.geoman-map {
  background-color: #f7f7f7;
}
</style>

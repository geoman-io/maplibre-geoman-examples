<script lang="ts">
  import * as ml from 'maplibre-gl';
  import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import { Geoman, type GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
  import { onDestroy, onMount } from 'svelte';
  import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { demoFeatures } from '../fixtures/features';
  import mapStyle from './maplibre-style';

  const { handleEvent }: {
    handleEvent: (event: any) => void;
  } = $props();

  let map: ml.Map | null = null;
  let geoman: Geoman | null = null;

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

  onMount(() => {
    ml.setWorkerUrl(maplibreWorkerUrl);
    map = new ml.Map({
      container: 'dev-map',
      style: mapStyle,
      center: [0, 51],
      zoom: 5,
      fadeDuration: 50,
    });
    
    geoman = new Geoman(map, gmOptions);
    geoman.mapAdapter.once(`gm:loaded`, () => {
      console.log('Geoman loaded', geoman);
      loadDevShapes();
      geoman?.enableDraw('line');
    });

    // Enable to listen to all events
    //   geoman.setGlobalEventsListener((event: GlobalEventsListenerParemeters) => {
    //   if (event.type === 'converted') {
    //     console.log('Regular event', event);
    //   } else if (event.type === 'system') {
    //     console.log('System event', event);
    //   }
    // });

    // enable drawing tools

    // Mode events
    geoman.mapAdapter.on('gm:globaldrawmodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globaleditmodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globaldeletemodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globalrotatemodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globaldragmodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globalcutmodetoggled', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:globalsnappingmodetoggled', (event) => handleEvent(event));

    // Drawing events
    //geoman.mapAdapter.on('gm:draw', (event) => handleEvent(event)); // Enable to listen to all draw events
    geoman.mapAdapter.on('gm:create', (event) => handleEvent(event));

    // Edit events
    //geoman.mapAdapter.on('gm:edit', (event) => handleEvent(event)); // Enable to listen to all edit events
    geoman.mapAdapter.on('gm:editstart', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:editend', (event) => handleEvent(event));

    // Remove events
    geoman.mapAdapter.on('gm:remove', (event) => handleEvent(event));

    // Rotate events
    //geoman.mapAdapter.on('gm:rotate', (event) => handleEvent(event)); // Enable to listen to all rotate events
    geoman.mapAdapter.on('gm:rotatestart', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:rotateend', (event) => handleEvent(event));

    // Drag events
    //geoman.mapAdapter.on('gm:drag', (event) => handleEvent(event)); // Enable to listen to all drag events
    geoman.mapAdapter.on('gm:dragstart', (event) => handleEvent(event));
    geoman.mapAdapter.on('gm:dragend', (event) => handleEvent(event));

    // Cut events
    geoman.mapAdapter.on('gm:cut', (event) => handleEvent(event));

    // Enable to listen to all helper and control events
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div id="dev-map">
  <!-- MapLibre Geoman container -->
</div>

<style>
  #dev-map {
    flex: 1 1 auto;
    width: 5rem;
  }
</style>

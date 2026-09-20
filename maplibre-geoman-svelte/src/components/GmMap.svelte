<script lang="ts">
  import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import { Geoman, type GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
  import { onDestroy, onMount } from 'svelte';
  import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { demoFeatures } from '../fixtures/features';
  import mapStyle from './maplibre-style';

  // MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
  // point it at one before creating a map. Vite serves the worker via the `?worker&url` query.
  ml.setWorkerUrl(workerUrl);

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
    map = new ml.Map({
      container: 'dev-map',
      style: mapStyle,
      center: [0, 51],
      zoom: 5,
      fadeDuration: 50,
    });
    
    geoman = new Geoman(map, gmOptions);
    const mapOn = geoman.mapAdapter.on.bind(geoman.mapAdapter) as unknown as (
      eventName: string,
      listener: (event: unknown) => void,
    ) => void;
    mapOn('gm:loaded', () => {
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
    mapOn('gm:globaldrawmodetoggled', (event) => handleEvent(event));
    mapOn('gm:globaleditmodetoggled', (event) => handleEvent(event));
    mapOn('gm:globalremovemodetoggled', (event) => handleEvent(event));
    mapOn('gm:globalrotatemodetoggled', (event) => handleEvent(event));
    mapOn('gm:globaldragmodetoggled', (event) => handleEvent(event));
    mapOn('gm:globalcutmodetoggled', (event) => handleEvent(event));
    mapOn('gm:globalsnappingmodetoggled', (event) => handleEvent(event));

    // Drawing events
    //geoman!.mapAdapter.on('gm:draw', (event) => handleEvent(event)); // Enable to listen to all draw events
    mapOn('gm:create', (event) => handleEvent(event));

    // Edit events
    //geoman!.mapAdapter.on('gm:edit', (event) => handleEvent(event)); // Enable to listen to all edit events
    mapOn('gm:editstart', (event) => handleEvent(event));
    mapOn('gm:editend', (event) => handleEvent(event));

    // Remove events
    mapOn('gm:remove', (event) => handleEvent(event));

    // Rotate events
    //geoman!.mapAdapter.on('gm:rotate', (event) => handleEvent(event)); // Enable to listen to all rotate events
    mapOn('gm:rotatestart', (event) => handleEvent(event));
    mapOn('gm:rotateend', (event) => handleEvent(event));

    // Drag events
    //geoman!.mapAdapter.on('gm:drag', (event) => handleEvent(event)); // Enable to listen to all drag events
    mapOn('gm:dragstart', (event) => handleEvent(event));
    mapOn('gm:dragend', (event) => handleEvent(event));

    // Cut events
    mapOn('gm:cut', (event) => handleEvent(event));

    // Enable to listen to all helper and control events
    mapOn('gm:helper', (event) => handleEvent(event));
    mapOn('gm:control', (event) => handleEvent(event));
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

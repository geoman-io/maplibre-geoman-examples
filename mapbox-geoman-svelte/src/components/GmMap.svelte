<script lang="ts">
  import mapboxgl from 'mapbox-gl';
  import { Geoman, type GmOptionsPartial } from '@geoman-io/mapbox-geoman-free';
  import { onDestroy, onMount } from 'svelte';
  import '@geoman-io/mapbox-geoman-free/dist/mapbox-geoman.css';
  import 'mapbox-gl/dist/mapbox-gl.css';

  import { demoFeatures } from '../fixtures/features';

  const { handleEvent }: {
    handleEvent: (event: any) => void;
  } = $props();

  let map: mapboxgl.Map | null = null;
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
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;
    map = new mapboxgl.Map({
      container: 'dev-map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 51],
      zoom: 5,
      fadeDuration: 50,
    });
    
    geoman = new Geoman(map, gmOptions);
    map.once(`gm:loaded`, () => {
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
    map.on('gm:globaldrawmodetoggled', (event) => handleEvent(event));
    map.on('gm:globaleditmodetoggled', (event) => handleEvent(event));
    map.on('gm:globalremovemodetoggled', (event) => handleEvent(event));
    map.on('gm:globalrotatemodetoggled', (event) => handleEvent(event));
    map.on('gm:globaldragmodetoggled', (event) => handleEvent(event));
    map.on('gm:globalcutmodetoggled', (event) => handleEvent(event));
    map.on('gm:globalsnappingmodetoggled', (event) => handleEvent(event));

    // Drawing events
    //map.on('gm:draw', (event) => handleEvent(event)); // Enable to listen to all draw events
    map.on('gm:create', (event) => handleEvent(event));

    // Edit events
    //map.on('gm:edit', (event) => handleEvent(event)); // Enable to listen to all edit events
    map.on('gm:editstart', (event) => handleEvent(event));
    map.on('gm:editend', (event) => handleEvent(event));

    // Remove events
    map.on('gm:remove', (event) => handleEvent(event));

    // Rotate events
    //map.on('gm:rotate', (event) => handleEvent(event)); // Enable to listen to all rotate events
    map.on('gm:rotatestart', (event) => handleEvent(event));
    map.on('gm:rotateend', (event) => handleEvent(event));

    // Drag events
    //map.on('gm:drag', (event) => handleEvent(event)); // Enable to listen to all drag events
    map.on('gm:dragstart', (event) => handleEvent(event));
    map.on('gm:dragend', (event) => handleEvent(event));

    // Cut events
    map.on('gm:cut', (event) => handleEvent(event));

    // Enable to listen to all helper and control events
    map.on('gm:helper', (event) => handleEvent(event));
    map.on('gm:control', (event) => handleEvent(event));
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

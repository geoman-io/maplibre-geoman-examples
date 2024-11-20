<script lang="ts">
  import ml from 'maplibre-gl';
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
      gm.features.addGeoJsonFeature({ shapeGeoJson });
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
    map.on(`gm:loaded`, () => {
      console.log('Geoman loaded', geoman);
      loadDevShapes();
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
    geoman.enableDraw('line');

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

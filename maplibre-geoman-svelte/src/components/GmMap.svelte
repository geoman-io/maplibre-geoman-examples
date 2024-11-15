<script lang="ts">
  import ml from 'maplibre-gl';
  import { Geoman, type GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
  import { onDestroy, onMount } from 'svelte';
  import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { demoFeatures } from '../fixtures/features';
  import mapStyle from './maplibre-style';

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

  export const loadDevShapes = () => {
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
  }
</style>

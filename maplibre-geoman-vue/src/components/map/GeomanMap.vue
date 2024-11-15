<template>
  <div class="geoman-map" ref="mapElement"></div>
</template>

<script setup lang="ts">
import { GeoJsonImportFeature, Geoman, GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
import ml from 'maplibre-gl';

import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { onMounted, ref } from 'vue';
import mapStyle from './style';


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
    settings: {
      eventPrefix: 'gm',
    },
    // geoman options here
    controls: {
      edit: {
        drag: {
          uiEnabled: true,
        },
        edit: {
          uiEnabled: true,
        }
      },
    }
  };

  // create a new geoman instance
  const geoman = new Geoman(map, gmOptions);

  // Enable to listen to all events
  //   map.gm.setGlobalEventsListener((event: GlobalEventsListenerParemeters) => {
  //   if (event.type === 'converted') {
  //     console.log('Regular event', event);
  //   } else if (event.type === 'system') {
  //     console.log('System event', event);
  //   }
  // });

  // enable drawing tools
  geoman.enableDraw('line');


  // Mode events
  map.on('gm:globaldrawmodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globaleditmodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globalremovemodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globalrotatemodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globaldragmodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globalcutmodetoggled', (event) => emit('gm-event', event));
  map.on('gm:globalsnappingmodetoggled', (event) => emit('gm-event', event));

  // Drawing events
  //map.on('gm:draw', (event) => emit('gm-event', event)); // Enable to listen to all draw events
  map.on('gm:create', (event) => emit('gm-event', event));

  // Edit events
  //map.on('gm:edit', (event) => emit('gm-event', event)); // Enable to listen to all edit events
  map.on('gm:editstart', (event) => emit('gm-event', event));
  map.on('gm:editend', (event) => emit('gm-event', event));

  // Remove events
  map.on('gm:remove', (event) => emit('gm-event', event));

  // Rotate events  
  //map.on('gm:rotate', (event) => emit('gm-event', event)); // Enable to listen to all rotate events
  map.on('gm:rotatestart', (event) => emit('gm-event', event));
  map.on('gm:rotateend', (event) => emit('gm-event', event));


  // Drag events
  //map.on('gm:drag', (event) => emit('gm-event', event)); // Enable to listen to all drag events
  map.on('gm:dragstart', (event) => emit('gm-event', event));
  map.on('gm:dragend', (event) => emit('gm-event', event));

  // Cut events
  map.on('gm:cut', (event) => emit('gm-event', event));

  // Enable to listen to all helper and control events
  map.on('gm:helper', (event) => emit('gm-event', event));
  map.on('gm:control', (event) => emit('gm-event', event));

  map.on('gm:loaded', () => {
    console.log('Geoman fully loaded');

    // Here we can define and add a geojson shape to the map (or load it from a server)
    const pointFeature1: GeoJsonImportFeature = {
      id: "custom-id1",
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 51] },
      properties: {},
    };
    // add a geojson shape to the map
    geoman.features.addGeoJsonFeature({ shapeGeoJson: pointFeature1 });
  });
});
</script>

<style scoped lang="scss">
.geoman-map {
  background-color: #f7f7f7;
}
</style>

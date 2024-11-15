<template>
  <div class="geoman-map" ref="mapElement"></div>
</template>

<script setup lang="ts">
import { Geoman, GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
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
    // geoman options here
  };

  // create a new geoman instance
  const geoman = new Geoman(map, gmOptions);

  map.on('gm:draw', (event) => emit('gm-event', event));
  map.on('gm:edit', (event) => emit('gm-event', event));
  map.on('gm:helper', (event) => emit('gm-event', event));
  map.on('gm:control', (event) => emit('gm-event', event));
});
</script>

<style scoped lang="scss">
.geoman-map {
  background-color: #f7f7f7;
}
</style>

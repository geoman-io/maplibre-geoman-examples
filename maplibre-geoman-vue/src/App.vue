<template>
  <div class="main-container">
    <GeomanMap class="map" @gm-event="handleGmEvent" />

    <Sidebar :gmEvents="gmEvents" class="sidebar" />
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw, Ref, ref, type Raw } from 'vue';
import GeomanMap from '@/components/map/GeomanMap.vue';
import Sidebar from '@/components/Sidebar.vue';
import type { FeatureData, GMEvent } from '@geoman-io/maplibre-geoman-free';
import ml from 'maplibre-gl';


type ComponentData = {
  gmEvents: Array<Raw<GMEvent>>;

};

export default defineComponent({
  components: {
    GeomanMap,
    Sidebar,
  },

  data(): ComponentData {
    return {
      gmEvents: [] as Array<GMEvent>,
    };
  },

  methods: {
    getGeoJson(featureData: any) {
      try {
        return JSON.stringify(featureData.getGeoJson(), null, 2);
      } catch (e) {
        return 'Can\'t retrieve GeoJSON';
      }
    },

    handleGmEvent(event: GMEvent) {
      console.log(event);
      const rawEvent = markRaw(event);
      this.gmEvents.push({
        id: event.feature?.id ?? undefined,
        enabled: event.enabled ?? undefined,
        timestamp: new Date().toLocaleTimeString(),
        type: event.type,
        shape: event.shape ?? undefined,
        geojson: event.feature ? this.getGeoJson(event.feature) : undefined,
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.main-container {
  margin: 0;
  padding: 0;
  display: flex;
  height: 100vh;
  width: 100vw;

  .map {
    width: 5rem;
    flex: 1 1 auto;
  }

  .sidebar {
    width: 25rem;
    flex: 0 0 auto;
  }
}
</style>

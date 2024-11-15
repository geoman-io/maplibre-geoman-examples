<template>
  <div class="main-container">
    <GeomanMap
      class="map"
      @gm-event="handleGmEvent" />

    <Sidebar
      :gmEvents="gmEvents"
      class="sidebar" />
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw, type Raw } from 'vue';
import GeomanMap from '@/components/map/GeomanMap.vue';
import Sidebar from '@/components/Sidebar.vue';
import type { GMEvent } from '@geoman-io/maplibre-geoman-free';

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
    handleGmEvent(event: GMEvent) {
      if (['feature_created', 'feature_removed'].includes(event.action)) {
        const rawEvent = markRaw(event);
        this.gmEvents.push(rawEvent);
      }
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

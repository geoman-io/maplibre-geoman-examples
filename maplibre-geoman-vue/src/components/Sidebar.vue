<template>
  <div class="sidebar" ref="sidebarElement">
    <div
      v-for="(item, index) in gmEvents"
      :key="index"
      class="event-item">
      <div>
        [{{ new Date().toLocaleTimeString() }}]
      </div>
      <div>
        Action: {{ item.action }}
      </div>
      <template v-if="item.action === 'feature_created' || item.action === 'feature_removed'">
        <div>Feature Id: {{ item.featureData.id }}</div>
        <div>Feature type: {{ item.mode }}</div>

        <div class="geojson-header" @click="() => toggleGeoJsonItem(index)">GeoJSON</div>
        <pre v-if="expandedGeojsonItem === index" class="geojson">{{ getGeoJson(item.featureData) }}</pre>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { GMEvent } from '@geoman-io/maplibre-geoman-free';


export default defineComponent({
  name: 'Sidebar',

  props: {
    gmEvents: {
      type: Array as PropType<Array<GMEvent>>,
      required: true,
    },
  },

  data() {
    return {
      expandedGeojsonItem: -1,
    };
  },

  methods: {
    toggleGeoJsonItem(index: number) {
      if (this.expandedGeojsonItem === index) {
        this.expandedGeojsonItem = -1;
      } else {
        this.expandedGeojsonItem = index;
      }
    },

    getGeoJson(featureData: any) {
      try {
        return JSON.stringify(featureData.getGeoJson(), null, 2);
      } catch (e) {
        return 'Can\'t retrieve GeoJSON';
      }
    }
  },

  watch: {
    'gmEvents.length': {
      handler() {
        this.$nextTick(() => {
          const sidebarElement = this.$refs.sidebarElement as HTMLElement;
          sidebarElement.scrollTo(0, sidebarElement.scrollHeight);
        });
      },
    },
  },
});
</script>

<style scoped lang="scss">
.sidebar {
  padding: 0.5rem;
  background-color: #f8f8f8;
  border-left: 1px solid #cdcdcd;
  overflow-y: auto;

  .event-item {
    padding: 0.3rem;
    margin-bottom: 0.5rem;
    border-radius: 0.3rem;
    background-color: #d8ecff;
    font-family: monospace;

    .geojson-header {
      margin-top: 0.5rem;
      padding: 0.3rem;
      cursor: pointer;
      background-color: #ffeac9;
      &:hover {
        font-weight: bold;
      }
    }

    .geojson {
      margin: 0;
      padding: 0.3rem;
      font-size: 0.8rem;
      background-color: #fbf5e2;
    }
  }
}
</style>

<template>
  <div class="sidebar" ref="sidebarElement">
    <div v-for="(item, index) in gmEvents" :key="index" class="event-item">
      <div>[{{ item.timestamp }}]</div>
      <div>EventType: {{ item.type }}</div>
      <template v-if="item.type === 'gm:globaldrawmodetoggled'">
        <div>Shape: {{ item.shape }}</div>
        <div>Enabled: {{ item.enabled }}</div>
      </template>
      <template
        v-if="item.type === 'gm:globalsnappingmodetoggled' || item.type === 'gm:globalcutmodetoggled' || item.type === 'gm:globaleditmodetoggled' || item.type === 'gm:globaldragmodetoggled' || item.type === 'gm:globalrotatemodetoggled'">
        <div>Enabled: {{ item.enabled }}</div>
      </template>
      <template v-if="item.type === 'gm:create'">
        <div>Feature Id: {{ item.id }}</div>
        <div>Feature type: {{ item.shape }}</div>
        <div class="geojson-header" @click="() => toggleGeoJsonItem(index)">GeoJSON</div>
        <pre v-if="expandedGeojsonItem === index" class="geojson">{{ item.geojson }}</pre>
      </template>
      <template v-if="item.type === 'gm:remove'">
        <div>Feature Id: {{ item.id }}</div>
        <div>Feature type: {{ item.shape }}</div>
      </template>
      <template v-if="shouldShowFeatureDetails(item.type)">
        <div>Feature Id: {{ item.id }}</div>
        <div class="geojson-header" @click="() => toggleGeoJsonItem(index)">GeoJSON</div>
        <pre v-if="expandedGeojsonItem === index" class="geojson">{{ item.geojson }}</pre>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'Sidebar',

  props: {
    gmEvents: {
      type: Array as PropType<Array<any>>,
      required: true,
    },
  },

  data() {
    return {
      activeTab: 'events',
      expandedGeojsonItem: -1,
      expandedFeatureId: '',
    };
  },

  methods: {
    shouldShowFeatureDetails(type: string): boolean {
      const featureDetailTypes = [
        'gm:drag',
        'gm:dragstart',
        'gm:dragend',
        'gm:edit',
        'gm:editstart',
        'gm:editend',
        'gm:scale',
        'gm:scalestart',
        'gm:scaleend',
        'gm:rotate',
        'gm:rotatestart',
        'gm:rotateend',
        'gm:cut'
      ];
      return featureDetailTypes.includes(type);
    },
    toggleGeoJsonItem(index: number) {
      if (this.expandedGeojsonItem === index) {
        this.expandedGeojsonItem = -1;
      } else {
        this.expandedGeojsonItem = index;
      }
    },

    toggleFeatureGeoJson(id: string) {
      if (this.expandedFeatureId === id) {
        this.expandedFeatureId = '';
      } else {
        this.expandedFeatureId = id;
      }
    },

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
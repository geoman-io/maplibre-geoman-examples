<script lang="ts">
  import { tick } from 'svelte';


  const { gmEvents }: { gmEvents: Array<any> } = $props();

  let expandedGeojsonItem = $state(-1);
  let expandedFeatureId = '';
  let sidebarElement: HTMLElement;

  function toggleGeoJsonItem(index: number) {
    expandedGeojsonItem = expandedGeojsonItem === index ? -1 : index;
  }

  function toggleFeatureGeoJson(id: string) {
    expandedFeatureId = expandedFeatureId === id ? '' : id;
  }

  // Use the effect rune to reactively scroll the sidebar when gmEvents.length changes
  $effect(() => {
    gmEvents.length; // Dependency tracking
    tick().then(() => {
      if (sidebarElement) {
        sidebarElement.scrollTo(0, sidebarElement.scrollHeight);
      }
    });
  });
</script>

<div class="sidebar" bind:this={sidebarElement}>
  {#each gmEvents as item, index (index)}
    <div class="event-item">
      <div>[{item.timestamp}]</div>
      <div>EventType: {item.type}</div>

      {#if item.type === 'gm:globaldrawmodetoggled'}
        <div>Shape: {item.shape}</div>
        <div>Enabled: {item.enabled}</div>
      {/if}

      {#if [
        'gm:globalsnappingmodetoggled',
        'gm:globalcutmodetoggled',
        'gm:globaleditmodetoggled',
        'gm:globaldragmodetoggled',
        'gm:globalrotatemodetoggled'
      ].includes(item.type)}
        <div>Enabled: {item.enabled}</div>
      {/if}

      {#if item.type === 'gm:create'}
        <div>Feature Id: {item.id}</div>
        <div>Feature type: {item.shape}</div>
        <button class="geojson-header" onclick={() => toggleGeoJsonItem(index)}>GeoJSON</button>
        {#if expandedGeojsonItem === index}
          <pre class="geojson">{item.geojson}</pre>
        {/if}
      {/if}

      {#if item.type === 'gm:remove'}
        <div>Feature Id: {item.id}</div>
        <div>Feature type: {item.shape}</div>
      {/if}

      {#if [
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
      ].includes(item.type)}
        <div>Feature Id: {item.id}</div>
        <button class="geojson-header" onclick={() => toggleGeoJsonItem(index)}>GeoJSON</button>
        {#if expandedGeojsonItem === index}
          <pre class="geojson">{item.geojson}</pre>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .sidebar {
    flex: 0 0 auto;
    width: 25rem;

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
        width: 100%;
        border: none;
        text-align: left;
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

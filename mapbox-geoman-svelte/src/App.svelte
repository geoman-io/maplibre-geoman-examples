<script lang="ts">
  import './styles/index.css';
  import GmMap from './components/GmMap.svelte';
  import Sidebar from './components/Sidebar.svelte';


  const gmEvents: Array<any> = $state([]);

  const getGeoJson = (featureData: any) => {
    try {
      return JSON.stringify(featureData.getGeoJson(), null, 2);
    } catch (e) {
      return 'Can\'t retrieve GeoJSON';
    }
  };

  const handleEvent = (event: any) => {
    console.log('Event', event);

    gmEvents.push({
      id: event?.feature?.id ?? undefined,
      enabled: event?.enabled ?? undefined,
      timestamp: new Date().toLocaleTimeString(),
      type: event?.type,
      shape: event?.shape ?? undefined,
      geojson: event?.feature ? getGeoJson(event.feature) : undefined,
    });
  };
</script>

<main class="main-container">
  <GmMap {handleEvent} />
  <Sidebar {gmEvents} />
</main>

<style>
  .main-container {
    margin: 0;
    padding: 0;
    display: flex;
    height: 100vh;
    width: 100vw;
  }
</style>

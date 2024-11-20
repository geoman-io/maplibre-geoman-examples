import type { FeatureData } from '@geoman-io/maplibre-geoman-free';
import { FunctionalComponent } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import GmMap from './components/GmMap';
import Sidebar from './components/Sidebar';
import type { GmEvent, GmEventData } from './types.ts';
import './styles/index.css';


const App: FunctionalComponent = () => {
  const [gmEvents, setGmEvents] = useState<GmEventData[]>([]);

  const getGeoJson = (featureData: FeatureData) => {
    try {
      return JSON.stringify(featureData.getGeoJson(), null, 2);
    } catch (error) {
      return `Can't retrieve GeoJSON: ${error}`;
    }
  };

  const handleEvent = useCallback((event: GmEvent) => {
    console.log('Event', event);

    setGmEvents((prevEvents) => [
      ...prevEvents,
      {
        id: event.feature?.id,
        enabled: event.enabled,
        timestamp: new Date().toLocaleTimeString(),
        type: event.type,
        shape: event.shape,
        geojson: event.feature ? getGeoJson(event.feature) : undefined,
      },
    ]);
  }, []);

  return (
    <main className="main-container">
      <GmMap handleEvent={handleEvent} />
      <Sidebar gmEvents={gmEvents} />
    </main>
  );
};

export default App;

import type { FeatureData } from '@geoman-io/maplibre-geoman-free';
import React, { useCallback, useState } from 'react';
import GmMap from './components/GmMap';
import Sidebar from './components/Sidebar';
import './styles/index.css';
import type { GmEvent, GmEventData } from './types.ts';


const App: React.FC = () => {
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
        id: event?.feature?.id ?? undefined,
        enabled: event?.enabled ?? undefined,
        timestamp: new Date().toLocaleTimeString(),
        type: event?.type,
        shape: event?.shape ?? undefined,
        geojson: event?.feature ? getGeoJson(event.feature) : undefined,
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

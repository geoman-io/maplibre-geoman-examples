'use client';

import GmMap from '@/components/GmMap';
import Sidebar from '@/components/Sidebar';
import type { GmEvent, GmEventData } from '@/types/events';
import type { FeatureData } from '@geoman-io/maplibre-geoman-free';
import React, { useCallback, useState } from 'react';
import '@/styles/index.css';


const Page: React.FC = () => {
  const [gmEvents, setGmEvents] = useState<GmEventData[]>([]);

  const getGeoJson = useCallback((featureData: FeatureData) => {
    try {
      return JSON.stringify(featureData.getGeoJson(), null, 2);
    } catch (error) {
      return `Can't retrieve GeoJSON: ${error}`;
    }
  }, []);

  const handleEvent = useCallback(
    (event: GmEvent) => {
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
    },
    [getGeoJson]
  );

  return (
    <main className="main-container">
      <GmMap handleEvent={handleEvent} />
      <Sidebar gmEvents={gmEvents} />
    </main>
  );
};

export default Page;

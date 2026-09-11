'use client';

import { demoFeatures } from '@/lib/features';
import mapStyle from '@/lib/maplibre-style';
import type { GmEvent } from '@/types/events';
import React, { useEffect, useRef } from 'react';
import * as ml from 'maplibre-gl';
import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';


interface GmMapProps {
  handleEvent: (event: GmEvent) => void;
}

const gmOptions = {
  controls: {
    helper: {
      snapping: {
        uiEnabled: true,
        active: true,
      },
    },
  },
};

const GmMap: React.FC<GmMapProps> = ({ handleEvent }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<ml.Map | null>(null);
  const geomanInstance = useRef<Geoman | null>(null);

  // Use a ref to store the handleEvent function
  const handleEventRef = useRef(handleEvent);

  // Update the ref whenever handleEvent changes
  useEffect(() => {
    handleEventRef.current = handleEvent;
  }, [handleEvent]);

  useEffect(() => {
    if (mapRef.current) {
      ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
      const map = new ml.Map({
        container: mapRef.current,
        style: mapStyle,
        center: [0, 51],
        zoom: 5,
        fadeDuration: 50,
      });

      mapInstance.current = map;
      const geoman = new Geoman(map, gmOptions);
      geomanInstance.current = geoman;

      const loadDevShapes = () => {
        if (!geomanInstance.current) {
          console.warn('Geoman not loaded yet');
          return;
        }

        demoFeatures.forEach((shapeGeoJson) => {
          geomanInstance.current!.features.importGeoJsonFeature(shapeGeoJson);
        });

        console.log('Shapes loaded', demoFeatures);
      };

      geoman.mapAdapter.on('gm:loaded', () => {
        console.log('Geoman loaded', geoman);
        loadDevShapes();
        // Enable drawing tools
        geoman.enableDraw('line');
      });

      // Event handler that uses the latest handleEventRef.current
      const eventHandler = (event: GmEvent) => {
        handleEventRef.current(event);
      };

      // Register event listeners using eventHandler
      geoman.mapAdapter.on('gm:globaldrawmodetoggled', (event) => eventHandler({ ...event, type: 'gm:globaldrawmodetoggled' }));
      geoman.mapAdapter.on('gm:globaleditmodetoggled', (event) => eventHandler({ ...event, type: 'gm:globaleditmodetoggled' }));
      geoman.mapAdapter.on('gm:globaldeletemodetoggled', (event) => eventHandler({ ...event, type: 'gm:globaldeletemodetoggled' }));
      geoman.mapAdapter.on('gm:globalrotatemodetoggled', (event) => eventHandler({ ...event, type: 'gm:globalrotatemodetoggled' }));
      geoman.mapAdapter.on('gm:globaldragmodetoggled', (event) => eventHandler({ ...event, type: 'gm:globaldragmodetoggled' }));
      geoman.mapAdapter.on('gm:globalcutmodetoggled', (event) => eventHandler({ ...event, type: 'gm:globalcutmodetoggled' }));
      geoman.mapAdapter.on('gm:globalsnappingmodetoggled', (event) => eventHandler({ ...event, type: 'gm:globalsnappingmodetoggled' }));

      geoman.mapAdapter.on('gm:create', (event) => eventHandler({ ...event, type: 'gm:create' }));
      geoman.mapAdapter.on('gm:editstart', (event) => eventHandler({ ...event, type: 'gm:editstart' }));
      geoman.mapAdapter.on('gm:editend', (event) => eventHandler({ ...event, type: 'gm:editend' }));
      geoman.mapAdapter.on('gm:remove', (event) => eventHandler({ ...event, type: 'gm:remove' }));
      geoman.mapAdapter.on('gm:rotatestart', (event) => eventHandler({ ...event, type: 'gm:rotatestart' }));
      geoman.mapAdapter.on('gm:rotateend', (event) => eventHandler({ ...event, type: 'gm:rotateend' }));
      geoman.mapAdapter.on('gm:dragstart', (event) => eventHandler({ ...event, type: 'gm:dragstart' }));
      geoman.mapAdapter.on('gm:dragend', (event) => eventHandler({ ...event, type: 'gm:dragend' }));
      geoman.mapAdapter.on('gm:cut', (event) => eventHandler({ ...event, type: 'gm:cut' }));
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []); // Empty dependency array

  return (
    <div id="dev-map" ref={mapRef}>
      {/* MapLibre Geoman container */}
    </div>
  );
};

export default GmMap;

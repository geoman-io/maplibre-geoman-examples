import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import React, { useEffect, useRef } from 'react';
import { demoFeatures } from '../fixtures/features';
import type { GmEvent } from '../types.ts';
import mapStyle from './maplibre-style';

// MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
// point it at one before creating a map. Vite serves the worker via the `?worker&url` query.
ml.setWorkerUrl(workerUrl);


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

  useEffect(() => {
    if (mapRef.current) {
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
      const mapOn = geoman.mapAdapter.on.bind(geoman.mapAdapter) as unknown as (
        eventName: string,
        listener: (event: GmEvent) => void,
      ) => void;

      // Define loadDevShapes inside useEffect to handle dependencies correctly
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

      mapOn('gm:loaded', () => {
        console.log('Geoman loaded', geoman);
        // Enable drawing tools
        geoman.enableDraw('line');
        // Load demo shapes
        loadDevShapes();
      });


      // Mode events
      mapOn('gm:globaldrawmodetoggled', handleEvent);
      mapOn('gm:globaleditmodetoggled', handleEvent);
      mapOn('gm:globalremovemodetoggled', handleEvent);
      mapOn('gm:globalrotatemodetoggled', handleEvent);
      mapOn('gm:globaldragmodetoggled', handleEvent);
      mapOn('gm:globalcutmodetoggled', handleEvent);
      mapOn('gm:globalsnappingmodetoggled', handleEvent);

      // Drawing events
      // geoman.mapAdapter.on('gm:draw', handleEvent); // Enable to listen to all draw events
      mapOn('gm:create', handleEvent);

      // Edit events
      // geoman.mapAdapter.on('gm:edit', handleEvent); // Enable to listen to all edit events
      mapOn('gm:editstart', handleEvent);
      mapOn('gm:editend', handleEvent);

      // Remove events
      mapOn('gm:remove', handleEvent);

      // Rotate events
      // geoman.mapAdapter.on('gm:rotate', handleEvent); // Enable to listen to all rotate events
      mapOn('gm:rotatestart', handleEvent);
      mapOn('gm:rotateend', handleEvent);

      // Drag events
      // geoman.mapAdapter.on('gm:drag', handleEvent); // Enable to listen to all drag events
      mapOn('gm:dragstart', handleEvent);
      mapOn('gm:dragend', handleEvent);

      // Cut events
      mapOn('gm:cut', handleEvent);

      // Helper and control events
      mapOn('gm:helper', handleEvent);
      mapOn('gm:control', handleEvent);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [handleEvent]);

  return (
    <div id="dev-map" ref={mapRef} style={{ flex: '1 1 auto', width: '5rem' }}>
      {/* MapLibre Geoman container */}
    </div>
  );
};

export default GmMap;

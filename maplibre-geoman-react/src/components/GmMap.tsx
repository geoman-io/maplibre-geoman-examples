import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as ml from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import React, { useEffect, useRef } from 'react';
import { demoFeatures } from '../fixtures/features';
import type { GmEvent } from '../types.ts';
import mapStyle from './maplibre-style';


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
      ml.setWorkerUrl(maplibreWorkerUrl);
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

      geoman.mapAdapter.on('gm:loaded', () => {
        console.log('Geoman loaded', geoman);
        // Enable drawing tools
        geoman.enableDraw('line');
        // Load demo shapes
        loadDevShapes();
      });


      // Mode events
      geoman.mapAdapter.on('gm:globaldrawmodetoggled', (event) => handleEvent({ ...event, type: 'gm:globaldrawmodetoggled' }));
      geoman.mapAdapter.on('gm:globaleditmodetoggled', (event) => handleEvent({ ...event, type: 'gm:globaleditmodetoggled' }));
      geoman.mapAdapter.on('gm:globaldeletemodetoggled', (event) => handleEvent({ ...event, type: 'gm:globaldeletemodetoggled' }));
      geoman.mapAdapter.on('gm:globalrotatemodetoggled', (event) => handleEvent({ ...event, type: 'gm:globalrotatemodetoggled' }));
      geoman.mapAdapter.on('gm:globaldragmodetoggled', (event) => handleEvent({ ...event, type: 'gm:globaldragmodetoggled' }));
      geoman.mapAdapter.on('gm:globalcutmodetoggled', (event) => handleEvent({ ...event, type: 'gm:globalcutmodetoggled' }));
      geoman.mapAdapter.on('gm:globalsnappingmodetoggled', (event) => handleEvent({ ...event, type: 'gm:globalsnappingmodetoggled' }));

      // Drawing events
      // geoman.mapAdapter.on('gm:draw', (event) => handleEvent({ ...event, type: 'gm:draw' })); // Enable to listen to all draw events
      geoman.mapAdapter.on('gm:create', (event) => handleEvent({ ...event, type: 'gm:create' }));

      // Edit events
      // geoman.mapAdapter.on('gm:edit', (event) => handleEvent({ ...event, type: 'gm:edit' })); // Enable to listen to all edit events
      geoman.mapAdapter.on('gm:editstart', (event) => handleEvent({ ...event, type: 'gm:editstart' }));
      geoman.mapAdapter.on('gm:editend', (event) => handleEvent({ ...event, type: 'gm:editend' }));

      // Remove events
      geoman.mapAdapter.on('gm:remove', (event) => handleEvent({ ...event, type: 'gm:remove' }));

      // Rotate events
      // geoman.mapAdapter.on('gm:rotate', (event) => handleEvent({ ...event, type: 'gm:rotate' })); // Enable to listen to all rotate events
      geoman.mapAdapter.on('gm:rotatestart', (event) => handleEvent({ ...event, type: 'gm:rotatestart' }));
      geoman.mapAdapter.on('gm:rotateend', (event) => handleEvent({ ...event, type: 'gm:rotateend' }));

      // Drag events
      // geoman.mapAdapter.on('gm:drag', (event) => handleEvent({ ...event, type: 'gm:drag' })); // Enable to listen to all drag events
      geoman.mapAdapter.on('gm:dragstart', (event) => handleEvent({ ...event, type: 'gm:dragstart' }));
      geoman.mapAdapter.on('gm:dragend', (event) => handleEvent({ ...event, type: 'gm:dragend' }));

      // Cut events
      geoman.mapAdapter.on('gm:cut', (event) => handleEvent({ ...event, type: 'gm:cut' }));

      // Helper and control events
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

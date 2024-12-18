import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import ml from 'maplibre-gl';
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

      map.on('gm:loaded', () => {
        console.log('Geoman loaded', geoman);
        // Enable drawing tools
        geoman.enableDraw('line');
        // Load demo shapes
        loadDevShapes();
      });


      // Mode events
      map.on('gm:globaldrawmodetoggled', handleEvent);
      map.on('gm:globaleditmodetoggled', handleEvent);
      map.on('gm:globalremovemodetoggled', handleEvent);
      map.on('gm:globalrotatemodetoggled', handleEvent);
      map.on('gm:globaldragmodetoggled', handleEvent);
      map.on('gm:globalcutmodetoggled', handleEvent);
      map.on('gm:globalsnappingmodetoggled', handleEvent);

      // Drawing events
      // map.on('gm:draw', handleEvent); // Enable to listen to all draw events
      map.on('gm:create', handleEvent);

      // Edit events
      // map.on('gm:edit', handleEvent); // Enable to listen to all edit events
      map.on('gm:editstart', handleEvent);
      map.on('gm:editend', handleEvent);

      // Remove events
      map.on('gm:remove', handleEvent);

      // Rotate events
      // map.on('gm:rotate', handleEvent); // Enable to listen to all rotate events
      map.on('gm:rotatestart', handleEvent);
      map.on('gm:rotateend', handleEvent);

      // Drag events
      // map.on('gm:drag', handleEvent); // Enable to listen to all drag events
      map.on('gm:dragstart', handleEvent);
      map.on('gm:dragend', handleEvent);

      // Cut events
      map.on('gm:cut', handleEvent);

      // Helper and control events
      map.on('gm:helper', handleEvent);
      map.on('gm:control', handleEvent);
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

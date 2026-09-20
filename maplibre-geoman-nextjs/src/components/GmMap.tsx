'use client';

import { demoFeatures } from '@/lib/features';
import mapStyle from '@/lib/maplibre-style';
import type { GmEvent } from '@/types/events';
import React, { useEffect, useRef } from 'react';
import * as ml from 'maplibre-gl';
import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
// point it at one before creating a map. `new URL(..., import.meta.url)` is the
// bundler-agnostic form (Turbopack/webpack/esbuild all resolve it).
ml.setWorkerUrl(
  new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href,
);


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
        loadDevShapes();
        // Enable drawing tools
        geoman.enableDraw('line');
      });

      // Event handler that uses the latest handleEventRef.current
      const eventHandler = (event: GmEvent) => {
        handleEventRef.current(event);
      };

      // Register event listeners using eventHandler
      mapOn('gm:globaldrawmodetoggled', eventHandler);
      mapOn('gm:globaleditmodetoggled', eventHandler);
      mapOn('gm:globalremovemodetoggled', eventHandler);
      mapOn('gm:globalrotatemodetoggled', eventHandler);
      mapOn('gm:globaldragmodetoggled', eventHandler);
      mapOn('gm:globalcutmodetoggled', eventHandler);
      mapOn('gm:globalsnappingmodetoggled', eventHandler);

      mapOn('gm:create', eventHandler);
      mapOn('gm:editstart', eventHandler);
      mapOn('gm:editend', eventHandler);
      mapOn('gm:remove', eventHandler);
      mapOn('gm:rotatestart', eventHandler);
      mapOn('gm:rotateend', eventHandler);
      mapOn('gm:dragstart', eventHandler);
      mapOn('gm:dragend', eventHandler);
      mapOn('gm:cut', eventHandler);
      mapOn('gm:helper', eventHandler);
      mapOn('gm:control', eventHandler);
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

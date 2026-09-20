import { FunctionalComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { demoFeatures } from '../fixtures/features.ts';
import type { GmEvent } from '../types.ts';
import mapStyle from './maplibre-style.ts';

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

const GmMap: FunctionalComponent<GmMapProps> = ({ handleEvent }) => {
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



      // Event handler
      const eventHandler = (event: GmEvent) => {
        handleEvent(event);
      };

      // Register event listeners
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

      // Cleanup on unmount
      return () => {
        if (mapInstance.current) {
          mapInstance.current.remove();
        }
      };
    }
  }, [handleEvent]);

  return (
    <div id="dev-map" ref={mapRef}>
      {/* MapLibre Geoman container */}
    </div>
  );
};

export default GmMap;

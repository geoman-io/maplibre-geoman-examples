import { FunctionalComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import ml from 'maplibre-gl';
import { Geoman } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { demoFeatures } from '../fixtures/features.ts';
import type { GmEvent } from '../types.ts';
import mapStyle from './maplibre-style.ts';


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
        loadDevShapes();

        // Enable drawing tools
        geoman.enableDraw('line');
      });



      // Event handler
      const eventHandler = (event: GmEvent) => {
        handleEvent(event);
      };

      // Register event listeners
      map.on('gm:globaldrawmodetoggled', eventHandler);
      map.on('gm:globaleditmodetoggled', eventHandler);
      map.on('gm:globalremovemodetoggled', eventHandler);
      map.on('gm:globalrotatemodetoggled', eventHandler);
      map.on('gm:globaldragmodetoggled', eventHandler);
      map.on('gm:globalcutmodetoggled', eventHandler);
      map.on('gm:globalsnappingmodetoggled', eventHandler);

      map.on('gm:create', eventHandler);
      map.on('gm:editstart', eventHandler);
      map.on('gm:editend', eventHandler);

      map.on('gm:remove', eventHandler);

      map.on('gm:rotatestart', eventHandler);
      map.on('gm:rotateend', eventHandler);

      map.on('gm:dragstart', eventHandler);
      map.on('gm:dragend', eventHandler);

      map.on('gm:cut', eventHandler);

      map.on('gm:helper', eventHandler);
      map.on('gm:control', eventHandler);

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

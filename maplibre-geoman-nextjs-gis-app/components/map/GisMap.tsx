'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Geoman } from '@geoman-io/maplibre-geoman-pro';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@geoman-io/maplibre-geoman-pro/dist/maplibre-geoman.css';
import mapStyle from '@/lib/maplibre-style';

export type GisMapHandle = {
  map: maplibregl.Map;
  gm: Geoman;
};

// Typed against the real constructor signature so option literals are checked.
const GM_OPTIONS: NonNullable<ConstructorParameters<typeof Geoman>[1]> = {
  settings: {
    // Fully custom UI: Geoman renders no control bar of its own. Every control
    // in this app is a React overlay that drives Geoman programmatically.
    useControlsUi: false,
    // Globally-unique feature ids so they never collide across layers/reloads
    // (features are keyed by id in the DB with a (userId, id) primary key).
    idGenerator: () => crypto.randomUUID(),
  },
  controls: {
    helper: {
      snapping: { uiEnabled: true, active: true },
    },
  },
};

interface GisMapProps {
  /** Called once, after `gm:loaded`, with the live map + Geoman instances. */
  onReady?: (handle: GisMapHandle) => void;
}

export default function GisMap({ onReady }: GisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const gmRef = useRef<Geoman | null>(null);

  // Keep the latest callback without retriggering the init effect.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [0, 51],
      zoom: 5,
      fadeDuration: 50,
    });
    mapRef.current = map;

    const gm = new Geoman(map, GM_OPTIONS);
    gmRef.current = gm;

    map.on('gm:loaded', () => {
      onReadyRef.current?.({ map, gm });
    });

    // Keep MapLibre's canvas in sync with the container — guards against the
    // container being measured at 0px during the initial layout pass.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      gmRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

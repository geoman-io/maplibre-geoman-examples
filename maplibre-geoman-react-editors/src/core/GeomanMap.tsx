import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Geoman } from '@geoman-io/maplibre-geoman-pro';
import { mapStyle } from '../mapStyle';

/**
 * A MapLibre map + Geoman Pro instance with the native control bar disabled —
 * every control in this app is a custom React toolbar driving Geoman.
 *
 * Note: the container is a flex child (not `absolute inset-0`); maplibre-gl.css's
 * unlayered `.maplibregl-map { position: relative }` beats Tailwind's layered
 * `.absolute` and would collapse an absolute box.
 */
export default function GeomanMap({
  center,
  zoom,
  onReady,
}: {
  center: [number, number];
  zoom: number;
  onReady: (gm: Geoman, map: maplibregl.Map) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({ container, style: mapStyle, center, zoom });
    const gm = new Geoman(map, {
      settings: { useControlsUi: false, idGenerator: () => crypto.randomUUID() },
    });
    map.on('gm:loaded', () => onReadyRef.current(gm, map));
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);
    return () => {
      ro.disconnect();
      map.remove();
    };
    // center/zoom are only the initial view — intentionally not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="min-h-0 flex-1" />;
}

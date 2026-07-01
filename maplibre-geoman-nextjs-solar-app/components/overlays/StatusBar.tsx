'use client';

import { useEffect, useState } from 'react';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import { useEditorStore } from '@/hooks/useEditorStore';

const getMap = (gm: Geoman) => gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;

export default function StatusBar({ gm }: { gm: Geoman }) {
  const [pos, setPos] = useState<{ lng: number; lat: number } | null>(null);
  const [zoom, setZoom] = useState<number>(() => getMap(gm).getZoom());

  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const selectedId = useEditorStore((s) => s.selectedFeatureId);
  const activeTool = useEditorStore((s) => s.activeTool);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const featureCount = Object.keys(features).length;

  useEffect(() => {
    const map = getMap(gm);
    const onMove = (e: maplibregl.MapMouseEvent) => setPos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    const onZoom = () => setZoom(map.getZoom());
    map.on('mousemove', onMove);
    map.on('zoom', onZoom);
    return () => {
      map.off('mousemove', onMove);
      map.off('zoom', onZoom);
    };
  }, [gm]);

  const cell = 'whitespace-nowrap px-3 py-1 tabular-nums';

  return (
    <div className="pointer-events-auto flex items-center divide-x divide-zinc-200 rounded-lg bg-white/95 text-[11px] font-medium text-zinc-600 shadow ring-1 ring-black/5 backdrop-blur">
      <span className={cell}>
        {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : '—, —'}
      </span>
      <span className={cell}>z {zoom.toFixed(1)}</span>
      <span className={cell}>
        <span className="text-zinc-400">layer</span>{' '}
        {activeLayer ? (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: activeLayer.color }} />
            {activeLayer.name}
          </span>
        ) : (
          '—'
        )}
      </span>
      <span className={cell}>{featureCount} features</span>
      {selectedId && <span className={`${cell} text-blue-600`}>1 selected</span>}
      {activeTool && (
        <span className={`${cell} font-semibold text-blue-600`}>{activeTool.title}</span>
      )}
      <span className={cell}>EPSG:4326</span>
    </div>
  );
}

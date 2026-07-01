import { useState } from 'react';
import { useEditorStore } from '../../core/store';
import { Card, LayerList, MetricGrid, ResetButton } from '../../core/ui';
import { areaSqft } from '../../core/measure';
import type { EditorController } from '../../core/controller';
import { LAND_USE } from './def';

const ac = (sqft: number) => `${(sqft / 43560).toFixed(2)} ac`;

/** Top-left corner of a feature (for north-to-south, west-to-east ordering). */
function topLeft(geom: unknown): [number, number] {
  let minX = Infinity, maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      minX = Math.min(minX, c[0] as number);
      maxY = Math.max(maxY, c[1] as number);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk((geom as { coordinates?: unknown } | null)?.coordinates);
  return [minX, maxY];
}

export default function Sidebar({ controller }: { controller: EditorController }) {
  const features = useEditorStore((s) => s.features);
  const layers = useEditorStore((s) => s.layers);
  const [busy, setBusy] = useState(false);

  const parcelsId = layers.find((l) => l.name === 'Parcels')?.id;
  const parcels = Object.values(features).filter((f) => f.layerId === parcelsId);
  const totalArea = parcels.reduce((s, p) => s + areaSqft(p.geojson.geometry), 0);

  // Integration: renumber every parcel APN-001…N, ordered north→south, west→east.
  const renumber = async () => {
    setBusy(true);
    try {
      const ordered = [...parcels].sort((a, b) => {
        const [ax, ay] = topLeft(a.geojson.geometry);
        const [bx, by] = topLeft(b.geojson.geometry);
        return by - ay || ax - bx;
      });
      for (let i = 0; i < ordered.length; i++) {
        const apn = `APN-${String(i + 1).padStart(3, '0')}`;
        await controller.updateFeatureMetadata(ordered[i].id, { ...ordered[i].metadata, apn });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Card title="Parcel summary">
          <MetricGrid
            items={[
              { label: 'Parcels', value: String(parcels.length) },
              { label: 'Total area', value: ac(totalArea) },
              { label: 'Easements', value: String(Object.values(features).filter((f) => f.layerId === layers.find((l) => l.name === 'Easements')?.id).length) },
              { label: 'Avg lot', value: parcels.length ? ac(totalArea / parcels.length) : '—' },
            ]}
          />
          <div className="p-2.5">
            <button
              onClick={renumber}
              disabled={busy || parcels.length === 0}
              className="w-full rounded-lg bg-zinc-900 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? 'Renumbering…' : 'Renumber parcels'}
            </button>
          </div>
        </Card>

        <Card title="Land use">
          <div className="space-y-1 p-2.5">
            {Object.entries(LAND_USE).map(([use, color]) => (
              <div key={use} className="flex items-center gap-2 px-1 text-xs">
                <span className="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: color }} />
                <span className="flex-1 capitalize text-zinc-600">{use}</span>
                <span className="tabular-nums text-zinc-400">
                  {parcels.filter((p) => p.metadata.landuse === use).length}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Layers">
          <LayerList controller={controller} />
        </Card>
      </div>
      <div className="border-t border-zinc-200 p-3">
        <ResetButton controller={controller} />
      </div>
    </>
  );
}

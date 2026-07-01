'use client';

import { useMemo, useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';
import { MODULES_LAYER, ROOF_LAYER } from '@/lib/solar/domain';
import { roofProduction } from '@/lib/solar/production';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (az: number) => COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8];

/**
 * Roof-plane inspector: orientation (azimuth / tilt) controls, the auto-layout
 * and setback actions, and the plane's production estimate. Renders only when
 * the selected feature is a roof plane.
 */
export default function RoofPanel({ controller }: { controller: EditorController }) {
  const feature = useEditorStore((s) =>
    s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined,
  );
  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const roofLayer = layers.find((l) => l.name === ROOF_LAYER);
  const modulesLayer = layers.find((l) => l.name === MODULES_LAYER);

  const panelsOnRoof = useMemo(() => {
    if (!feature) return [];
    const key = feature.metadata.name || feature.id;
    return Object.values(features).filter(
      (f) => f.layerId === modulesLayer?.id && f.metadata.roof === key,
    );
  }, [feature, features, modulesLayer?.id]);

  if (!feature || !roofLayer || feature.layerId !== roofLayer.id) return null;

  const azimuth = Number(feature.metadata.azimuth);
  const tilt = Number(feature.metadata.tilt);
  const prod = roofProduction(feature, panelsOnRoof);

  const setMeta = (patch: Record<string, string>) =>
    void controller.updateFeatureMetadata(feature.id, { ...feature.metadata, ...patch });

  const run = async (
    fn: () => Promise<number | void> | number | void,
    done: (n?: number) => string,
  ) => {
    setBusy(true);
    setStatus(null);
    try {
      const n = await fn();
      setStatus(done(typeof n === 'number' ? n : undefined));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Roof plane</p>
        <h2 className="truncate text-base font-semibold text-zinc-900">
          {feature.metadata.name || 'Untitled roof'}
        </h2>
        <p className="text-xs text-zinc-500">
          Faces {compass(azimuth)} · {feature.metadata.surface?.replace('_', ' ') || 'surface n/a'}
        </p>
      </div>

      {/* Orientation */}
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-200 px-4 py-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Azimuth °
          </span>
          <input
            type="number"
            min={0}
            max={359}
            value={Number.isFinite(azimuth) ? azimuth : ''}
            onChange={(e) => setMeta({ azimuth: e.target.value })}
            aria-label="Azimuth"
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Tilt °
          </span>
          <input
            type="number"
            min={0}
            max={60}
            value={Number.isFinite(tilt) ? tilt : ''}
            onChange={(e) => setMeta({ tilt: e.target.value })}
            aria-label="Tilt"
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {/* Production */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-200 bg-zinc-100 text-center">
        <Metric label="Panels" value={String(prod.panelCount)} />
        <Metric label="DC size" value={`${prod.dcKw.toFixed(2)} kW`} />
        <Metric label="Orientation derate" value={`${Math.round(prod.derate * 100)}%`} />
        <Metric label="Annual est." value={`${Math.round(prod.annualKwh).toLocaleString()} kWh`} />
      </div>

      {/* Actions */}
      <div className="space-y-2 p-3">
        <button
          onClick={() =>
            run(
              () => controller.autoLayout(feature.id),
              (n) => `Placed ${n ?? 0} panels on ${feature.metadata.name}.`,
            )
          }
          disabled={busy}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          Auto-layout this roof
        </button>
        <div className="flex gap-2">
          <button
            onClick={() =>
              run(
                () => {
                  const dto = controller.generatePlaceable(feature.id);
                  return dto ? 1 : 0;
                },
                (n) => (n ? 'Setback area generated.' : 'Setback leaves no placeable area.'),
              )
            }
            disabled={busy}
            className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          >
            Show setback area
          </button>
          <button
            onClick={() => controller.clearArray(feature.id)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Clear
          </button>
        </div>
        {status && <p className="text-[11px] text-zinc-500">{status}</p>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

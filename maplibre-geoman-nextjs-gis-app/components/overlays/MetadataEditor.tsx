'use client';

import { useState } from 'react';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';
import type { Feature } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as api from '@/lib/api-client';
import { findFeature } from '@/lib/geoman/featureSync';
import { formatArea, formatLength, measureFeature } from '@/lib/measure';
import type { FeatureDTO, LayerDTO } from '@/lib/types';

type Row = { key: string; value: string };

interface MetadataEditorProps {
  gm: Geoman;
}

export default function MetadataEditor({ gm }: MetadataEditorProps) {
  const feature = useEditorStore((s) =>
    s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined,
  );
  const layer = useEditorStore((s) =>
    feature ? s.layers.find((l) => l.id === feature.layerId) : undefined,
  );

  if (!feature) return null;

  // Keyed by feature id so editing state resets cleanly per selection.
  return <Editor key={feature.id} gm={gm} feature={feature} layer={layer} />;
}

function Editor({
  gm,
  feature,
  layer,
}: {
  gm: Geoman;
  feature: FeatureDTO;
  layer: LayerDTO | undefined;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(feature.metadata).map(([key, value]) => ({ key, value })),
  );
  const [saving, setSaving] = useState(false);
  const m = measureFeature(feature.geojson as Feature);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { key: '', value: '' }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    const metadata: Record<string, string> = {};
    for (const { key, value } of rows) {
      const k = key.trim();
      if (k) metadata[k] = value;
    }
    setSaving(true);
    try {
      // 1) reflect on the live Geoman feature (keeps export round-trips correct)
      const fd = findFeature(gm, feature.id);
      await fd?.updateProperties({ metadata });
      // 2) update local store
      useEditorStore.getState().upsertFeature({ ...feature, metadata });
      // 3) persist
      await api.updateFeature(feature.id, { metadata });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pointer-events-auto flex w-80 flex-col rounded-lg bg-white/95 shadow ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Feature metadata</h2>
          <p className="text-[11px] text-zinc-400">
            #{feature.id} · {feature.shape ?? 'shape'}
            {layer ? ` · ${layer.name}` : ''}
          </p>
        </div>
        <button
          onClick={() => useEditorStore.getState().setSelectedFeature(null)}
          aria-label="Close metadata editor"
          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100"
        >
          ✕
        </button>
      </div>

      {m && (m.area != null || m.length != null) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[11px] text-zinc-600">
          {m.area != null && (
            <span>
              <span className="text-zinc-400">Area</span> {formatArea(m.area)}
            </span>
          )}
          {m.length != null && (
            <span>
              <span className="text-zinc-400">{m.area != null ? 'Perimeter' : 'Length'}</span>{' '}
              {formatLength(m.length)}
            </span>
          )}
          <span>
            <span className="text-zinc-400">Vertices</span> {m.vertices}
          </span>
        </div>
      )}

      <div className="max-h-[40vh] space-y-2 overflow-y-auto p-3">
        {rows.length === 0 && (
          <p className="py-2 text-center text-xs text-zinc-400">
            No metadata. Add a key/value pair below.
          </p>
        )}
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={row.key}
              onChange={(e) => setRow(i, { key: e.target.value })}
              placeholder="key"
              aria-label={`metadata key ${i}`}
              className="w-1/2 min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <input
              value={row.value}
              onChange={(e) => setRow(i, { value: e.target.value })}
              placeholder="value"
              aria-label={`metadata value ${i}`}
              className="w-1/2 min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <button
              onClick={() => removeRow(i)}
              aria-label={`remove row ${i}`}
              className="shrink-0 text-zinc-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="w-full rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
        >
          + Add field
        </button>
      </div>

      <div className="border-t border-zinc-200 p-2">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-md bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save metadata'}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import type { Feature } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';
import { downloadGeoJson, parseGeoJson } from '@/lib/io';

export default function AttributeTable({
  controller,
  onClose,
}: {
  controller: EditorController;
  onClose: () => void;
}) {
  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const selectedId = useEditorStore((s) => s.selectedFeatureId);

  const [query, setQuery] = useState('');
  const [newField, setNewField] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const layer = layers.find((l) => l.id === activeLayerId);
  const rows = useMemo(
    () => Object.values(features).filter((f) => f.layerId === activeLayerId),
    [features, activeLayerId],
  );

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const f of rows) for (const k of Object.keys(f.metadata)) keys.add(k);
    return [...keys].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        Object.values(f.metadata).some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const commit = (id: string, key: string, value: string) => {
    const f = features[id];
    if (!f || (f.metadata[key] ?? '') === value) return;
    controller.updateFeatureMetadata(id, { ...f.metadata, [key]: value });
  };

  const addField = () => {
    const k = newField.trim();
    if (!k || columns.includes(k) || rows.length === 0) return;
    const f = rows[0];
    controller.updateFeatureMetadata(f.id, { ...f.metadata, [k]: '' });
    setNewField('');
  };

  const exportLayer = () => {
    if (!layer) return;
    downloadGeoJson(layer.name, {
      type: 'FeatureCollection',
      features: rows.map((f) => ({
        type: 'Feature',
        id: f.id,
        geometry: (f.geojson as Feature).geometry,
        properties: { ...f.metadata },
      })),
    });
  };

  const onImport = async (file: File) => {
    if (!activeLayerId) return;
    try {
      const fc = parseGeoJson(await file.text());
      await controller.importGeoJson(activeLayerId, fc);
    } catch {
      // ignore parse errors for the demo
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="pointer-events-auto flex h-[300px] w-full flex-col rounded-t-xl bg-white/97 shadow-2xl ring-1 ring-black/5 backdrop-blur">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          {layer && (
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
          )}
          {layer?.name ?? 'No layer'} — attributes
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500">
            {filtered.length}/{rows.length}
          </span>
        </h2>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search attributes…"
          className="ml-2 w-56 rounded-md border border-zinc-300 px-2.5 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Import GeoJSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <button
            onClick={exportLayer}
            disabled={rows.length === 0}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            Export GeoJSON
          </button>
          <button
            onClick={onClose}
            aria-label="Close attribute table"
            className="ml-1 rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="border-b border-zinc-200 px-3 py-1.5 font-medium">id</th>
              <th className="border-b border-zinc-200 px-3 py-1.5 font-medium">shape</th>
              {columns.map((c) => (
                <th key={c} className="border-b border-zinc-200 px-3 py-1.5 font-medium">
                  {c}
                </th>
              ))}
              <th className="border-b border-zinc-200 px-2 py-1.5">
                <span className="flex items-center gap-1">
                  <input
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addField()}
                    placeholder="+ field"
                    className="w-20 rounded border border-zinc-300 px-1.5 py-0.5 text-xs"
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 3} className="px-3 py-6 text-center text-xs text-zinc-400">
                  No features in this layer yet. Draw on the map or import GeoJSON.
                </td>
              </tr>
            )}
            {filtered.map((f) => (
              <tr
                key={f.id}
                onClick={() => {
                  useEditorStore.getState().setSelectedFeature(f.id);
                  controller.zoomToFeature(f.id);
                }}
                className={`cursor-pointer border-b border-zinc-100 ${
                  selectedId === f.id ? 'bg-blue-50' : 'hover:bg-zinc-50'
                }`}
              >
                <td className="px-3 py-1 font-mono text-xs text-zinc-400" title={f.id}>
                  {f.id.slice(0, 8)}
                </td>
                <td className="px-3 py-1 text-zinc-600">{f.shape ?? '—'}</td>
                {columns.map((c) => (
                  <td key={c} className="px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      defaultValue={f.metadata[c] ?? ''}
                      onBlur={(e) => commit(f.id, c, e.target.value)}
                      className="w-full rounded px-2 py-0.5 text-sm outline-none hover:bg-zinc-100 focus:bg-white focus:ring-1 focus:ring-blue-300"
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

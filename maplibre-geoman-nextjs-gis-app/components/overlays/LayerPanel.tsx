'use client';

import { useMemo, useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';
import type { LayerDTO } from '@/lib/types';

// fill / border palette pairs
const PALETTE: Array<[string, string]> = [
  ['#3b82f6', '#1d4ed8'],
  ['#ef4444', '#b91c1c'],
  ['#10b981', '#047857'],
  ['#f59e0b', '#b45309'],
  ['#8b5cf6', '#6d28d9'],
  ['#ec4899', '#be185d'],
];

function Swatch({
  kind,
  color,
  onChange,
  label,
}: {
  kind: 'fill' | 'border';
  color: string;
  onChange: (c: string) => void;
  label: string;
}) {
  return (
    <label
      className="relative h-5 w-5 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-black/10"
      title={label}
      style={
        kind === 'fill'
          ? { backgroundColor: color }
          : { backgroundColor: '#fff', boxShadow: `inset 0 0 0 3px ${color}` }
      }
    >
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}

export default function LayerPanel({ controller }: { controller: EditorController }) {
  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of Object.values(features)) c[f.layerId] = (c[f.layerId] ?? 0) + 1;
    return c;
  }, [features]);

  const addLayer = async () => {
    const trimmed = name.trim() || `Layer ${layers.length + 1}`;
    const [color, borderColor] = PALETTE[layers.length % PALETTE.length];
    setBusy(true);
    try {
      await controller.createLayer(trimmed, color, borderColor);
      setName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto flex w-80 flex-col rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-800">Layers</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
          {layers.length}
        </span>
      </div>

      <div className="max-h-[44vh] overflow-y-auto py-1">
        {layers.length === 0 && (
          <p className="px-3.5 py-5 text-center text-xs text-zinc-400">
            No layers yet. Create one to start drawing.
          </p>
        )}
        {layers.map((layer: LayerDTO) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className={`group flex items-center gap-2 px-3.5 py-2 ${
                isActive ? 'bg-blue-50/70' : 'hover:bg-zinc-50'
              }`}
            >
              <button
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => controller.toggleVisibility(layer)}
                className={`text-zinc-400 transition-colors hover:text-zinc-700 ${
                  layer.visible ? '' : 'opacity-40'
                }`}
              >
                {layer.visible ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A11 11 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.42" />
                    <path d="M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.4-1.4" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-1">
                <Swatch
                  kind="fill"
                  color={layer.color}
                  label={`${layer.name} fill`}
                  onChange={(c) => controller.applyColors(layer, c, layer.borderColor)}
                />
                <Swatch
                  kind="border"
                  color={layer.borderColor}
                  label={`${layer.name} border`}
                  onChange={(c) => controller.applyColors(layer, layer.color, c)}
                />
              </div>

              <button
                onClick={() => controller.setActiveLayer(layer.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={`block truncate text-sm ${
                    isActive ? 'font-semibold text-blue-700' : 'text-zinc-700'
                  }`}
                >
                  {layer.name}
                </span>
                {isActive && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-blue-500">
                    editing
                  </span>
                )}
              </button>

              <span className="text-xs tabular-nums text-zinc-400">
                {counts[layer.id] ?? 0}
              </span>
              <button
                title="Delete layer"
                aria-label={`Delete ${layer.name}`}
                onClick={() => controller.deleteLayer(layer)}
                className="text-zinc-300 transition-colors hover:text-red-600"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-t border-zinc-200 p-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLayer()}
          placeholder="New layer name"
          aria-label="New layer name"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={addLayer}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

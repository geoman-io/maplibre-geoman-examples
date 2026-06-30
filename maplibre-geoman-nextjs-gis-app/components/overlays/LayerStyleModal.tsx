'use client';

import { useMemo, useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';
import type { LabelConfig, LayerDTO, Symbology } from '@/lib/types';
import { categorize, graduate, RAMPS } from '@/lib/symbology';

type Tab = 'symbology' | 'labels';

export default function LayerStyleModal({
  layer,
  controller,
  onClose,
}: {
  layer: LayerDTO;
  controller: EditorController;
  onClose: () => void;
}) {
  const features = useEditorStore((s) => s.features);
  const layerFeatures = useMemo(
    () => Object.values(features).filter((f) => f.layerId === layer.id),
    [features, layer.id],
  );
  const fields = layer.schema?.fields ?? [];
  const numericFields = fields.filter((f) => f.type === 'number' || f.type === 'integer');

  const [tab, setTab] = useState<Tab>('symbology');
  const [sym, setSym] = useState<Symbology>(layer.style?.symbology ?? { mode: 'single' });
  const [classes, setClasses] = useState(5);
  const [ramp, setRamp] = useState('Blue');
  const [labels, setLabels] = useState<LabelConfig | null>(layer.style?.labels ?? null);
  const [saving, setSaving] = useState(false);

  const setMode = (mode: Symbology['mode']) => {
    if (mode === 'single') return setSym({ mode: 'single' });
    if (mode === 'categorized') {
      const field = sym.mode === 'categorized' ? sym.field : fields[0]?.name;
      if (field) setSym(categorize(layerFeatures, field));
    } else {
      const field = sym.mode === 'graduated' ? sym.field : numericFields[0]?.name;
      if (field) setSym(graduate(layerFeatures, field, classes, RAMPS[ramp]));
    }
  };

  const apply = async () => {
    setSaving(true);
    try {
      await controller.setLayerStyle(layer, {
        ...layer.style,
        symbology: sym,
        labels: labels?.field ? labels : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const field = sym.mode === 'single' ? '' : sym.field;
  const seg = (active: boolean) =>
    `flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
    }`;
  const input = 'rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[30rem] max-w-full flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">
            Layer properties — <span className="text-zinc-500">{layer.name}</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100">
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-zinc-200 px-4 pt-2">
          {(['symbology', 'labels'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium capitalize ${
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {fields.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Define an attribute schema for this layer to style or label by a field.
            </p>
          )}

          {tab === 'symbology' && (
            <>
              <div className="flex gap-1">
                <button className={seg(sym.mode === 'single')} onClick={() => setMode('single')}>
                  Single
                </button>
                <button
                  className={seg(sym.mode === 'categorized')}
                  onClick={() => setMode('categorized')}
                  disabled={fields.length === 0}
                >
                  Categorized
                </button>
                <button
                  className={seg(sym.mode === 'graduated')}
                  onClick={() => setMode('graduated')}
                  disabled={numericFields.length === 0}
                >
                  Graduated
                </button>
              </div>

              {sym.mode !== 'single' && (
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  Field
                  <select
                    className={`${input} flex-1`}
                    value={field}
                    onChange={(e) => {
                      const f = e.target.value;
                      setSym(
                        sym.mode === 'graduated'
                          ? graduate(layerFeatures, f, classes, RAMPS[ramp])
                          : categorize(layerFeatures, f),
                      );
                    }}
                  >
                    {(sym.mode === 'graduated' ? numericFields : fields).map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {sym.mode === 'graduated' && (
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <label className="flex items-center gap-1">
                    Classes
                    <input
                      type="number"
                      min={2}
                      max={7}
                      value={classes}
                      onChange={(e) => {
                        const c = Math.max(2, Math.min(7, Number(e.target.value)));
                        setClasses(c);
                        setSym(graduate(layerFeatures, sym.field, c, RAMPS[ramp]));
                      }}
                      className={`${input} w-16`}
                    />
                  </label>
                  <label className="flex flex-1 items-center gap-1">
                    Ramp
                    <select
                      className={`${input} flex-1`}
                      value={ramp}
                      onChange={(e) => {
                        setRamp(e.target.value);
                        setSym(graduate(layerFeatures, sym.field, classes, RAMPS[e.target.value]));
                      }}
                    >
                      {Object.keys(RAMPS).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {sym.mode === 'categorized' && (
                <ul className="space-y-1">
                  {sym.categories.map((c, i) => (
                    <li key={c.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="color"
                        value={c.color}
                        onChange={(e) => {
                          const categories = sym.categories.slice();
                          categories[i] = { ...c, color: e.target.value };
                          setSym({ ...sym, categories });
                        }}
                        className="h-5 w-5 cursor-pointer rounded"
                      />
                      <span className="truncate text-zinc-700">{c.value}</span>
                    </li>
                  ))}
                  {sym.categories.length === 0 && (
                    <li className="text-xs text-zinc-400">No values found in this field.</li>
                  )}
                </ul>
              )}

              {sym.mode === 'graduated' && (
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    <input
                      type="color"
                      value={sym.base}
                      onChange={(e) => setSym({ ...sym, base: e.target.value })}
                      className="h-5 w-5 cursor-pointer rounded"
                    />
                    <span className="text-zinc-700">&lt; {sym.stops[0]?.value ?? '—'}</span>
                  </li>
                  {sym.stops.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type="color"
                        value={s.color}
                        onChange={(e) => {
                          const stops = sym.stops.slice();
                          stops[i] = { ...s, color: e.target.value };
                          setSym({ ...sym, stops });
                        }}
                        className="h-5 w-5 cursor-pointer rounded"
                      />
                      <span className="text-zinc-700">≥ {s.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'labels' && (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={!!labels}
                  disabled={fields.length === 0}
                  onChange={(e) => setLabels(e.target.checked ? { field: fields[0]?.name ?? '' } : null)}
                />
                Show labels
              </label>
              {labels && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-600">
                    Field
                    <select
                      className={`${input} flex-1`}
                      value={labels.field}
                      onChange={(e) => setLabels({ ...labels, field: e.target.value })}
                    >
                      {fields.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <label className="flex items-center gap-1">
                      Size
                      <input
                        type="number"
                        min={8}
                        max={32}
                        value={labels.size ?? 12}
                        onChange={(e) => setLabels({ ...labels, size: Number(e.target.value) })}
                        className={`${input} w-16`}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Text
                      <input
                        type="color"
                        value={labels.color ?? '#1f2937'}
                        onChange={(e) => setLabels({ ...labels, color: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Halo
                      <input
                        type="color"
                        value={labels.haloColor ?? '#ffffff'}
                        onChange={(e) => setLabels({ ...labels, haloColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded"
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-zinc-200 p-3">
          <button
            onClick={apply}
            disabled={saving}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

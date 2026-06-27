'use client';

import { useState } from 'react';
import type { Feature } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';
import { formatArea, formatLength, measureFeature } from '@/lib/measure';
import type { FeatureDTO, LayerDTO, SchemaField } from '@/lib/types';

interface MetadataEditorProps {
  controller: EditorController;
}

export default function MetadataEditor({ controller }: MetadataEditorProps) {
  const feature = useEditorStore((s) =>
    s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined,
  );
  const layer = useEditorStore((s) =>
    feature ? s.layers.find((l) => l.id === feature.layerId) : undefined,
  );

  if (!feature) return null;

  // Keyed by feature id so editing state resets cleanly per selection.
  return <Editor key={feature.id} controller={controller} feature={feature} layer={layer} />;
}

function Editor({
  controller,
  feature,
  layer,
}: {
  controller: EditorController;
  feature: FeatureDTO;
  layer: LayerDTO | undefined;
}) {
  const schema = layer?.schema ?? null;
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...feature.metadata }));
  const [extra, setExtra] = useState<Array<{ key: string; value: string }>>(() =>
    schema
      ? []
      : Object.entries(feature.metadata).map(([key, value]) => ({ key, value })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const m = measureFeature(feature.geojson as Feature);
  const setValue = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const buildMetadata = (): Record<string, string> => {
    if (schema) {
      const out: Record<string, string> = {};
      for (const f of schema.fields) {
        const v = values[f.name];
        if (v != null && v !== '') out[f.name] = v;
      }
      return out;
    }
    const out: Record<string, string> = {};
    for (const { key, value } of extra) {
      const k = key.trim();
      if (k) out[k] = value;
    }
    return out;
  };

  const save = async () => {
    const metadata = buildMetadata();
    if (schema && layer) {
      const result = controller.validateMetadata(layer.id, metadata);
      if (!result.valid) {
        setErrors(Object.fromEntries(result.errors.map((e) => [e.field, e.message])));
        return;
      }
    }
    setErrors({});
    setSaving(true);
    try {
      await controller.updateFeatureMetadata(feature.id, metadata);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pointer-events-auto flex w-80 flex-col rounded-lg bg-white/95 shadow ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Feature attributes</h2>
          <p className="text-[11px] text-zinc-400">
            #{feature.id} · {feature.shape ?? 'shape'}
            {layer ? ` · ${layer.name}` : ''}
          </p>
        </div>
        <button
          onClick={() => useEditorStore.getState().setSelectedFeature(null)}
          aria-label="Close attribute editor"
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

      <div className="max-h-[40vh] space-y-2.5 overflow-y-auto p-3">
        {schema ? (
          schema.fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              error={errors[field.name]}
              onChange={(v) => setValue(field.name, v)}
            />
          ))
        ) : (
          <>
            {extra.length === 0 && (
              <p className="py-2 text-center text-xs text-zinc-400">
                No attributes. Add a key/value pair, or define a schema for this layer.
              </p>
            )}
            {extra.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={row.key}
                  onChange={(e) => setExtra((rs) => rs.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))}
                  placeholder="key"
                  aria-label={`metadata key ${i}`}
                  className="w-1/2 min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
                <input
                  value={row.value}
                  onChange={(e) => setExtra((rs) => rs.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))}
                  placeholder="value"
                  aria-label={`metadata value ${i}`}
                  className="w-1/2 min-w-0 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setExtra((rs) => rs.filter((_, idx) => idx !== i))}
                  aria-label={`remove row ${i}`}
                  className="shrink-0 text-zinc-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setExtra((rs) => [...rs, { key: '', value: '' }])}
              className="w-full rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
            >
              + Add field
            </button>
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 p-2">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-md bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save attributes'}
        </button>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  error,
  onChange,
}: {
  field: SchemaField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const cls = `w-full rounded-md border px-2 py-1 text-sm ${error ? 'border-red-400' : 'border-zinc-300'}`;
  return (
    <div>
      <label className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-zinc-600">
        {field.name}
        {field.required && <span className="text-red-500">*</span>}
        <span className="text-zinc-300">· {field.type}</span>
      </label>
      {field.type === 'enum' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.name} className={cls}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label ?? o.value}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.name} className={cls}>
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.name}
          className={cls}
        />
      )}
      {error && <p className="mt-0.5 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

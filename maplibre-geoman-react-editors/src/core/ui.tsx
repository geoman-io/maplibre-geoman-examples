import { useState, type ReactNode } from 'react';
import { useEditorStore } from './store';
import type { EditorController } from './controller';
import type { SchemaField } from './types';

/** A white panel card. */
export function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Layer list with visibility toggles + feature counts (shared across verticals). */
export function LayerList({ controller }: { controller: EditorController }) {
  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const count = (id: string) => Object.values(features).filter((f) => f.layerId === id).length;
  return (
    <div className="py-1">
      {layers.map((l) => (
        <div key={l.id} className="flex items-center gap-2.5 px-3.5 py-1.5">
          <button
            onClick={() => controller.toggleVisibility(l)}
            title={l.visible ? 'Hide' : 'Show'}
            className={`text-zinc-400 transition-colors hover:text-zinc-700 ${l.visible ? '' : 'opacity-40'}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {l.visible ? (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a13 13 0 0 1-1.7 2.7M6.6 6.6A13 13 0 0 0 2 12s3 8 10 8a9 9 0 0 0 4.4-1.1" />
                  <path d="m2 2 20 20" />
                </>
              )}
            </svg>
          </button>
          <span className="h-4 w-4 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: l.color }} />
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">{l.name}</span>
          <span className="text-xs tabular-nums text-zinc-400">{count(l.id)}</span>
        </div>
      ))}
    </div>
  );
}

/** A 2-column metric grid. */
export function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-zinc-100 text-center">
      {items.map((m) => (
        <div key={m.label} className="bg-white px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{m.label}</p>
          <p className="text-sm font-semibold tabular-nums text-zinc-900">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ResetButton({ controller, label = 'Reset sample project' }: { controller: EditorController; label?: string }) {
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (!window.confirm('Reset back to the sample project? This clears your current edits.')) return;
    setBusy(true);
    try {
      await controller.resetToSample();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={reset}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      {busy ? 'Resetting…' : label}
    </button>
  );
}

/** Empty-state for the inspector when nothing is selected. */
export function InspectorEmpty({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-300 ring-1 ring-zinc-200">
        {icon}
      </span>
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{hint}</p>
    </div>
  );
}

/** Schema-driven attribute editor for the selected feature (shared). */
export function AttributeForm({ controller, featureId }: { controller: EditorController; featureId: string }) {
  const feature = useEditorStore((s) => s.features[featureId]);
  const layer = useEditorStore((s) => s.layers.find((l) => l.id === feature?.layerId));
  return feature && layer?.schema ? (
    <Form key={featureId} controller={controller} id={featureId} fields={layer.schema.fields} initial={feature.metadata} />
  ) : null;
}

function Form({
  controller,
  id,
  fields,
  initial,
}: {
  controller: EditorController;
  id: string;
  fields: SchemaField[];
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const out: Record<string, string> = {};
      for (const f of fields) if (values[f.name] != null && values[f.name] !== '') out[f.name] = values[f.name];
      await controller.updateFeatureMetadata(id, out);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-2.5 p-3">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
            {f.label ?? f.name}
            {f.required && <span className="text-red-500">*</span>}
            <span className="text-zinc-300">· {f.type}</span>
          </span>
          {f.type === 'enum' ? (
            <select
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              aria-label={f.name}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">—</option>
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label ?? o.value}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type === 'number' || f.type === 'integer' ? 'number' : 'text'}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              aria-label={f.name}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          )}
        </label>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-zinc-900 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save attributes'}
      </button>
    </div>
  );
}

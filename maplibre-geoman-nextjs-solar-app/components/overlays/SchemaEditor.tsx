'use client';

import { useState } from 'react';
import type { EditorController } from '@/lib/geoman/editorController';
import type { LayerDTO, SchemaField } from '@/lib/types';

const TYPES: SchemaField['type'][] = ['string', 'number', 'integer', 'boolean', 'enum'];

/** Edit a layer's attribute schema (typed fields) — the typed attribute editor
 *  and validation are driven by this. */
export default function SchemaEditor({
  layer,
  controller,
  onClose,
}: {
  layer: LayerDTO;
  controller: EditorController;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<SchemaField[]>(() => layer.schema?.fields ?? []);
  const [saving, setSaving] = useState(false);

  const patch = (i: number, p: Partial<SchemaField>) =>
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  const add = () => setFields((fs) => [...fs, { name: '', type: 'string' }]);
  const remove = (i: number) => setFields((fs) => fs.filter((_, idx) => idx !== i));

  const save = async () => {
    const clean = fields
      .map((f) => ({ ...f, name: f.name.trim() }))
      .filter((f) => f.name);
    setSaving(true);
    try {
      await controller.setLayerSchema(layer, clean.length ? { fields: clean } : null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[34rem] max-w-full flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Attribute schema</h2>
            <p className="text-[11px] text-zinc-400">{layer.name} · typed fields + validation</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {fields.length === 0 && (
            <p className="py-6 text-center text-xs text-zinc-400">
              No fields. Add typed fields to validate this layer&apos;s features.
            </p>
          )}
          {fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-2.5">
              <div className="flex items-center gap-2">
                <input
                  value={f.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                  placeholder="field name"
                  aria-label={`field ${i} name`}
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
                <select
                  value={f.type}
                  onChange={(e) => patch(i, { type: e.target.value as SchemaField['type'] })}
                  aria-label={`field ${i} type`}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => patch(i, { required: e.target.checked })}
                  />
                  required
                </label>
                <button onClick={() => remove(i)} aria-label={`remove field ${i}`} className="text-zinc-400 hover:text-red-600">
                  ✕
                </button>
              </div>

              {f.type === 'enum' && (
                <input
                  value={(f.options ?? []).map((o) => o.value).join(', ')}
                  onChange={(e) =>
                    patch(i, {
                      options: e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                        .map((value) => ({ value })),
                    })
                  }
                  placeholder="allowed values, comma separated"
                  aria-label={`field ${i} options`}
                  className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
              )}
              {(f.type === 'number' || f.type === 'integer') && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    value={f.min ?? ''}
                    onChange={(e) => patch(i, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="min"
                    aria-label={`field ${i} min`}
                    className="w-1/2 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    value={f.max ?? ''}
                    onChange={(e) => patch(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="max"
                    aria-label={`field ${i} max`}
                    className="w-1/2 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
          <button
            onClick={add}
            className="w-full rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
          >
            + Add field
          </button>
        </div>

        <div className="border-t border-zinc-200 p-3">
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save schema'}
          </button>
        </div>
      </div>
    </div>
  );
}

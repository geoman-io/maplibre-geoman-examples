'use client';

import { useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useArrayConfig } from '@/hooks/useArrayConfig';
import type { EditorController } from '@/lib/geoman/editorController';
import { MODULES_LAYER, ROOF_LAYER } from '@/lib/solar/domain';
import { MODULES } from '@/lib/solar/modules';
import { systemSummary } from '@/lib/solar/production';

/**
 * Array designer + system summary (sidebar). Pick the module and orientation,
 * set the fire setback and row/column gaps, then auto-lay out every roof — the
 * summary updates live (panel count, DC kW, annual production, roof coverage).
 */
export default function ArrayPanel({ controller }: { controller: EditorController }) {
  const cfg = useArrayConfig();
  const setCfg = useArrayConfig((s) => s.set);
  const layers = useEditorStore((s) => s.layers);
  const features = useEditorStore((s) => s.features);
  const [busy, setBusy] = useState(false);

  const modulesLayer = layers.find((l) => l.name === MODULES_LAYER);
  const roofLayer = layers.find((l) => l.name === ROOF_LAYER);
  const panels = Object.values(features).filter((f) => f.layerId === modulesLayer?.id);
  const roofs = Object.values(features).filter((f) => f.layerId === roofLayer?.id);
  const summary = systemSummary(panels, roofs);

  const layoutAll = async () => {
    setBusy(true);
    try {
      await controller.autoLayoutAll();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="border-b border-zinc-200 px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-800">Array designer</h2>
      </div>

      <div className="space-y-3 p-3">
        <Field label="Module">
          <select
            value={cfg.moduleId}
            onChange={(e) => setCfg({ moduleId: e.target.value })}
            aria-label="PV module"
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Orientation
          </span>
          <div className="flex gap-1">
            {(['portrait', 'landscape'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setCfg({ orientation: o })}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  cfg.orientation === o ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumField label="Setback in" value={cfg.setbackIn} onChange={(v) => setCfg({ setbackIn: v })} />
          <NumField label="Row gap in" value={cfg.rowGapIn} onChange={(v) => setCfg({ rowGapIn: v })} />
          <NumField label="Col gap in" value={cfg.colGapIn} onChange={(v) => setCfg({ colGapIn: v })} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={layoutAll}
            disabled={busy}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? 'Laying out…' : 'Auto-layout all roofs'}
          </button>
          <button
            onClick={() => controller.clearArray()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* System summary */}
      <div className="grid grid-cols-2 gap-px border-t border-zinc-200 bg-zinc-100 text-center">
        <Stat label="Panels" value={String(summary.panelCount)} />
        <Stat label="System size" value={`${summary.dcKw.toFixed(2)} kW`} />
        <Stat label="Annual est." value={fmtKwh(summary.annualKwh)} />
        <Stat label="Roof coverage" value={`${summary.coveragePct.toFixed(0)}%`} />
      </div>
    </div>
  );
}

function fmtKwh(kwh: number): string {
  return kwh >= 1000 ? `${(kwh / 1000).toFixed(1)} MWh` : `${Math.round(kwh)} kWh`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

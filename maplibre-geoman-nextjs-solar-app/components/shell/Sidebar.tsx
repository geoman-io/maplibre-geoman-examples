'use client';

import { useState } from 'react';
import LayerPanel from '@/components/overlays/LayerPanel';
import ArrayPanel from '@/components/overlays/ArrayPanel';
import type { EditorController } from '@/lib/geoman/editorController';
import { downloadGeoJson } from '@/lib/io';

/** Left workspace rail: array designer, project layers, and project actions.
 *  Part of the SaaS shell. */
export default function Sidebar({
  controller,
  onSettings,
}: {
  controller: EditorController;
  onSettings: () => void;
}) {
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    if (!window.confirm('Reset back to the sample rooftop? This clears your current design.')) return;
    setResetting(true);
    try {
      await controller.resetToSample();
    } finally {
      setResetting(false);
    }
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <ArrayPanel controller={controller} />
        <LayerPanel controller={controller} onSettings={onSettings} />
      </div>

      <div className="flex gap-2 border-t border-zinc-200 p-3">
        <button
          onClick={() => downloadGeoJson('sunplan-design', controller.exportGeoJson())}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
        <button
          onClick={reset}
          disabled={resetting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {resetting ? 'Resetting…' : 'Reset'}
        </button>
      </div>
    </aside>
  );
}

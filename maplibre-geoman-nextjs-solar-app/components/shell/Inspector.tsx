'use client';

import { useEditorStore } from '@/hooks/useEditorStore';
import RoofPanel from '@/components/overlays/RoofPanel';
import MetadataEditor from '@/components/overlays/MetadataEditor';
import type { EditorController } from '@/lib/geoman/editorController';

/** Right inspector panel — the roof-plane orientation / production tools and the
 *  attribute editor for the current selection. Part of the SaaS shell. */
export default function Inspector({ controller }: { controller: EditorController }) {
  const selectedId = useEditorStore((s) => s.selectedFeatureId);

  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 lg:flex">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {!selectedId && <EmptyState />}
        <RoofPanel controller={controller} />
        <MetadataEditor controller={controller} />
      </div>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-amber-400 ring-1 ring-zinc-200">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <p className="text-sm font-medium text-zinc-600">No roof plane selected</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Click a roof plane on the map to set its orientation, generate the
        setback area, and auto-lay out its panels.
      </p>
    </div>
  );
}

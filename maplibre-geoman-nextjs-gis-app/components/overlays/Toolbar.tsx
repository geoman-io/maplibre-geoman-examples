'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditorController } from '@/lib/geoman/editorController';

const S = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const I: Record<string, ReactNode> = {
  marker: S(<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.3" /></>),
  line: S(<><path d="M5 19 19 5" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></>),
  polygon: S(<path d="M12 3 21 9.5 17.5 20h-11L3 9.5 12 3Z" />),
  rectangle: S(<rect x="4" y="6" width="16" height="12" rx="1" />),
  circle: S(<circle cx="12" cy="12" r="8" />),
  ellipse: S(<ellipse cx="12" cy="12" rx="9" ry="6" />),
  freehand: S(<path d="M3 17c3-1 3-9 6-9s2 7 5 7 4-6 7-6" />),
  text: S(<><path d="M5 6h14M5 6v-1M19 6v-1M12 6v13M9 19h6" /></>),
  change: S(<><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="6" cy="18" r="2" /><path d="M8 6h8M18 8v8M16 18H8M6 16V8" /></>),
  drag: S(<><path d="M12 2v20M2 12h20" /><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" /></>),
  rotate: S(<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>),
  scale: S(<><rect x="4" y="4" width="11" height="11" rx="1" /><path d="M20 9v11H9M16 16l4 4" /></>),
  split: S(<><path d="M12 3v18" strokeDasharray="2 2" /><path d="M7 8 5 6 3 8M17 8l2-2 2 2" /></>),
  union: S(<><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></>),
  difference: S(<><rect x="3" y="6" width="12" height="12" rx="1" /><path d="M9 6h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9" strokeDasharray="2 2" /></>),
  add_part: S(<><rect x="3" y="3" width="8" height="8" rx="1" /><path d="M17 13v8M13 17h8" /></>),
  add_hole: S(<><path d="M4 4h16v16H4Z" /><circle cx="12" cy="12" r="3.5" strokeDasharray="2 2" /></>),
  remove_ring: S(<><path d="M4 4h16v16H4Z" /><path d="m9 9 6 6M15 9l-6 6" /></>),
  merge_parts: S(<><rect x="3" y="8" width="8" height="8" rx="1" /><rect x="13" y="8" width="8" height="8" rx="1" /><path d="M11 12h2" /></>),
  simplify: S(<path d="M3 17c4 0 4-8 8-8s2 5 5 5 3-4 5-4" />),
  copy: S(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  cut: S(<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></>),
  select: S(<path d="m3 3 7.5 18 2.5-7.5L20.5 11 3 3Z" />),
  lasso: S(<><path d="M4 11c0-3.9 3.6-7 8-7s8 3.1 8 7-3.6 7-8 7c-1 0-2-.2-2.9-.5" /><path d="M6 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 0c0 1.5.5 2.5 1.5 3" /></>),
  delete: S(<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m4 5v6m6-6v6" />),
  measure: S(<><path d="M2 14 14 2l8 8L10 22Z" /><path d="M7 9l2 2M10 6l2 2M13 9l2 2M16 6l2 2" /></>),
  snap: S(<><path d="M5 5h6v6" /><path d="M5 5l8 8" /><circle cx="17" cy="17" r="3" /></>),
  zoom: S(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></>),
  undo: S(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" /></>),
  redo: S(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h4" /></>),
};

type Tool = {
  id: string;
  icon: string;
  /** Short accessible name (aria-label, status bar). */
  title: string;
  /** Longer tooltip describing a non-obvious multi-step interaction. */
  hint?: string;
  run: (gm: Geoman) => Promise<void> | void;
  needsSelection?: boolean;
};

const draw = (id: string, icon: string, title: string): Tool => ({
  id,
  icon,
  title,
  run: (gm) => gm.enableDraw(id as never),
});
const edit = (
  id: string,
  icon: string,
  title: string,
  needsSelection = false,
  hint?: string,
): Tool => ({
  id,
  icon,
  title,
  hint,
  needsSelection,
  run: (gm) => gm.enableMode('edit', id as never),
});

const GROUPS: Array<{ name: string; tools: Tool[] }> = [
  {
    name: 'Digitize',
    tools: [
      draw('marker', 'marker', 'Point'),
      draw('line', 'line', 'Line'),
      draw('polygon', 'polygon', 'Polygon'),
      draw('rectangle', 'rectangle', 'Rectangle'),
      draw('circle', 'circle', 'Circle'),
      draw('ellipse', 'ellipse', 'Ellipse'),
      draw('freehand', 'freehand', 'Freehand'),
      draw('text_marker', 'text', 'Text'),
    ],
  },
  {
    name: 'Edit',
    tools: [
      { id: 'edit', icon: 'change', title: 'Edit vertices', run: (gm) => gm.enableGlobalEditMode() },
      { id: 'drag', icon: 'drag', title: 'Move', run: (gm) => gm.enableGlobalDragMode() },
      edit('rotate', 'rotate', 'Rotate'),
      edit('scale', 'scale', 'Scale'),
    ],
  },
  {
    name: 'Geometry',
    tools: [
      edit('split', 'split', 'Split', false, 'Split — draw a line across a shape'),
      edit('union', 'union', 'Union', false, 'Union — click two overlapping shapes'),
      edit('difference', 'difference', 'Difference', false, 'Difference — click two overlapping shapes'),
      edit('add_part', 'add_part', 'Add part', true),
      edit('add_hole', 'add_hole', 'Add hole', true, 'Add hole — draw a ring inside a polygon'),
      edit('remove_ring', 'remove_ring', 'Remove ring', true, 'Remove ring — click a hole'),
      edit('merge_parts', 'merge_parts', 'Merge parts', true),
      edit('line_simplification', 'simplify', 'Simplify', false, 'Simplify — click two vertices on a line'),
    ],
  },
  {
    name: 'Select',
    tools: [
      edit('select', 'select', 'Select'),
      edit('lasso', 'lasso', 'Lasso select'),
      edit('copy', 'copy', 'Copy'),
      edit('cut', 'cut', 'Cut'),
      edit('delete', 'delete', 'Delete'),
    ],
  },
];

export default function Toolbar({ gm, controller }: { gm: Geoman; controller: EditorController }) {
  const hasSelection = useEditorStore((s) => s.selectedFeatureId !== null);
  // Every edit/draw tool needs a layer to write into — without one a drawn
  // shape would land in no layer and never persist.
  const hasActiveLayer = useEditorStore((s) => s.activeLayerId !== null);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  // Single source of truth — so Esc (which clears it) also un-highlights here.
  const activeTool = useEditorStore((s) => s.activeTool);

  const findTitle = (key: string) =>
    GROUPS.flatMap((g) => g.tools).find((t) => t.id === key)?.title ?? key;

  const select = async (key: string, run: () => Promise<void> | void) => {
    if (!hasActiveLayer) return;
    await gm.disableAllModes();
    if (activeTool?.key === key) {
      useEditorStore.getState().setActiveTool(null);
      return;
    }
    await run();
    // Status bar shows the short name; the full descriptive title stays the tooltip.
    useEditorStore.getState().setActiveTool({ key, title: findTitle(key).split(' — ')[0] });
  };

  // Fluid selection: rest in the Select tool once a layer exists, so clicking a
  // feature selects it immediately without first picking a tool.
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current || !hasActiveLayer) return;
    defaulted.current = true;
    void (async () => {
      await gm.enableMode('edit', 'select' as never);
      useEditorStore.getState().setActiveTool({ key: 'select', title: 'Select' });
    })();
  }, [hasActiveLayer, gm]);

  const tbtn = (key: string, icon: string, title: string, onClick: () => void, opts: { on?: boolean; disabled?: boolean; tooltip?: string } = {}) => (
    <button
      key={key}
      title={opts.tooltip ?? title}
      aria-label={title}
      aria-pressed={opts.on}
      disabled={opts.disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        opts.on ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {I[icon]}
    </button>
  );

  const sep = (key: string) => (
    <div key={key} className="mx-1 h-6 w-px self-center bg-zinc-200" />
  );

  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto rounded-xl bg-white/95 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
      {tbtn('undo', 'undo', 'Undo (⌘Z)', () => void controller.undo(), { disabled: !canUndo })}
      {tbtn('redo', 'redo', 'Redo (⇧⌘Z)', () => void controller.redo(), { disabled: !canRedo })}
      {sep('sep-history')}
      {GROUPS.map((g, gi) => (
        <div key={g.name} className="flex items-center gap-0.5">
          {gi > 0 && sep(`sep-${g.name}`)}
          {g.tools.map((t) =>
            tbtn(
              t.id,
              t.icon,
              hasActiveLayer ? t.title : `${t.title} — add a layer first`,
              () => select(t.id, () => t.run(gm)),
              {
                on: activeTool?.key === t.id,
                disabled: !hasActiveLayer || (t.needsSelection && !hasSelection),
                tooltip: t.hint,
              },
            ),
          )}
        </div>
      ))}
      {sep('sep-helpers')}
      {tbtn('zoom', 'zoom', 'Zoom to features', () => controller.zoomToAll())}
    </div>
  );
}

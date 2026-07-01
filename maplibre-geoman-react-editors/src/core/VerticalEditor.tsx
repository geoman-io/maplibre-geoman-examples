import { useCallback, useEffect, useRef, useState } from 'react';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import GeomanMap from './GeomanMap';
import Toolbar from './Toolbar';
import { EditorController } from './controller';
import { useEditorStore } from './store';
import { buildProject, type VerticalDef } from './vertical';

/** Mounts the map + controller for one vertical and renders its custom SaaS
 *  chrome: vertical-specific sidebar, custom toolbar, and inspector. */
export default function VerticalEditor({ def }: { def: VerticalDef }) {
  const [controller, setController] = useState<EditorController | null>(null);
  const hydrated = useEditorStore((s) => s.hydrated);
  const inited = useRef(false);

  // Fresh state when (re)mounting this vertical.
  useEffect(() => {
    useEditorStore.getState().reset();
  }, []);

  const onReady = useCallback(
    (gm: Geoman, _map: maplibregl.Map) => {
      if (inited.current) return;
      inited.current = true;
      const c = new EditorController(gm, def.id, () => buildProject(def), def.helpers ?? [], def.activeLayerName);
      if (import.meta.env.DEV) {
        const w = window as unknown as { __c?: unknown; __gm?: unknown; __store?: unknown };
        w.__c = c;
        w.__gm = gm;
        w.__store = useEditorStore;
      }
      setController(c);
      void c.hydrate();
    },
    [def],
  );

  const ready = Boolean(controller && hydrated);

  // Re-frame once the side panels have mounted (they shrink the map canvas).
  useEffect(() => {
    if (ready && controller) {
      const t = setTimeout(() => controller.zoomToAll(), 60);
      return () => clearTimeout(t);
    }
  }, [ready, controller]);

  const Sidebar = def.Sidebar;
  const Inspector = def.Inspector;

  return (
    <div className="flex min-h-0 flex-1">
      {ready && controller && (
        <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
          <Sidebar controller={controller} />
        </aside>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {ready && controller && (
          <div className="flex h-12 shrink-0 items-center overflow-x-auto border-b border-zinc-200 bg-white px-2">
            <Toolbar controller={controller} groups={def.toolbar} />
          </div>
        )}
        <GeomanMap center={def.center} zoom={def.zoom} onReady={onReady} />
        {!ready && (
          <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-zinc-500 shadow ring-1 ring-black/5">
            Loading editor…
          </div>
        )}
      </main>

      {ready && controller && (
        <aside className="hidden w-[360px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 lg:flex">
          <Inspector controller={controller} />
        </aside>
      )}
    </div>
  );
}

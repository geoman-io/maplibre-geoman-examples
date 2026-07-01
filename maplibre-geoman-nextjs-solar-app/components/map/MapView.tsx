'use client';

import { useEffect, useRef, useState } from 'react';
import GisMap, { type GisMapHandle } from '@/components/map/GisMap';
import Toolbar from '@/components/overlays/Toolbar';
import StatusBar from '@/components/overlays/StatusBar';
import Locator from '@/components/overlays/Locator';
import BasemapControl from '@/components/overlays/BasemapControl';
import SunDial from '@/components/overlays/SunDial';
import Toast from '@/components/overlays/Toast';
import AttributeTable from '@/components/overlays/AttributeTable';
import SettingsModal from '@/components/overlays/SettingsModal';
import TopNav from '@/components/shell/TopNav';
import Sidebar from '@/components/shell/Sidebar';
import Inspector from '@/components/shell/Inspector';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useConfig } from '@/hooks/useConfig';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { EditorController } from '@/lib/geoman/editorController';

/**
 * The SaaS app shell: top nav, a left workspace rail (array designer + layers),
 * the central map workspace, and a right inspector (roof-plane orientation +
 * production). No auth/backend — the project lives in localStorage and the
 * controller initializes as soon as the map is ready.
 */
export default function MapView() {
  const [handle, setHandle] = useState<GisMapHandle | null>(null);
  const [controller, setController] = useState<EditorController | null>(null);
  useKeyboardShortcuts(handle?.gm ?? null, controller);

  // Apply the persisted behaviour config to the engine + map handlers.
  useEffect(() => {
    if (!controller) return;
    const apply = () => controller.applyConfig(useConfig.getState());
    apply();
    return useConfig.subscribe(apply);
  }, [controller]);

  const [tableOpen, setTableOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hydrated = useEditorStore((s) => s.hydrated);
  const inited = useRef(false);

  useEffect(() => {
    if (!handle || inited.current) return;
    inited.current = true;

    const c = new EditorController(handle.gm);
    setController(c);
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __gm?: unknown; __store?: unknown };
      w.__gm = handle.gm;
      w.__store = useEditorStore; // debug hook (also used by the smoke test)
    }
    void c.hydrate();
  }, [handle]);

  const ready = Boolean(handle && hydrated && controller);

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 text-zinc-900">
      <TopNav />

      <div className="flex min-h-0 flex-1">
        {ready && controller && <Sidebar controller={controller} onSettings={() => setSettingsOpen(true)} />}

        {/* Map workspace: a contextual toolbar strip above the canvas */}
        <main className="flex min-h-0 flex-1 flex-col">
          {ready && controller && handle && (
            <div className="flex h-12 shrink-0 items-center overflow-x-auto border-b border-zinc-200 bg-white px-2">
              <Toolbar gm={handle.gm} controller={controller} />
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <GisMap onReady={setHandle} />
            <Toast />

            {/* Floating map controls */}
            <div className="pointer-events-none absolute inset-0">
              {ready && controller && handle && (
                <>
                  <div className="absolute left-3 top-3">
                    <Locator controller={controller} />
                  </div>

                  <div className="absolute right-3 top-3">
                    <SunDial controller={controller} />
                  </div>

                  <div className={`absolute left-3 ${tableOpen ? 'bottom-[312px]' : 'bottom-3'}`}>
                    <StatusBar gm={handle.gm} />
                  </div>

                  <div className="absolute bottom-3 right-3">
                    <BasemapControl controller={controller} />
                  </div>

                  {!tableOpen && (
                    <button
                      onClick={() => setTableOpen(true)}
                      className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-xs font-medium text-zinc-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white"
                    >
                      ▴ Attribute table
                    </button>
                  )}

                  {tableOpen && (
                    <div className="absolute inset-x-0 bottom-0">
                      <AttributeTable controller={controller} onClose={() => setTableOpen(false)} />
                    </div>
                  )}
                </>
              )}
            </div>

            {!ready && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-zinc-600 shadow ring-1 ring-black/5">
                Loading your design…
              </div>
            )}
          </div>
        </main>

        {ready && controller && <Inspector controller={controller} />}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

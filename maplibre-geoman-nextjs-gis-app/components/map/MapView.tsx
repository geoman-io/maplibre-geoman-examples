'use client';

import { useEffect, useRef, useState } from 'react';
import GisMap, { type GisMapHandle } from '@/components/map/GisMap';
import SignInPanel from '@/components/overlays/SignInPanel';
import UserMenu from '@/components/overlays/UserMenu';
import Toolbar from '@/components/overlays/Toolbar';
import StatusBar from '@/components/overlays/StatusBar';
import LayerPanel from '@/components/overlays/LayerPanel';
import Locator from '@/components/overlays/Locator';
import BasemapControl from '@/components/overlays/BasemapControl';
import MetadataEditor from '@/components/overlays/MetadataEditor';
import AttributeTable from '@/components/overlays/AttributeTable';
import SettingsModal from '@/components/overlays/SettingsModal';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useConfig } from '@/hooks/useConfig';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSession } from '@/lib/auth-client';
import { EditorController } from '@/lib/geoman/editorController';

export default function MapView() {
  const { data: session, isPending } = useSession();
  const [handle, setHandle] = useState<GisMapHandle | null>(null);
  const [controller, setController] = useState<EditorController | null>(null);
  useKeyboardShortcuts(handle?.gm ?? null, controller);

  // Apply the persisted behaviour config to the engine + map handlers, and
  // re-apply whenever the settings modal changes it.
  useEffect(() => {
    if (!controller) return;
    const apply = () => controller.applyConfig(useConfig.getState());
    apply();
    return useConfig.subscribe(apply);
  }, [controller]);
  const [tableOpen, setTableOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hydrated = useEditorStore((s) => s.hydrated);
  const initForUser = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!handle) return;

    // Signed out: tear down and reset.
    if (!userId) {
      if (initForUser.current) {
        void controller?.reset();
        setController(null);
        useEditorStore.setState({
          hydrated: false,
          layers: [],
          features: {},
          activeLayerId: null,
          selectedFeatureId: null,
          activeTool: null,
        });
        initForUser.current = null;
      }
      return;
    }

    if (initForUser.current === userId) return;
    initForUser.current = userId;

    const c = new EditorController(handle.gm);
    setController(c);
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __gm?: unknown }).__gm = handle.gm;
    }
    void c.hydrate();
  }, [handle, userId, controller]);

  const ready = handle && userId && hydrated && controller;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <GisMap onReady={setHandle} />

      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Signed-in chrome */}
        {userId && (
          <div className="absolute right-4 top-4 flex flex-col items-end gap-3">
            <UserMenu />
            {ready && (
              <LayerPanel controller={controller} onSettings={() => setSettingsOpen(true)} />
            )}
          </div>
        )}

        {ready && (
          <>
            <div className="absolute left-4 top-4">
              <Locator controller={controller} />
            </div>

            <div className="absolute left-1/2 top-4 -translate-x-1/2">
              <Toolbar gm={handle.gm} controller={controller} />
            </div>

            <div className={`absolute left-4 ${tableOpen ? 'bottom-[312px]' : 'bottom-4'}`}>
              <StatusBar gm={handle.gm} />
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3">
              {!tableOpen && <MetadataEditor controller={controller} />}
              <BasemapControl controller={controller} />
            </div>

            {!tableOpen && (
              <button
                onClick={() => setTableOpen(true)}
                className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-xs font-medium text-zinc-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white"
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

        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

        {userId && !hydrated && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-zinc-600 shadow ring-1 ring-black/5">
            Loading your map…
          </div>
        )}

        {/* Signed-out: scrim + centered sign-in panel */}
        {!userId && !isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/10 p-4 backdrop-blur-sm">
            <SignInPanel />
          </div>
        )}
      </div>
    </div>
  );
}

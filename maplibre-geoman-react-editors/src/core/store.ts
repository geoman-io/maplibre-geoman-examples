import { create } from 'zustand';
import type { Feature, Layer } from './types';

/** The active vertical's editor state. Not persisted here — the controller
 *  saves the project to localStorage on every change (per vertical). */
export type EditorState = {
  hydrated: boolean;
  layers: Layer[];
  features: Record<string, Feature>;
  activeLayerId: string | null;
  selectedFeatureId: string | null;
  activeTool: { key: string; title: string } | null;
  canUndo: boolean;
  canRedo: boolean;
  clipboard: unknown | null;

  setHydrated: (v: boolean) => void;
  setActiveTool: (t: { key: string; title: string } | null) => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
  setClipboard: (c: unknown | null) => void;
  setLayers: (layers: Layer[]) => void;
  upsertLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string | null) => void;
  setFeatures: (features: Feature[]) => void;
  upsertFeature: (f: Feature) => void;
  removeFeature: (id: string) => void;
  setSelectedFeature: (id: string | null) => void;
  reset: () => void;
};

const empty = {
  hydrated: false,
  layers: [] as Layer[],
  features: {} as Record<string, Feature>,
  activeLayerId: null as string | null,
  selectedFeatureId: null as string | null,
  activeTool: null as { key: string; title: string } | null,
  canUndo: false,
  canRedo: false,
  clipboard: null as unknown | null,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...empty,
  setHydrated: (hydrated) => set({ hydrated }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setClipboard: (clipboard) => set({ clipboard }),
  setLayers: (layers) => set({ layers }),
  upsertLayer: (layer) =>
    set((s) => ({
      layers: s.layers.some((l) => l.id === layer.id)
        ? s.layers.map((l) => (l.id === layer.id ? layer : l))
        : [...s.layers, layer],
    })),
  removeLayer: (id) =>
    set((s) => {
      const features = { ...s.features };
      for (const fid of Object.keys(features)) if (features[fid].layerId === id) delete features[fid];
      return {
        layers: s.layers.filter((l) => l.id !== id),
        features,
        activeLayerId: s.activeLayerId === id ? null : s.activeLayerId,
      };
    }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  setFeatures: (list) => set({ features: Object.fromEntries(list.map((f) => [f.id, f])) }),
  upsertFeature: (f) => set((s) => ({ features: { ...s.features, [f.id]: f } })),
  removeFeature: (id) =>
    set((s) => {
      const features = { ...s.features };
      delete features[id];
      return { features, selectedFeatureId: s.selectedFeatureId === id ? null : s.selectedFeatureId };
    }),
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  reset: () => set({ ...empty }),
}));

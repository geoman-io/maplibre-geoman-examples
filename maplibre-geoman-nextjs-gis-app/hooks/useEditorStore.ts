'use client';

import { create } from 'zustand';
import type { FeatureDTO, LayerDTO } from '@/lib/types';

type EditorState = {
  /** True once the user's data has been loaded into Geoman. */
  hydrated: boolean;
  layers: LayerDTO[];
  /** All features the user owns, keyed by id — the client source of truth. */
  features: Record<string, FeatureDTO>;
  activeLayerId: string | null;
  selectedFeatureId: string | null;
  /** Label of the active map tool (for the status bar). */
  activeTool: string | null;
  /** Undo/redo availability, mirrored from Geoman's `gm:history` event. */
  canUndo: boolean;
  canRedo: boolean;
  /** Geometry of the last copied feature (Ctrl+C), for paste (Ctrl+V). */
  clipboard: unknown | null;

  setHydrated: (v: boolean) => void;
  setActiveTool: (tool: string | null) => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
  setClipboard: (geojson: unknown | null) => void;
  setLayers: (layers: LayerDTO[]) => void;
  upsertLayer: (layer: LayerDTO) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string | null) => void;

  setFeatures: (features: FeatureDTO[]) => void;
  upsertFeature: (feature: FeatureDTO) => void;
  removeFeature: (id: string) => void;

  setSelectedFeature: (id: string | null) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  hydrated: false,
  layers: [],
  features: {},
  activeLayerId: null,
  selectedFeatureId: null,
  activeTool: null,
  canUndo: false,
  canRedo: false,
  clipboard: null,

  setHydrated: (hydrated) => set({ hydrated }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setClipboard: (clipboard) => set({ clipboard }),
  setLayers: (layers) => set({ layers }),
  upsertLayer: (layer) =>
    set((s) => {
      const exists = s.layers.some((l) => l.id === layer.id);
      return {
        layers: exists
          ? s.layers.map((l) => (l.id === layer.id ? layer : l))
          : [...s.layers, layer],
      };
    }),
  removeLayer: (id) =>
    set((s) => {
      const features = { ...s.features };
      for (const fid of Object.keys(features)) {
        if (features[fid].layerId === id) delete features[fid];
      }
      return {
        layers: s.layers.filter((l) => l.id !== id),
        features,
        activeLayerId: s.activeLayerId === id ? null : s.activeLayerId,
      };
    }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),

  setFeatures: (list) =>
    set({ features: Object.fromEntries(list.map((f) => [f.id, f])) }),
  upsertFeature: (feature) =>
    set((s) => ({ features: { ...s.features, [feature.id]: feature } })),
  removeFeature: (id) =>
    set((s) => {
      const features = { ...s.features };
      delete features[id];
      return {
        features,
        selectedFeatureId:
          s.selectedFeatureId === id ? null : s.selectedFeatureId,
      };
    }),

  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
}));

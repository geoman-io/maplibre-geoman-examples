'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** App behaviour flags, persisted to localStorage and surfaced in the settings
 *  modal. All take effect at runtime. */
export type Config = {
  // --- Editing ---
  /** Clicking a feature in any layer selects it AND makes that layer active. */
  crossLayerSelect: boolean;
  /** Show a move cursor when hovering an editable/selectable shape. */
  hoverCursor: boolean;
  /** QGIS node tool: show vertex markers only for the selected feature. */
  editSelectedOnly: boolean;
  /** A body click selects + drags the whole feature (not just its vertices). */
  bodyDrag: boolean;
  // --- Helpers ---
  /** Snap to nearby vertices/segments while drawing and editing. */
  snapping: boolean;
  /** Show live length/area measurements while drawing and editing. */
  measurements: boolean;
  /** Topological editing: shared vertices of adjacent features move together. */
  topology: boolean;
  /** Trace new lines/polygons along existing feature edges while drawing. */
  tracing: boolean;
  /** Snap activation distance in pixels (Geoman `snapDistance`). */
  snapTolerance: number;
  // --- Validation ---
  /** Reject a create/edit whose attributes violate the layer's schema. */
  validateSchema: boolean;
};

export const DEFAULT_CONFIG: Config = {
  crossLayerSelect: true,
  hoverCursor: true,
  editSelectedOnly: true,
  bodyDrag: true,
  snapping: true,
  measurements: false,
  topology: false,
  tracing: false,
  snapTolerance: 18,
  validateSchema: false,
};

/** The boolean (toggle) config keys — everything except the numeric slider. */
export type ToggleKey = Exclude<keyof Config, 'snapTolerance'>;

export const CONFIG_LABELS: Record<ToggleKey, { label: string; hint: string }> = {
  crossLayerSelect: {
    label: 'Select across layers',
    hint: 'Click a feature in any layer to select it — switches the active (editing) layer to match.',
  },
  hoverCursor: {
    label: 'Hover cursor',
    hint: 'Show a move cursor when hovering an editable shape.',
  },
  editSelectedOnly: {
    label: 'Vertices on selection only',
    hint: 'QGIS node tool: show vertex handles only for the selected feature, not every feature.',
  },
  bodyDrag: {
    label: 'Drag by body',
    hint: 'Click a feature’s body to select and move the whole shape.',
  },
  snapping: {
    label: 'Snapping',
    hint: 'Snap to nearby vertices and segments while drawing and editing.',
  },
  measurements: {
    label: 'Measurements',
    hint: 'Show live length / area readouts while drawing and editing.',
  },
  topology: {
    label: 'Topological editing',
    hint: 'Vertices shared by adjacent features move together — no slivers or gaps.',
  },
  tracing: {
    label: 'Tracing',
    hint: 'While drawing, follow the edges of existing features.',
  },
  validateSchema: {
    label: 'Enforce attribute schema',
    hint: 'Reject a create or edit whose attributes violate the layer’s schema.',
  },
};

/** Settings-modal layout: grouped sections of toggle keys. */
export const CONFIG_SECTIONS: Array<{ title: string; keys: Array<ToggleKey> }> = [
  { title: 'Editing', keys: ['crossLayerSelect', 'hoverCursor', 'editSelectedOnly', 'bodyDrag'] },
  { title: 'Helpers', keys: ['snapping', 'measurements', 'topology', 'tracing'] },
  { title: 'Validation', keys: ['validateSchema'] },
];

type ConfigStore = Config & { set: (patch: Partial<Config>) => void };

export const useConfig = create<ConfigStore>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      set: (patch) => set(patch),
    }),
    { name: 'gis-config', version: 1 },
  ),
);

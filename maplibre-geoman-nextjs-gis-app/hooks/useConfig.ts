'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** App behaviour flags, persisted to localStorage and surfaced in the settings
 *  modal. All take effect at runtime. */
export type Config = {
  /** Clicking a feature in any layer selects it AND makes that layer active. */
  crossLayerSelect: boolean;
  /** Show a move cursor when hovering an editable/selectable shape. */
  hoverCursor: boolean;
  /** QGIS node tool: show vertex markers only for the selected feature. */
  editSelectedOnly: boolean;
  /** A body click selects + drags the whole feature (not just its vertices). */
  bodyDrag: boolean;
};

export const DEFAULT_CONFIG: Config = {
  crossLayerSelect: true,
  hoverCursor: true,
  editSelectedOnly: true,
  bodyDrag: true,
};

export const CONFIG_LABELS: Record<keyof Config, { label: string; hint: string }> = {
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
};

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

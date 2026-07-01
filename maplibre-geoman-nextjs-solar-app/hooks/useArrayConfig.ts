'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_MODULE_ID, type PanelOrientation } from '@/lib/solar/modules';

/** Array layout settings, persisted to localStorage and read by the auto-layout
 *  tool. `setbackIn` is the fire-code clearance kept from every roof edge. */
export type ArrayConfig = {
  moduleId: string;
  orientation: PanelOrientation;
  /** Fire setback from roof edges, inches. */
  setbackIn: number;
  /** Gap between panel rows (up-slope), inches. */
  rowGapIn: number;
  /** Gap between panel columns (across-slope), inches. */
  colGapIn: number;
};

export const DEFAULT_ARRAY: ArrayConfig = {
  moduleId: DEFAULT_MODULE_ID,
  orientation: 'portrait',
  setbackIn: 18,
  rowGapIn: 1,
  colGapIn: 1,
};

type ArrayConfigStore = ArrayConfig & { set: (patch: Partial<ArrayConfig>) => void };

const storage = createJSONStorage<ArrayConfig>(() =>
  typeof window !== 'undefined'
    ? window.localStorage
    : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
);

export const useArrayConfig = create<ArrayConfigStore>()(
  persist(
    (set) => ({
      ...DEFAULT_ARRAY,
      set: (patch) => set(patch),
    }),
    {
      name: 'sunplan-array',
      storage,
      partialize: (s) => ({
        moduleId: s.moduleId,
        orientation: s.orientation,
        setbackIn: s.setbackIn,
        rowGapIn: s.rowGapIn,
        colGapIn: s.colGapIn,
      }),
    },
  ),
);

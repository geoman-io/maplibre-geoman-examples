/**
 * PV module catalog. Dimensions are the physical panel size in metres
 * (`widthM` = short edge, `heightM` = long edge); `watts` is the nameplate DC
 * rating. The active module + orientation drive the auto-layout and the system
 * size / production estimate.
 */
export type ModuleSpec = {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  watts: number;
};

export const MODULES: ModuleSpec[] = [
  { id: 'res-410', name: '410 W residential', widthM: 1.134, heightM: 1.722, watts: 410 },
  { id: 'res-360', name: '360 W compact', widthM: 1.0, heightM: 1.65, watts: 360 },
  { id: 'com-550', name: '550 W commercial', widthM: 1.134, heightM: 2.278, watts: 550 },
];

export const DEFAULT_MODULE_ID = MODULES[0].id;

export type PanelOrientation = 'portrait' | 'landscape';

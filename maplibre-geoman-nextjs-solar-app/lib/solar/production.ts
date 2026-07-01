import type { Feature } from 'geojson';
import { measureFeature } from '@/lib/measure';
import type { FeatureDTO } from '@/lib/types';
import { SQM_TO_SQFT } from './domain';

/** Baseline annual specific yield for a good site, kWh per kWp per year (before
 *  the orientation derate). Illustrative for a demo. */
export const SPECIFIC_YIELD = 1450;

const num = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const areaSqm = (f: Feature): number => measureFeature(f)?.area ?? 0;

/**
 * Crude irradiance derate from panel orientation: best for a south-facing plane
 * (azimuth 180° in the northern hemisphere) tilted ~30°, falling off as the
 * roof turns away from south or flattens / steepens. Range ~0.45–1.0.
 */
export function orientationDerate(azimuthDeg: number, tiltDeg: number): number {
  const az = Number.isFinite(azimuthDeg) ? azimuthDeg : 180;
  const tilt = Number.isFinite(tiltDeg) ? tiltDeg : 20;
  // Deviation from due south, 0..180°.
  const azDev = Math.abs(((az - 180 + 540) % 360) - 180);
  const azFactor = 0.55 + 0.45 * Math.cos((azDev * Math.PI) / 180); // 1.0 south → 0.1 north, floored below
  const tiltFactor = Math.max(0.8, 1 - Math.abs(tilt - 30) / 120);
  return Math.max(0.45, azFactor) * tiltFactor;
}

export type SystemSummary = {
  panelCount: number;
  dcKw: number;
  annualKwh: number;
  roofAreaSqft: number;
  panelAreaSqft: number;
  coveragePct: number;
};

/** System-wide rollup across every roof and its panels. */
export function systemSummary(panels: FeatureDTO[], roofs: FeatureDTO[]): SystemSummary {
  const roofByKey = new Map(roofs.map((r) => [r.metadata.name || r.id, r]));
  let dcW = 0;
  let annualKwh = 0;
  let panelAreaSqm = 0;
  for (const p of panels) {
    const watts = num(p.metadata.watts) || 0;
    dcW += watts;
    panelAreaSqm += areaSqm(p.geojson as Feature);
    const roof = roofByKey.get(p.metadata.roof);
    annualKwh +=
      (watts / 1000) * SPECIFIC_YIELD * orientationDerate(num(roof?.metadata.azimuth), num(roof?.metadata.tilt));
  }
  let roofAreaSqm = 0;
  for (const r of roofs) roofAreaSqm += areaSqm(r.geojson as Feature);
  return {
    panelCount: panels.length,
    dcKw: dcW / 1000,
    annualKwh,
    roofAreaSqft: roofAreaSqm * SQM_TO_SQFT,
    panelAreaSqft: panelAreaSqm * SQM_TO_SQFT,
    coveragePct: roofAreaSqm > 0 ? (panelAreaSqm / roofAreaSqm) * 100 : 0,
  };
}

/** Production for a single roof plane given the panels on it. */
export function roofProduction(roof: FeatureDTO, panelsOnRoof: FeatureDTO[]) {
  const dcW = panelsOnRoof.reduce((s, p) => s + (num(p.metadata.watts) || 0), 0);
  const derate = orientationDerate(num(roof.metadata.azimuth), num(roof.metadata.tilt));
  return {
    panelCount: panelsOnRoof.length,
    dcKw: dcW / 1000,
    derate,
    annualKwh: (dcW / 1000) * SPECIFIC_YIELD * derate,
  };
}

import type { FeatureDTO, Symbology } from '@/lib/types';

// Categorical palette (distinct hues) + sequential ramps for graduated classes.
export const CATEGORY_PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export const RAMPS: Record<string, string[]> = {
  Blue: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  Viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  Heat: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  Greens: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
};

const fieldValues = (features: Array<FeatureDTO>, field: string): Array<string> =>
  features.map((f) => f.metadata?.[field]).filter((v): v is string => v != null && v !== '');

/** Distinct string values of a metadata field across a layer's features. */
export const uniqueValues = (features: Array<FeatureDTO>, field: string): Array<string> =>
  [...new Set(fieldValues(features, field))].sort();

/** Build a categorized symbology: one palette colour per distinct value. */
export const categorize = (
  features: Array<FeatureDTO>,
  field: string,
): Extract<Symbology, { mode: 'categorized' }> => ({
  mode: 'categorized',
  field,
  categories: uniqueValues(features, field).map((value, i) => ({
    value,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  })),
  fallback: '#cbd5e1',
});

/** Build a graduated symbology: `classes` equal-interval breaks over a ramp. */
export const graduate = (
  features: Array<FeatureDTO>,
  field: string,
  classes: number,
  ramp: Array<string>,
): Extract<Symbology, { mode: 'graduated' }> => {
  const nums = fieldValues(features, field)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const min = nums[0] ?? 0;
  const max = nums[nums.length - 1] ?? 0;
  const step = (max - min) / classes;
  const colorAt = (i: number) =>
    ramp[Math.min(ramp.length - 1, Math.round((i / Math.max(1, classes - 1)) * (ramp.length - 1)))];
  const stops: Array<{ value: number; color: string }> = [];
  for (let i = 1; i < classes; i++) {
    stops.push({ value: Number((min + step * i).toFixed(4)), color: colorAt(i) });
  }
  return { mode: 'graduated', field, base: colorAt(0), stops };
};

/** Compile a symbology to a Geoman `StyleExpression` for the fill colour, or
 *  `undefined` for `single` (use the layer's flat colour). */
export const fillExpression = (sym: Symbology): unknown => {
  if (sym.mode === 'categorized') {
    return {
      categorical: {
        field: sym.field,
        categories: Object.fromEntries(sym.categories.map((c) => [c.value, c.color])),
        fallback: sym.fallback,
      },
    };
  }
  if (sym.mode === 'graduated') {
    return {
      step: { field: sym.field, base: sym.base, stops: sym.stops.map((s) => [s.value, s.color]) },
    };
  }
  return undefined;
};

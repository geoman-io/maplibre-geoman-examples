import type { FeatureDTO, LayerFilter, LayerSchema, Symbology } from '@/lib/types';

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
  [...new Set(fieldValues(features.filter((feature) => feature?.metadata), field))].sort();

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
  ramp: Array<string> = RAMPS.Blue,
): Extract<Symbology, { mode: 'graduated' }> => {
  const buckets = Math.max(2, Math.min(12, Math.floor(classes) || 2));
  const colors = ramp.length > 0 ? ramp : RAMPS.Blue;
  const nums = fieldValues(features.filter((feature) => feature?.metadata), field)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const min = nums[0] ?? 0;
  const max = nums[nums.length - 1] ?? 0;
  const step = (max - min) / buckets;
  const colorAt = (i: number) =>
    colors[Math.min(colors.length - 1, Math.round((i / Math.max(1, buckets - 1)) * (colors.length - 1)))];
  const stops: Array<{ value: number; color: string }> = [];
  for (let i = 1; i < buckets; i++) {
    const value = Number((min + step * i).toFixed(4));
    if (stops.some((stop) => stop.value === value)) continue;
    stops.push({ value, color: colorAt(i) });
  }
  return { mode: 'graduated', field, base: colorAt(0), stops };
};

/** Compile a symbology to a Geoman `StyleExpression` for the fill colour, or
 *  `undefined` for `single` (use the layer's flat colour). */
export const fillExpression = (sym: Symbology): unknown => {
  if (sym.mode === 'categorized') {
    const categories = Array.isArray(sym.categories) ? sym.categories : [];
    return {
      categorical: {
        field: sym.field,
        categories: Object.fromEntries(
          categories.filter((item) => item && typeof item.value === 'string').map((item) => [item.value, item.color]),
        ),
        fallback: sym.fallback || '#cbd5e1',
      },
    };
  }
  if (sym.mode === 'graduated') {
    const stops = (Array.isArray(sym.stops) ? sym.stops : [])
      .filter((stop) => stop && Number.isFinite(stop.value))
      .sort((a, b) => a.value - b.value)
      .filter((stop, index, all) => index === 0 || stop.value > all[index - 1].value);
    if (stops.length === 0) return undefined;
    return {
      step: { field: sym.field, base: sym.base || '#cbd5e1', stops: stops.map((stop) => [stop.value, stop.color]) },
    };
  }
  return undefined;
};

/** Evaluate a definition query against a feature's metadata. No filter (or no
 *  field) matches everything; a missing attribute is excluded. */
export const matchesFilter = (
  metadata: Record<string, string>,
  filter: LayerFilter | undefined | null,
  schema?: LayerSchema | null,
): boolean => {
  if (!filter?.field || typeof filter.value !== 'string') return true;
  // A missing key must not fall through to Object.prototype (`toString`, …).
  if (!metadata || typeof metadata !== 'object' || !Object.hasOwn(metadata, filter.field)) return false;
  const raw = metadata[filter.field];
  if (typeof raw !== 'string' || raw === '') return false;

  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const type = fields.find((field) => field.name === filter.field)?.type;
  if (type === 'number' || type === 'integer') {
    const a = Number(raw);
    const b = Number(filter.value);
    switch (filter.op) {
      case '=': return a === b;
      case '!=': return a !== b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case 'contains': return raw.includes(filter.value);
    }
  }
  switch (filter.op) {
    case '=': return raw === filter.value;
    case '!=': return raw !== filter.value;
    case 'contains': return raw.toLowerCase().includes(filter.value.toLowerCase());
    default: return false; // ordering ops are meaningless on text
  }
};

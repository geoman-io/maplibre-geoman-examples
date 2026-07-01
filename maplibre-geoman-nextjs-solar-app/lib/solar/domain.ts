import type { GeometryType, LayerSchema } from '@/lib/types';

/**
 * The canonical layers of a rooftop solar plan. Each is an ordinary Geoman data
 * layer with a typed attribute schema; the planning tools read well-known
 * attributes (a roof's `azimuth`, a panel's `watts`, …). Layers are matched by
 * name, so the seeded project lines up with the layout / setback tools.
 */
export type SolarLayerKey = 'modules' | 'obstructions' | 'placeable' | 'roof';

export type SolarLayerSpec = {
  key: SolarLayerKey;
  name: string;
  color: string;
  borderColor: string;
  geometryType: GeometryType;
  schema: LayerSchema;
};

const opt = (...values: string[]) => values.map((value) => ({ value }));

/** Panel order = render order (top of the list draws on top). PV modules sit on
 *  top of the roof; the roof plane is the bottom backdrop and the default
 *  (editable) layer. */
export const DOMAIN_LAYERS: SolarLayerSpec[] = [
  {
    key: 'modules',
    name: 'PV Modules',
    color: '#1d4ed8',
    borderColor: '#0b1220',
    geometryType: 'polygon',
    schema: {
      fields: [
        { name: 'roof', type: 'string' },
        { name: 'module', type: 'string' },
        { name: 'watts', type: 'integer', min: 0 },
        { name: 'orientation', type: 'enum', options: opt('portrait', 'landscape') },
      ],
    },
  },
  {
    key: 'obstructions',
    name: 'Obstructions',
    color: '#ef4444',
    borderColor: '#991b1b',
    geometryType: 'polygon',
    schema: {
      fields: [
        { name: 'type', type: 'enum', options: opt('vent', 'chimney', 'skylight', 'hvac', 'pipe', 'other') },
        { name: 'label', type: 'string' },
      ],
    },
  },
  {
    key: 'placeable',
    name: 'Setback Area',
    color: '#22c55e',
    borderColor: '#15803d',
    geometryType: 'polygon',
    schema: {
      fields: [
        { name: 'roof', type: 'string' },
        { name: 'setback_in', type: 'number', min: 0 },
      ],
    },
  },
  {
    key: 'roof',
    name: 'Roof Planes',
    color: '#f59e0b',
    borderColor: '#b45309',
    geometryType: 'polygon',
    schema: {
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'azimuth', type: 'integer', min: 0, max: 359 },
        { name: 'tilt', type: 'integer', min: 0, max: 60 },
        {
          name: 'surface',
          type: 'enum',
          options: opt('comp_shingle', 'metal', 'tile', 'flat', 'membrane'),
        },
      ],
    },
  },
];

export const LAYER_NAMES: Record<SolarLayerKey, string> = Object.fromEntries(
  DOMAIN_LAYERS.map((l) => [l.key, l.name]),
) as Record<SolarLayerKey, string>;

export const ROOF_LAYER = LAYER_NAMES.roof;
export const MODULES_LAYER = LAYER_NAMES.modules;
export const OBSTRUCTIONS_LAYER = LAYER_NAMES.obstructions;
export const PLACEABLE_LAYER = LAYER_NAMES.placeable;

// --- Unit conversions -------------------------------------------------------
export const M_PER_FT = 0.3048;
export const M_PER_IN = 0.0254;
export const SQM_TO_SQFT = 10.7639;

export const inToM = (inches: number) => inches * M_PER_IN;
export const ftToM = (feet: number) => feet * M_PER_FT;

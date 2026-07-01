import type { Feature } from 'geojson';

/** One typed attribute field — mirrors the library's FieldSpec. */
export type SchemaField = {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'enum';
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label?: string }>;
};

/** A layer's attribute schema — mirrors the library's FeatureSchema. */
export type LayerSchema = { fields: SchemaField[] };

/** Result of validating attributes against a layer schema. */
export type SchemaValidationResult = {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
};

/** Thematic symbology (QGIS categorized / graduated renderers). `single` = the
 *  layer's flat fill/border colour. Compiles to a Geoman StyleExpression. */
export type Symbology =
  | { mode: 'single' }
  | {
      mode: 'categorized';
      field: string;
      categories: Array<{ value: string; color: string }>;
      fallback: string;
    }
  | {
      mode: 'graduated';
      field: string;
      stops: Array<{ value: number; color: string }>; // ascending thresholds
      base: string; // colour below the first threshold
    };

/** Attribute labels (QGIS label engine) — drives the engine's `style.label`. */
export type LabelConfig = {
  field: string;
  size?: number;
  color?: string;
  haloColor?: string;
};

/** Definition query (QGIS) — show only features matching this attribute test. */
export type LayerFilter = {
  field: string;
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains';
  value: string;
};

/** Persisted per-layer presentation: thematic symbology, labels, filter, and
 *  scale-dependent (zoom) visibility. */
export type LayerStyleConfig = {
  symbology?: Symbology;
  labels?: LabelConfig;
  filter?: LayerFilter;
  /** Render only within this zoom range (QGIS scale visibility). */
  minZoom?: number;
  maxZoom?: number;
};

/** A layer's allowed geometry (QGIS single-geometry layers). null = any. */
export type GeometryType = 'point' | 'line' | 'polygon';

/** A project layer. Persisted to localStorage (no backend in this app). */
export type LayerDTO = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  visible: boolean;
  sortOrder: number;
  schema: LayerSchema | null;
  style: LayerStyleConfig | null;
  geometryType: GeometryType | null;
};

/** A feature inside a layer. Persisted to localStorage. */
export type FeatureDTO = {
  id: string;
  layerId: string;
  shape: string | null;
  geojson: Feature;
  metadata: Record<string, string>;
};

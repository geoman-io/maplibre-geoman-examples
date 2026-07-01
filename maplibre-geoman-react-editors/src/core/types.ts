import type { Feature as GeoFeature } from 'geojson';

/** One typed attribute field (mirrors Geoman's FieldSpec). */
export type SchemaField = {
  name: string;
  label?: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'enum';
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label?: string }>;
};

export type LayerSchema = { fields: SchemaField[] };
export type GeometryType = 'point' | 'line' | 'polygon';

/** A layer of the vertical's data model. */
export type Layer = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  visible: boolean;
  sortOrder: number;
  geometryType: GeometryType | null;
  schema: LayerSchema | null;
  /** Optional thematic fill: categorized colour by an attribute. */
  categorical?: { field: string; colors: Record<string, string>; fallback: string } | null;
  /** Optional attribute label. */
  label?: { field: string; size?: number; color?: string; haloColor?: string } | null;
};

/** A feature inside a layer (localStorage-persisted). */
export type Feature = {
  id: string;
  layerId: string;
  shape: string | null;
  geojson: GeoFeature;
  metadata: Record<string, string>;
};

/** The whole persisted project for a vertical. */
export type Project = { layers: Layer[]; features: Feature[] };

/** A layer template used to build a vertical's seed project. */
export type LayerSpec = Omit<Layer, 'id' | 'visible' | 'sortOrder'> & { key: string };

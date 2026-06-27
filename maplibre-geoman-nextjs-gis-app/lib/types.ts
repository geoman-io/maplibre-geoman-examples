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

/** Client-side mirror of the `layer` row (dates serialised as ISO strings). */
export type LayerDTO = {
  id: string;
  userId: string;
  name: string;
  color: string;
  borderColor: string;
  visible: boolean;
  sortOrder: number;
  schema: LayerSchema | null;
  createdAt: string;
  updatedAt: string;
};

/** Client-side mirror of the `feature` row. */
export type FeatureDTO = {
  id: string;
  layerId: string;
  userId: string;
  shape: string | null;
  geojson: Feature;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

import type { Feature } from 'geojson';

/** Client-side mirror of the `layer` row (dates serialised as ISO strings). */
export type LayerDTO = {
  id: string;
  userId: string;
  name: string;
  color: string;
  borderColor: string;
  visible: boolean;
  sortOrder: number;
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

'use client';

import type { Geoman, FeatureData } from '@geoman-io/maplibre-geoman-pro';
import type { Feature } from 'geojson';
import { stringMetadata } from '@/lib/geojson-guard';

type ReadFeature = {
  id: string;
  shape: string | null;
  geojson: Feature;
  metadata: Record<string, string>;
};

/** Extract the persistable shape of a Geoman feature. */
export function readFeatureData(fd: FeatureData): ReadFeature {
  const geojson = fd.getGeoJson() as unknown as Feature;
  const props = (geojson.properties ?? {}) as Record<string, unknown>;
  return {
    id: String(fd.id),
    shape: (props.shape as string | undefined) ?? geojson.geometry?.type ?? null,
    geojson,
    metadata: stringMetadata(props.metadata),
  };
}

/** Find a live Geoman feature by its (stringified) id. */
export function findFeature(gm: Geoman, id: string): FeatureData | null {
  let found: FeatureData | null = null;
  gm.features.forEach((fd) => {
    if (String(fd.id) === id) found = fd;
  });
  return found;
}

'use client';

import type { Feature } from 'geojson';
import type { FeatureDTO, LayerDTO, LayerSchema } from '@/lib/types';

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Layers ---------------------------------------------------------------

export const listLayers = () =>
  http<{ layers: LayerDTO[] }>('/api/layers').then((r) => r.layers);

export const createLayer = (input: {
  name: string;
  color?: string;
  borderColor?: string;
  sortOrder?: number;
  schema?: LayerSchema | null;
}) =>
  http<{ layer: LayerDTO }>('/api/layers', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.layer);

export const updateLayer = (
  id: string,
  patch: Partial<
    Pick<LayerDTO, 'name' | 'color' | 'borderColor' | 'visible' | 'sortOrder' | 'schema'>
  >,
) =>
  http<{ layer: LayerDTO }>(`/api/layers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.layer);

export const deleteLayer = (id: string) =>
  http<{ ok: true }>(`/api/layers/${id}`, { method: 'DELETE' });

// --- Features -------------------------------------------------------------

export const listFeatures = () =>
  http<{ features: FeatureDTO[] }>('/api/features').then((r) => r.features);

export const upsertFeature = (input: {
  id: string;
  layerId: string;
  shape?: string | null;
  geojson: Feature;
  metadata?: Record<string, string>;
}) =>
  http<{ feature: FeatureDTO }>('/api/features', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.feature);

export const updateFeature = (
  id: string,
  patch: {
    layerId?: string;
    shape?: string | null;
    geojson?: Feature;
    metadata?: Record<string, string>;
  },
) =>
  http<{ feature: FeatureDTO }>(`/api/features/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.feature);

export const deleteFeature = (id: string) =>
  http<{ ok: true }>(`/api/features/${id}`, { method: 'DELETE' });

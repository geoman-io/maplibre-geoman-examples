import type { FC, ReactNode } from 'react';
import type { Geometry } from 'geojson';
import type { EditorController } from './controller';
import type { Feature, Layer, LayerSpec, Project } from './types';
import { type Frame, frameAt } from '../geo';

/** One custom toolbar button (custom icon + a run that drives the controller). */
export type ToolDef = {
  id: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  needsSelection?: boolean;
  run: (c: EditorController) => void | Promise<void>;
};
export type ToolGroup = { name: string; tools: ToolDef[] };

/** Seed API handed to a vertical to author its sample project. */
export type SeedApi = {
  frame: Frame;
  feat: (layerKey: string, geometry: Geometry, metadata?: Record<string, string>, shape?: string) => Feature;
};

/** A fully-defined vertical editor: data model + custom toolbar + custom UI. */
export type VerticalDef = {
  id: string;
  name: string;
  tagline: string;
  icon: ReactNode;
  /** Tailwind gradient classes for the brand chip, e.g. 'from-sky-500 to-blue-600'. */
  accent: string;
  center: [number, number];
  zoom: number;
  layers: LayerSpec[];
  activeLayerName?: string;
  /** Helper modes to pre-enable (snapping / pin=topology / auto_trace=tracing). */
  helpers?: string[];
  seed: (api: SeedApi) => void;
  toolbar: ToolGroup[];
  Sidebar: FC<{ controller: EditorController }>;
  Inspector: FC<{ controller: EditorController }>;
};

const uuid = () => crypto.randomUUID();

/** Build the seed project (layers with ids + features) for a vertical. */
export function buildProject(def: VerticalDef): Project {
  const idByKey = new Map<string, string>();
  const layers: Layer[] = def.layers.map((spec, i) => {
    const id = uuid();
    idByKey.set(spec.key, id);
    const { key: _key, ...rest } = spec;
    void _key;
    return { ...rest, id, visible: true, sortOrder: i };
  });

  const features: Feature[] = [];
  const feat: SeedApi['feat'] = (layerKey, geometry, metadata = {}, shape = 'polygon') => {
    const id = uuid();
    const layerId = idByKey.get(layerKey);
    if (!layerId) throw new Error(`seed: unknown layer key "${layerKey}"`);
    const f: Feature = { id, layerId, shape, geojson: { type: 'Feature', id, geometry, properties: { id, shape, metadata } }, metadata };
    features.push(f);
    return f;
  };

  def.seed({ frame: frameAt(def.center), feat });
  return { layers, features };
}

/** Convenience for defining a LayerSpec. */
export const layerSpec = (spec: LayerSpec): LayerSpec => spec;

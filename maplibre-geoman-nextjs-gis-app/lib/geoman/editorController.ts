'use client';

import type { DataLayerStyle, FeatureData, Geoman } from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import type { Feature } from 'geojson';
import type { FeatureCollection } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import * as api from '@/lib/api-client';
import { findFeature, readFeatureData } from '@/lib/geoman/featureSync';
import { featureBounds, inferShape, stringProps } from '@/lib/io';
import type { FeatureDTO, LayerDTO } from '@/lib/types';

const store = () => useEditorStore.getState();
const featuresOf = (layerId: string) =>
  Object.values(store().features).filter((f) => f.layerId === layerId);

const SOURCE_PREFIX = 'gm_dl_';
const layerIdFromSource = (sourceId: string) =>
  sourceId.startsWith(SOURCE_PREFIX) ? sourceId.slice(SOURCE_PREFIX.length) : null;

/** A LayerDTO's colours expressed as a Geoman data-layer style. */
const toStyle = (layer: LayerDTO): DataLayerStyle => ({
  polygon: {
    fillColor: layer.color,
    fillOpacity: 0.3,
    strokeColor: layer.borderColor,
    strokeWidth: 2,
  },
  line: { color: layer.borderColor, width: 3 },
  point: { color: layer.color, radius: 6, strokeColor: layer.borderColor, strokeWidth: 2 },
});

/** A stored feature as GeoJSON for `dataLayers.setData`, with a stable id. */
const toGeoJson = (row: FeatureDTO): Feature => ({
  ...(row.geojson as Feature),
  id: row.id,
  properties: {
    ...((row.geojson as Feature).properties ?? {}),
    id: row.id,
    ...(row.shape ? { shape: row.shape } : {}),
    metadata: row.metadata,
  },
});

/**
 * Thin glue between the app store/API and Geoman's `dataLayers` engine. Each
 * app layer is a native, editable Geoman data layer (own source + style); all
 * are editable at once and `setActive` only chooses where new draws land.
 */
export class EditorController {
  constructor(private gm: Geoman) {}

  async hydrate() {
    const [layers, features] = await Promise.all([api.listLayers(), api.listFeatures()]);
    store().setLayers(layers);
    store().setFeatures(features);

    // QGIS-style: exactly the active layer is "in editing" (a Geoman editable
    // source — shows vertices, accepts edits). Every other layer is a display
    // layer (its own custom style, no edit handles).
    const active = layers[0] ?? null;
    for (const layer of layers) {
      this.addGeomanLayer(layer, layer.id === active?.id);
    }
    if (active) await this.gm.dataLayers.setActive(active.id);
    store().setActiveLayer(active?.id ?? null);

    this.wireEvents();
    store().setHydrated(true);
  }

  private wireEvents() {
    const map = this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;

    map.on('gm:create', async (e: { feature: FeatureData; shape: string }) => {
      const layerId = layerIdFromSource(e.feature.source.id) ?? store().activeLayerId;
      if (!layerId) return;
      await e.feature.updateProperties({ metadata: {}, shape: e.shape });
      const read = readFeatureData(e.feature);
      const dto = await api.upsertFeature({
        id: read.id,
        layerId,
        shape: e.shape,
        geojson: read.geojson,
        metadata: {},
      });
      store().upsertFeature(dto);
      store().setSelectedFeature(read.id);
    });

    const onUpdate = async (e: { feature?: FeatureData; features?: FeatureData[] }) => {
      for (const fd of e.feature ? [e.feature] : (e.features ?? [])) {
        const read = readFeatureData(fd);
        if (!store().features[read.id]) continue;
        const dto = await api.updateFeature(read.id, {
          geojson: read.geojson,
          shape: read.shape,
          metadata: read.metadata,
        });
        store().upsertFeature(dto);
      }
    };
    for (const ev of ['gm:editend', 'gm:dragend', 'gm:rotateend', 'gm:scaleend', 'gm:cut'] as const) {
      map.on(ev, onUpdate);
    }

    map.on('gm:remove', async (e: { feature: FeatureData }) => {
      const id = String(e.feature.id);
      if (!store().features[id]) return;
      store().removeFeature(id);
      await api.deleteFeature(id).catch(() => {});
    });

    map.on('gm:selection', (e: { selection: Array<string | number> }) => {
      const id = e.selection[0];
      store().setSelectedFeature(id != null ? String(id) : null);
    });
  }

  /** Register a layer with Geoman as either the editable layer or a display layer. */
  private addGeomanLayer(layer: LayerDTO, editable: boolean) {
    this.gm.dataLayers.add({
      id: layer.id,
      name: layer.name,
      editable,
      visible: layer.visible,
      style: toStyle(layer),
    });
    this.gm.dataLayers.setData(layer.id, featuresOf(layer.id).map(toGeoJson));
  }

  async setActiveLayer(id: string) {
    const prev = store().activeLayerId;
    if (prev === id) return;
    store().setSelectedFeature(null);

    // Flip kinds in place (engine handles marker cleanup + registration).
    if (prev) await this.gm.dataLayers.setEditable(prev, false);
    await this.gm.dataLayers.setEditable(id, true);
    // setEditable(true) only flips registration; load this layer's features
    // from our authoritative store into the editable featureStore.
    this.gm.dataLayers.setData(id, featuresOf(id).map(toGeoJson));
    await this.gm.dataLayers.setActive(id);
    store().setActiveLayer(id);
  }

  async createLayer(name: string, color: string, borderColor: string) {
    const layer = await api.createLayer({
      name,
      color,
      borderColor,
      sortOrder: store().layers.length,
    });
    store().upsertLayer(layer);
    this.addGeomanLayer(layer, false); // added as display, then promoted
    await this.setActiveLayer(layer.id);
    return layer;
  }

  async toggleVisibility(layer: LayerDTO) {
    const next = !layer.visible;
    store().upsertLayer({ ...layer, visible: next });
    this.gm.dataLayers.setVisibility(layer.id, next);
    await api.updateLayer(layer.id, { visible: next });
  }

  async applyColors(layer: LayerDTO, color: string, borderColor: string) {
    const updated = { ...layer, color, borderColor };
    store().upsertLayer(updated);
    this.gm.dataLayers.setStyle(layer.id, toStyle(updated));
    await api.updateLayer(layer.id, { color, borderColor });
  }

  async deleteLayer(layer: LayerDTO) {
    this.gm.dataLayers.remove(layer.id);
    store().removeLayer(layer.id);
    await api.deleteLayer(layer.id);
    if (store().activeLayerId === null) {
      const next = store().layers[0];
      if (next) await this.setActiveLayer(next.id);
    }
  }

  /** Edit a feature's metadata (attribute table / metadata editor). */
  async updateFeatureMetadata(id: string, metadata: Record<string, string>) {
    const fd = findFeature(this.gm, id);
    await fd?.updateProperties({ metadata });
    const f = store().features[id];
    if (f) store().upsertFeature({ ...f, metadata });
    await api.updateFeature(id, { metadata });
  }

  /** Import a GeoJSON FeatureCollection into a layer (persist + render). */
  async importGeoJson(layerId: string, fc: FeatureCollection) {
    for (const f of fc.features) {
      if (!f.geometry) continue;
      const id = crypto.randomUUID();
      const shape = inferShape(f.geometry);
      const metadata = stringProps(f.properties);
      const geojson = {
        ...f,
        id,
        properties: { ...(f.properties ?? {}), id, shape, metadata },
      } as Feature;
      const dto = await api.upsertFeature({ id, layerId, shape, geojson, metadata });
      store().upsertFeature(dto);
    }
    this.gm.dataLayers.setData(layerId, featuresOf(layerId).map(toGeoJson));
  }

  /** Fit the map to a feature's bounds. */
  zoomToFeature(id: string) {
    const f = store().features[id];
    if (!f) return;
    this.fit(featureBounds(f.geojson as Feature), 16);
  }

  /** Fit the map to every feature (the engine helper only sees `main`). */
  zoomToAll() {
    let b: [[number, number], [number, number]] | null = null;
    for (const f of Object.values(store().features)) {
      const fb = featureBounds(f.geojson as Feature);
      if (!fb) continue;
      b = b
        ? [
            [Math.min(b[0][0], fb[0][0]), Math.min(b[0][1], fb[0][1])],
            [Math.max(b[1][0], fb[1][0]), Math.max(b[1][1], fb[1][1])],
          ]
        : fb;
    }
    this.fit(b, 15);
  }

  private fit(bounds: [[number, number], [number, number]] | null, maxZoom: number) {
    if (!bounds) return;
    const map = this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;
    map.fitBounds(bounds, { padding: 96, maxZoom, duration: 600 });
  }

  reset() {
    for (const layer of store().layers) this.gm.dataLayers.remove(layer.id);
  }
}

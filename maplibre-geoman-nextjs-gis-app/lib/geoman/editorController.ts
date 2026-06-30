'use client';

import type {
  DataLayerStyle,
  FeatureData,
  Geoman,
  StyleValue,
} from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import type { Feature } from 'geojson';
import type { FeatureCollection } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import { DEFAULT_CONFIG, type Config } from '@/hooks/useConfig';
import * as api from '@/lib/api-client';
import { findFeature, readFeatureData } from '@/lib/geoman/featureSync';
import { featureBounds, inferShape, stringProps, translateGeometry } from '@/lib/io';
import { fillExpression, matchesFilter } from '@/lib/symbology';
import type {
  FeatureDTO,
  GeometryType,
  LayerDTO,
  LayerSchema,
  LayerStyleConfig,
  SchemaValidationResult,
} from '@/lib/types';

const store = () => useEditorStore.getState();
const featuresOf = (layerId: string) =>
  Object.values(store().features).filter((f) => f.layerId === layerId);
/** A layer's features as styling-ready GeoJSON (typed attributes flattened),
 *  with the layer's definition query (filter) applied. */
const geoJsonFor = (layerId: string) => {
  const layer = store().layers.find((l) => l.id === layerId);
  const schema = layer?.schema ?? null;
  return featuresOf(layerId)
    .filter((r) => matchesFilter(r.metadata, layer?.style?.filter, schema))
    .map((r) => toGeoJson(r, schema));
};

const SOURCE_PREFIX = 'gm_dl_';
const layerIdFromSource = (sourceId: string) =>
  sourceId.startsWith(SOURCE_PREFIX) ? sourceId.slice(SOURCE_PREFIX.length) : null;

/** Coerce string metadata to typed values (per the schema) so thematic styling
 *  and labels can read attributes via `['get', field]` on rendered features. */
const coerceProps = (
  metadata: Record<string, string>,
  schema?: LayerSchema | null,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...metadata };
  for (const f of schema?.fields ?? []) {
    const raw = metadata[f.name];
    if (raw == null || raw === '') continue;
    out[f.name] =
      f.type === 'number' || f.type === 'integer'
        ? Number(raw)
        : f.type === 'boolean'
          ? raw === 'true'
          : raw;
  }
  return out;
};

/** A stored feature as GeoJSON for `dataLayers.setData`, with a stable id and
 *  its (typed) metadata fields flattened onto `properties` for styling/labels. */
const toGeoJson = (row: FeatureDTO, schema?: LayerSchema | null): Feature => ({
  ...(row.geojson as Feature),
  id: row.id,
  properties: {
    ...((row.geojson as Feature).properties ?? {}),
    ...coerceProps(row.metadata, schema),
    id: row.id,
    ...(row.shape ? { shape: row.shape } : {}),
    metadata: row.metadata,
  },
});

/** A LayerDTO's presentation as a Geoman data-layer style — flat colours, plus
 *  thematic symbology (categorized/graduated fill) and labels when configured. */
const compileStyle = (layer: LayerDTO): DataLayerStyle => {
  const sym = layer.style?.symbology;
  const fill =
    sym && sym.mode !== 'single' ? (fillExpression(sym) as StyleValue<string>) : undefined;
  const labels = layer.style?.labels;
  return {
    polygon: {
      fillColor: fill ?? layer.color,
      fillOpacity: 0.3,
      strokeColor: layer.borderColor,
      strokeWidth: 2,
    },
    line: { color: layer.borderColor, width: 3 },
    point: {
      color: fill ?? layer.color,
      radius: 6,
      strokeColor: layer.borderColor,
      strokeWidth: 2,
    },
    ...(labels?.field
      ? {
          label: {
            field: labels.field,
            ...(labels.size ? { size: labels.size } : {}),
            ...(labels.color ? { color: labels.color } : {}),
            ...(labels.haloColor ? { haloColor: labels.haloColor } : {}),
          },
        }
      : {}),
  };
};

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
    // Match the panel order (top of the list = rendered on top) — the engine
    // stacks layers in add-order, so restack to put layers[0] on top.
    this.restackLayers(layers.map((l) => l.id));
    if (active) await this.gm.dataLayers.setActive(active.id);
    store().setActiveLayer(active?.id ?? null);

    this.wireEvents();
    store().setHydrated(true);
  }

  private wireEvents() {
    const map = this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;

    map.on('gm:create', async (e: { feature: FeatureData; shape?: string }) => {
      const layerId = layerIdFromSource(e.feature.source.id) ?? store().activeLayerId;
      if (!layerId) return;
      // Read straight from the feature — do NOT mutate it here (updateProperties
      // would record a second history entry, making one draw take two undos).
      const read = readFeatureData(e.feature);
      const dto = await api.upsertFeature({
        id: read.id,
        layerId,
        shape: e.shape ?? read.shape,
        geojson: read.geojson,
        metadata: read.metadata,
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

    map.on('gm:history', (e: { canUndo: boolean; canRedo: boolean }) => {
      store().setHistory(e.canUndo, e.canRedo);
    });
  }

  undo() {
    return this.gm.history.undo();
  }

  redo() {
    return this.gm.history.redo();
  }

  /** Copy the selected feature's geometry to the in-app clipboard (Ctrl+C). */
  copySelected() {
    const id = store().selectedFeatureId;
    if (!id) return;
    const row = store().features[id];
    if (row) store().setClipboard(row.geojson);
  }

  /** Paste the clipboard geometry as a new feature in the active layer, nudged
   *  slightly south-east so it doesn't land exactly on the original (Ctrl+V). */
  async paste() {
    const clip = store().clipboard as Feature | null;
    const layerId = store().activeLayerId;
    if (!clip?.geometry || !layerId) return;
    const id = crypto.randomUUID();
    const geojson: Feature = {
      type: 'Feature',
      properties: {},
      geometry: translateGeometry(clip.geometry, 0.05, -0.05),
    };
    const dto = await api.upsertFeature({
      id,
      layerId,
      shape: inferShape(clip.geometry),
      geojson,
      metadata: {},
    });
    store().upsertFeature(dto);
    this.gm.dataLayers.setData(layerId, geoJsonFor(layerId));
    store().setSelectedFeature(id);
  }

  /** Delete the currently selected feature (Del). `deleteAndNotify` removes it
   *  through the engine (records history for undo) and fires `gm:remove`, so the
   *  single handler syncs the store + DB — the same path the Delete tool uses. */
  /** Explode the selected multipolygon into separate single-part features
   *  (the engine fires create/remove events, which the store/DB sync handles). */
  async explodeSelected() {
    const id = store().selectedFeatureId;
    if (id) await this.gm.edit.explode(id);
  }

  async deleteSelected() {
    const id = store().selectedFeatureId;
    if (!id) return;
    const fd = findFeature(this.gm, id);
    if (fd) await this.gm.features.deleteAndNotify(fd);
  }

  /** Register a layer with Geoman as either the editable layer or a display layer. */
  private addGeomanLayer(layer: LayerDTO, editable: boolean) {
    this.gm.dataLayers.add({
      id: layer.id,
      name: layer.name,
      editable,
      visible: layer.visible,
      style: compileStyle(layer),
      ...(layer.schema ? { schema: layer.schema } : {}),
      ...(layer.geometryType ? { geometryTypes: [layer.geometryType] } : {}),
    });
    this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
  }

  /** Set a layer's attribute schema (typed fields) — persisted + applied to the
   *  engine so dataLayers.validate() can check feature attributes against it. */
  async setLayerSchema(layer: LayerDTO, schema: LayerSchema | null) {
    const updated = { ...layer, schema };
    store().upsertLayer(updated);
    this.gm.dataLayers.setSchema(layer.id, (schema ?? { fields: [] }) as never);
    await api.updateLayer(layer.id, { schema });
  }

  /** Validate a metadata map against the layer's schema via the engine. Coerces
   *  the string metadata to the field's declared type first. */
  validateMetadata(layerId: string, metadata: Record<string, string>): SchemaValidationResult {
    const schema = store().layers.find((l) => l.id === layerId)?.schema;
    if (!schema) return { valid: true, errors: [] };
    const props: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const raw = metadata[field.name];
      if (raw == null || raw === '') continue;
      props[field.name] =
        field.type === 'number' || field.type === 'integer'
          ? Number(raw)
          : field.type === 'boolean'
            ? raw === 'true'
            : raw;
    }
    return this.gm.dataLayers.validate(layerId, props);
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
    this.gm.dataLayers.setData(id, geoJsonFor(id));
    await this.gm.dataLayers.setActive(id);
    store().setActiveLayer(id);
  }

  async createLayer(
    name: string,
    color: string,
    borderColor: string,
    geometryType: GeometryType | null = null,
  ) {
    const layer = await api.createLayer({
      name,
      color,
      borderColor,
      sortOrder: store().layers.length,
      geometryType,
    });
    store().upsertLayer(layer);
    this.addGeomanLayer(layer, false); // added as display, then promoted
    await this.setActiveLayer(layer.id);
    return layer;
  }

  /**
   * Reorder layers from the layer panel. `orderedIds[0]` is the top of the
   * stack (rendered above the rest). Restacks the map's render layers, updates
   * the store order + each layer's `sortOrder`, and persists.
   */
  async reorderLayers(orderedIds: string[]) {
    const byId = new Map(store().layers.map((l) => [l.id, l]));
    const reordered = orderedIds
      .map((id, i) => {
        const l = byId.get(id);
        return l ? { ...l, sortOrder: i } : null;
      })
      .filter((l): l is LayerDTO => l !== null);

    store().setLayers(reordered);
    this.restackLayers(orderedIds);
    await Promise.all(reordered.map((l) => api.updateLayer(l.id, { sortOrder: l.sortOrder })));
  }

  /**
   * Re-stack the data layers so `orderedTopFirst[0]` renders on top. Delegates
   * to the engine (maplibre-geoman-pro >= 0.9.2-alpha.2), which owns the
   * render-group (fill/line/circle) and data-layer-band semantics — previously
   * an app-side `map.moveLayer` loop here.
   */
  private restackLayers(orderedTopFirst: string[]) {
    this.gm.dataLayers.reorder(orderedTopFirst);
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
    this.gm.dataLayers.setStyle(layer.id, compileStyle(updated));
    await api.updateLayer(layer.id, { color, borderColor });
  }

  /** Apply + persist a layer's presentation config: thematic symbology
   *  (categorized/graduated fill), attribute labels, and definition query. */
  async setLayerStyle(layer: LayerDTO, style: LayerStyleConfig | null) {
    const filterChanged =
      JSON.stringify(layer.style?.filter ?? null) !== JSON.stringify(style?.filter ?? null);
    const updated = { ...layer, style };
    store().upsertLayer(updated);
    this.gm.dataLayers.setStyle(layer.id, compileStyle(updated));
    // The filter changes which features render — re-push the (filtered) data.
    if (filterChanged) this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
    await api.updateLayer(layer.id, { style });
  }

  async deleteLayer(layer: LayerDTO) {
    await this.gm.dataLayers.remove(layer.id); // async: clears the featureStore
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
    const dtos = await Promise.all(
      fc.features
        .filter((f) => f.geometry)
        .map((f) => {
          const id = crypto.randomUUID();
          const shape = inferShape(f.geometry);
          const metadata = stringProps(f.properties);
          const geojson = {
            ...f,
            id,
            properties: { ...(f.properties ?? {}), id, shape, metadata },
          } as Feature;
          return api.upsertFeature({ id, layerId, shape, geojson, metadata });
        }),
    );
    for (const dto of dtos) store().upsertFeature(dto);
    this.gm.dataLayers.setData(layerId, geoJsonFor(layerId));
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
    const map = this.map();
    map.fitBounds(bounds, { padding: 96, maxZoom, duration: 600 });
  }

  // --- Behaviour config (settings modal) -----------------------------------

  private config: Config = DEFAULT_CONFIG;
  private hoverHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
  private clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  /** Fly the map to a coordinate (locator / geocoder result). */
  flyTo(lng: number, lat: number, zoom = 14) {
    this.map().flyTo({ center: [lng, lat], zoom, duration: 800 });
  }

  /** Switch the raster basemap in place, or hide it (`null`). Only swaps the
   *  basemap source's tiles, so the Geoman editing layers are never disturbed. */
  setBasemap(tiles: string | null) {
    const map = this.map();
    const layerId = 'osm-tiles-layer';
    if (!map.getLayer(layerId)) return;
    if (tiles === null) {
      map.setLayoutProperty(layerId, 'visibility', 'none');
      return;
    }
    map.setLayoutProperty(layerId, 'visibility', 'visible');
    (map.getSource('osm-tiles') as maplibregl.RasterTileSource | undefined)?.setTiles?.([tiles]);
  }

  private map() {
    return this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;
  }

  /** Render-layer ids of every data layer (for queryRenderedFeatures). */
  private dataLayerRenderIds(): string[] {
    return (this.map().getStyle().layers ?? [])
      .filter((l) => (l as { source?: string }).source?.startsWith(SOURCE_PREFIX))
      .map((l) => l.id);
  }

  /** Apply the persisted behaviour config — runtime edit options + the hover /
   *  cross-layer-select map handlers. Safe to call repeatedly. */
  applyConfig(config: Config) {
    this.config = config;
    const settings = this.gm.options.controls?.edit?.change?.settings as
      | { editSelectedOnly?: boolean; bodyDragEnabled?: boolean }
      | undefined;
    if (settings) {
      settings.editSelectedOnly = config.editSelectedOnly;
      settings.bodyDragEnabled = config.bodyDrag;
    }
    // Engine-wide settings (read live by the snapping helper / create-update gates).
    const top = this.gm.options.settings as { snapDistance?: number; validateSchema?: boolean };
    top.snapDistance = config.snapTolerance;
    top.validateSchema = config.validateSchema;

    this.setHoverCursor(config.hoverCursor);
    this.setCrossLayerSelect(config.crossLayerSelect);
    // The engine's mode enable/disable is async; firing several at once races.
    // Queue them so each runs to completion and the latest config wins.
    this.helperQueue = this.helperQueue.then(() => this.applyHelpers(config));
  }

  private helperQueue: Promise<void> = Promise.resolve();

  /** Sequentially bring the background helper modes to their configured state. */
  private async applyHelpers(config: Config) {
    const desired: Array<['snapping' | 'measurements' | 'pin' | 'auto_trace', boolean]> = [
      ['snapping', config.snapping],
      ['measurements', config.measurements],
      ['pin', config.topology],
      ['auto_trace', config.tracing],
    ];
    for (const [name, on] of desired) {
      if (this.gm.options.isModeEnabled('helper', name) === on) continue;
      await (on ? this.gm.enableMode('helper', name) : this.gm.disableMode('helper', name));
    }
  }

  private setHoverCursor(on: boolean) {
    const map = this.map();
    if (this.hoverHandler) {
      map.off('mousemove', this.hoverHandler);
      this.hoverHandler = null;
      map.getCanvas().style.cursor = '';
    }
    if (!on) return;
    this.hoverHandler = (e) => {
      const ids = this.dataLayerRenderIds();
      const hits = ids.length ? map.queryRenderedFeatures(e.point, { layers: ids }) : [];
      const hit = hits.find(
        (h) =>
          this.config.crossLayerSelect ||
          layerIdFromSource(String(h.source)) === store().activeLayerId,
      );
      map.getCanvas().style.cursor = hit ? 'move' : '';
    };
    map.on('mousemove', this.hoverHandler);
  }

  private setCrossLayerSelect(on: boolean) {
    const map = this.map();
    if (this.clickHandler) {
      map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (!on) return;
    this.clickHandler = (e) => {
      const ids = this.dataLayerRenderIds();
      if (!ids.length) return;
      const hit = map.queryRenderedFeatures(e.point, { layers: ids }).find((h) => {
        const lid = layerIdFromSource(String(h.source));
        return lid && lid !== store().activeLayerId;
      });
      if (!hit) return;
      const layerId = layerIdFromSource(String(hit.source));
      const featureId = String(hit.properties?.id ?? '');
      if (!layerId || !featureId) return;
      void this.setActiveLayer(layerId).then(() => {
        this.gm.features.setSelection([featureId]);
        store().setSelectedFeature(featureId);
      });
    };
    map.on('click', this.clickHandler);
  }

  async reset() {
    this.setHoverCursor(false);
    this.setCrossLayerSelect(false);
    await Promise.all(store().layers.map((layer) => this.gm.dataLayers.remove(layer.id)));
  }
}

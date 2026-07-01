'use client';

import type {
  DataLayerStyle,
  FeatureData,
  Geoman,
  StyleValue,
} from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useArrayConfig } from '@/hooks/useArrayConfig';
import { DEFAULT_CONFIG, type Config } from '@/hooks/useConfig';
import { findFeature, readFeatureData } from '@/lib/geoman/featureSync';
import { featureBounds, inferShape, stringProps, translateGeometry } from '@/lib/io';
import { fillExpression, matchesFilter } from '@/lib/symbology';
import type { Basemap } from '@/lib/basemaps';
import { LAYER_NAMES } from '@/lib/solar/domain';
import { simplifyFeature } from '@/lib/simplify';
import {
  MODULES_LAYER,
  OBSTRUCTIONS_LAYER,
  PLACEABLE_LAYER,
  ROOF_LAYER,
  inToM,
} from '@/lib/solar/domain';
import { MODULES } from '@/lib/solar/modules';
import { buildSeedProject } from '@/lib/solar/seed';
import { layoutPanels } from '@/lib/solar/layout';
import { placeableArea } from '@/lib/solar/setback';
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

/** A LayerDTO's presentation as a Geoman data-layer style. */
const compileStyle = (layer: LayerDTO): DataLayerStyle => {
  const sym = layer.style?.symbology;
  const fill =
    sym && sym.mode !== 'single' ? (fillExpression(sym) as StyleValue<string>) : undefined;
  const labels = layer.style?.labels;
  return {
    polygon: {
      fillColor: fill ?? layer.color,
      fillOpacity: 0.35,
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

const newFeature = (
  layerId: string,
  shape: string,
  geometry: Feature['geometry'],
  metadata: Record<string, string>,
): FeatureDTO => {
  const id = crypto.randomUUID();
  return {
    id,
    layerId,
    shape,
    geojson: { type: 'Feature', id, geometry, properties: { id, shape, metadata } },
    metadata,
  };
};

/**
 * Glue between the localStorage-backed store and Geoman's `dataLayers` engine.
 * Each app layer is a native, editable Geoman data layer; the store is the
 * single source of truth and persists itself (no backend).
 */
export class EditorController {
  constructor(private gm: Geoman) {}

  private wired = false;

  async hydrate() {
    await this.load();
    // Map event handlers are global + must be wired exactly once.
    if (!this.wired) {
      this.wireEvents();
      this.wired = true;
    }
    // Panels/obstructions are geofenced to stay on a roof plane.
    void this.enableGeofencing();
    store().setHydrated(true);
  }

  /** Load the project from the (persisted) store, or seed a sample roof. */
  private async load() {
    const fresh = store().layers.length === 0;
    if (fresh) {
      const seed = buildSeedProject();
      store().setLayers(seed.layers);
      store().setFeatures(seed.features);
    }
    await this.register();
    // On a fresh project, auto-fill the roof so the array + summary show at once.
    if (fresh) await this.autoLayoutAll();
  }

  /** Register every store layer with Geoman and frame the project. */
  private async register() {
    const layers = store().layers;
    // The Roof Planes layer is where the user works by default.
    const active = layers.find((l) => l.name === ROOF_LAYER) ?? layers[0] ?? null;
    for (const layer of layers) {
      this.addGeomanLayer(layer, layer.id === active?.id);
    }
    this.restackLayers(layers.map((l) => l.id));
    if (active) await this.gm.dataLayers.setActive(active.id);
    store().setActiveLayer(active?.id ?? null);
    this.zoomToAll();
  }

  /** Wipe the project and re-seed the sample roof. */
  async resetToSample() {
    store().setSelectedFeature(null);
    await Promise.all(store().layers.map((l) => this.gm.dataLayers.remove(l.id)));
    const seed = buildSeedProject();
    store().setLayers(seed.layers);
    store().setFeatures(seed.features);
    await this.register();
    await this.autoLayoutAll();
  }

  private wireEvents() {
    const map = this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;

    map.on('gm:create', (e: { feature: FeatureData; shape?: string }) => {
      const layerId = layerIdFromSource(e.feature.source.id) ?? store().activeLayerId;
      if (!layerId) return;
      const read = readFeatureData(e.feature);
      store().upsertFeature({
        id: read.id,
        layerId,
        shape: e.shape ?? read.shape,
        geojson: read.geojson,
        metadata: read.metadata,
      });
      store().setSelectedFeature(read.id);
      this.syncGeofencing(); // a new roof plane joins the containment set
    });

    const onUpdate = (e: { feature?: FeatureData; features?: FeatureData[] }) => {
      for (const fd of e.feature ? [e.feature] : (e.features ?? [])) {
        const read = readFeatureData(fd);
        const existing = store().features[read.id];
        if (!existing) continue;
        // Geometry edits don't change attributes — keep the existing metadata.
        store().upsertFeature({
          ...existing,
          geojson: read.geojson,
          shape: read.shape ?? existing.shape,
        });
      }
    };
    for (const ev of ['gm:editend', 'gm:dragend', 'gm:rotateend', 'gm:scaleend', 'gm:cut'] as const) {
      map.on(ev, onUpdate);
    }

    map.on('gm:remove', (e: { feature: FeatureData }) => {
      const id = String(e.feature.id);
      if (store().features[id]) store().removeFeature(id);
      this.syncGeofencing(); // a removed roof plane leaves the containment set
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

  /** Paste the clipboard geometry as a new feature in the active layer. */
  paste() {
    const clip = store().clipboard as Feature | null;
    const layerId = store().activeLayerId;
    if (!clip?.geometry || !layerId) return;
    const dto = newFeature(layerId, inferShape(clip.geometry), translateGeometry(clip.geometry, 0.00005, -0.00005), {});
    store().upsertFeature(dto);
    this.gm.dataLayers.setData(layerId, geoJsonFor(layerId));
    store().setSelectedFeature(dto.id);
  }

  /** Explode the selected multipolygon into separate single-part features. */
  async explodeSelected() {
    const id = store().selectedFeatureId;
    if (id) await this.gm.edit.explode(id);
  }

  /** Simplify the selected line/polygon (whole-feature, conservative tolerance). */
  async simplifySelected() {
    const id = store().selectedFeatureId;
    if (!id) return;
    const fd = findFeature(this.gm, id);
    const row = store().features[id];
    if (!fd || !row) return;
    await fd.updateGeometry(simplifyFeature(row.geojson).geometry as never);
    store().upsertFeature({ ...row, geojson: readFeatureData(fd).geojson });
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
    this.applyZoomRange(layer);
  }

  /** Apply a layer's scale-dependent (zoom) visibility to its render layers. */
  private applyZoomRange(layer: LayerDTO) {
    const min = layer.style?.minZoom ?? 0;
    const max = layer.style?.maxZoom ?? 24;
    const map = this.map();
    const sourceId = `${SOURCE_PREFIX}${layer.id}`;
    for (const l of map.getStyle().layers ?? []) {
      if ((l as { source?: string }).source === sourceId) map.setLayerZoomRange(l.id, min, max);
    }
  }

  /** Set a layer's attribute schema (typed fields). */
  setLayerSchema(layer: LayerDTO, schema: LayerSchema | null) {
    store().upsertLayer({ ...layer, schema });
    this.gm.dataLayers.setSchema(layer.id, (schema ?? { fields: [] }) as never);
  }

  /** Validate a metadata map against the layer's schema via the engine. */
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

    if (prev) await this.gm.dataLayers.setEditable(prev, false);
    await this.gm.dataLayers.setEditable(id, true);
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
    const layer: LayerDTO = {
      id: crypto.randomUUID(),
      name,
      color,
      borderColor,
      visible: true,
      sortOrder: store().layers.length,
      schema: null,
      style: null,
      geometryType,
    };
    store().upsertLayer(layer);
    this.addGeomanLayer(layer, false); // added as display, then promoted
    await this.setActiveLayer(layer.id);
    return layer;
  }

  /** Reorder layers (orderedIds[0] = top of the stack). */
  reorderLayers(orderedIds: string[]) {
    const byId = new Map(store().layers.map((l) => [l.id, l]));
    const reordered = orderedIds
      .map((id, i) => {
        const l = byId.get(id);
        return l ? { ...l, sortOrder: i } : null;
      })
      .filter((l): l is LayerDTO => l !== null);

    store().setLayers(reordered);
    this.restackLayers(orderedIds);
  }

  private restackLayers(orderedTopFirst: string[]) {
    this.gm.dataLayers.reorder(orderedTopFirst);
  }

  toggleVisibility(layer: LayerDTO) {
    const next = !layer.visible;
    store().upsertLayer({ ...layer, visible: next });
    this.gm.dataLayers.setVisibility(layer.id, next);
  }

  applyColors(layer: LayerDTO, color: string, borderColor: string) {
    const updated = { ...layer, color, borderColor };
    store().upsertLayer(updated);
    this.gm.dataLayers.setStyle(layer.id, compileStyle(updated));
  }

  /** Apply a layer's presentation config (symbology / labels / filter / zoom). */
  setLayerStyle(layer: LayerDTO, style: LayerStyleConfig | null) {
    const filterChanged =
      JSON.stringify(layer.style?.filter ?? null) !== JSON.stringify(style?.filter ?? null);
    const updated = { ...layer, style };
    store().upsertLayer(updated);
    this.gm.dataLayers.setStyle(layer.id, compileStyle(updated));
    this.applyZoomRange(updated);
    if (filterChanged) this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
  }

  async deleteLayer(layer: LayerDTO) {
    await this.gm.dataLayers.remove(layer.id);
    store().removeLayer(layer.id);
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
  }

  // --- Rooftop solar -------------------------------------------------------

  /** A layer by its (well-known) name — the bridge to the solar domain. */
  layerByName(name: string): LayerDTO | undefined {
    return store().layers.find((l) => l.name === name);
  }

  /** Features in a named layer. */
  private featuresInLayer(name: string): FeatureDTO[] {
    const layer = this.layerByName(name);
    return layer ? featuresOf(layer.id) : [];
  }

  /** All roof-plane features. */
  roofPlanes(): FeatureDTO[] {
    return this.featuresInLayer(ROOF_LAYER);
  }

  /** A stable identity for a roof plane (its name, falling back to its id). */
  private roofKey(roof: FeatureDTO): string {
    return roof.metadata.name || roof.id;
  }

  /**
   * Generate (or regenerate) the placeable area of a roof — the plane inset by
   * the fire setback, minus the obstructions — into the Setback Area layer.
   * Returns the created feature, or null if nothing is placeable.
   */
  generatePlaceable(roofFeatureId: string): FeatureDTO | null {
    const roof = store().features[roofFeatureId];
    const layer = this.layerByName(PLACEABLE_LAYER);
    if (!roof || !layer) return null;
    const cfg = useArrayConfig.getState();
    const area = placeableArea(roof.geojson as Feature, inToM(cfg.setbackIn), this.obstructionFeatures().map((f) => f.geojson as Feature));
    if (!area) return null;

    const key = this.roofKey(roof);
    for (const p of featuresOf(layer.id).filter((f) => f.metadata.roof === key)) {
      store().removeFeature(p.id);
    }
    const dto = newFeature(layer.id, 'polygon', area.geometry, {
      roof: key,
      setback_in: String(cfg.setbackIn),
    });
    store().upsertFeature(dto);
    this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
    return dto;
  }

  private obstructionFeatures(): FeatureDTO[] {
    return this.featuresInLayer(OBSTRUCTIONS_LAYER);
  }

  /** Remove the PV modules of one roof (or all if no roof given). */
  clearArray(roofFeatureId?: string) {
    const layer = this.layerByName(MODULES_LAYER);
    if (!layer) return;
    const key = roofFeatureId ? this.roofKey(store().features[roofFeatureId]) : null;
    for (const p of featuresOf(layer.id)) {
      if (!key || p.metadata.roof === key) store().removeFeature(p.id);
    }
    this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
  }

  /**
   * Auto-lay out PV modules on a roof plane: tile its placeable area (inset by
   * the fire setback, minus obstructions) with module rectangles aligned to the
   * roof's azimuth, using the current array settings. Replaces any existing
   * array on that roof. Returns the panel count.
   */
  autoLayout(roofFeatureId: string): number {
    const roof = store().features[roofFeatureId];
    const modulesLayer = this.layerByName(MODULES_LAYER);
    if (!roof || !modulesLayer) return 0;

    const cfg = useArrayConfig.getState();
    const mod = MODULES.find((m) => m.id === cfg.moduleId) ?? MODULES[0];
    const azimuth = Number(roof.metadata.azimuth);
    const panels = layoutPanels(roof.geojson as Feature, {
      module: mod,
      orientation: cfg.orientation,
      setbackM: inToM(cfg.setbackIn),
      rowGapM: inToM(cfg.rowGapIn),
      colGapM: inToM(cfg.colGapIn),
      azimuthDeg: Number.isFinite(azimuth) ? azimuth : 180,
      obstructions: this.obstructionFeatures().map((f) => f.geojson as Feature),
    });

    const key = this.roofKey(roof);
    for (const p of featuresOf(modulesLayer.id).filter((f) => f.metadata.roof === key)) {
      store().removeFeature(p.id);
    }
    panels.forEach((geom, i) => {
      const metadata = {
        roof: key,
        module: mod.name,
        watts: String(mod.watts),
        orientation: cfg.orientation,
        index: String(i + 1),
      };
      store().upsertFeature(newFeature(modulesLayer.id, 'polygon', geom, metadata));
    });
    this.gm.dataLayers.setData(modulesLayer.id, geoJsonFor(modulesLayer.id));
    return panels.length;
  }

  /** Auto-lay out every roof plane. Returns the total panel count. */
  async autoLayoutAll(): Promise<number> {
    let total = 0;
    for (const roof of this.roofPlanes()) total += this.autoLayout(roof.id);
    return total;
  }

  /** Import a GeoJSON FeatureCollection into a layer (persist + render). */
  importGeoJson(layerId: string, fc: FeatureCollection) {
    for (const f of fc.features) {
      if (!f.geometry) continue;
      store().upsertFeature(newFeature(layerId, inferShape(f.geometry), f.geometry, stringProps(f.properties)));
    }
    this.gm.dataLayers.setData(layerId, geoJsonFor(layerId));
  }

  /** Export the whole project as a GeoJSON FeatureCollection. */
  exportGeoJson(): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: Object.values(store().features).map((f) => toGeoJson(f, this.layerById(f.layerId)?.schema)),
    };
  }

  private layerById(id: string): LayerDTO | undefined {
    return store().layers.find((l) => l.id === id);
  }

  /** Fit the map to a feature's bounds. */
  zoomToFeature(id: string) {
    const f = store().features[id];
    if (!f) return;
    this.fit(featureBounds(f.geojson as Feature), 20);
  }

  /** Fit the map to every feature. */
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
    this.fit(b, 20);
  }

  private fit(bounds: [[number, number], [number, number]] | null, maxZoom: number) {
    if (!bounds) return;
    this.map().fitBounds(bounds, { padding: 80, maxZoom, duration: 600 });
  }

  // --- Behaviour config (settings modal) -----------------------------------

  private config: Config = DEFAULT_CONFIG;
  private hoverHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
  private clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  /** Fly the map to a coordinate (locator / geocoder result). */
  flyTo(lng: number, lat: number, zoom = 18) {
    this.map().flyTo({ center: [lng, lat], zoom, duration: 800 });
  }

  /** Switch the raster basemap, or hide it (`tiles: null`). The source is
   *  re-created (not just `setTiles`) so each basemap keeps its own `maxzoom` —
   *  MapLibre then overzooms/enlarges past that instead of blanking, letting you
   *  zoom deep onto a roof on satellite. The layer has no maxzoom and is kept at
   *  the bottom of the stack, beneath every Geoman data/edit layer. */
  setBasemap(basemap: Basemap) {
    const map = this.map();
    const SRC = 'osm-tiles';
    const LYR = 'osm-tiles-layer';
    if (map.getLayer(LYR)) map.removeLayer(LYR);
    if (map.getSource(SRC)) map.removeSource(SRC);
    if (basemap.tiles === null) return; // "None" — leave the basemap removed
    map.addSource(SRC, {
      type: 'raster',
      tiles: [basemap.tiles],
      tileSize: 256,
      maxzoom: basemap.maxzoom ?? 19,
      ...(basemap.attribution ? { attribution: basemap.attribution } : {}),
    });
    // Insert beneath the current bottom-most layer so the basemap stays under
    // all Geoman layers (bottom is undefined only for an otherwise-empty style).
    const bottom = map.getStyle().layers?.[0]?.id;
    map.addLayer({ id: LYR, type: 'raster', source: SRC, minzoom: 0 }, bottom);
  }

  private geofencingWired = false;

  /** Roof-containment geofencing: panels and obstructions can't be drawn or
   *  dragged off a roof plane — the roof planes are the containment set. */
  async enableGeofencing() {
    await this.syncGeofencing();
    if (this.geofencingWired) return;
    this.geofencingWired = true;
    this.map().on('gm:geofencing_violation', () => {
      store().setNotice('Keep it on a roof plane — blocked by geofencing.');
    });
  }

  /** Point the geofencing containment set at the current roof planes via the
   *  public `gm.geofencing` API — it resolves the ids to live features, so a
   *  reshaped roof updates the constraint automatically. */
  syncGeofencing() {
    const roofLayerId = store().layers.find((l) => l.name === LAYER_NAMES.roof)?.id ?? null;
    const roofIds = roofLayerId
      ? Object.values(store().features)
          .filter((f) => f.layerId === roofLayerId)
          .map((f) => f.id)
      : [];
    return this.gm.geofencing.setContainment(roofIds);
  }

  /** Current map center as `{ lat, lng }` — the site used for solar geometry. */
  mapCenter(): { lat: number; lng: number } {
    const c = this.map().getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  /** Subscribe to map move end (recompute sun geometry for the new site).
   *  Returns an unsubscribe. */
  onMapMoveEnd(cb: () => void): () => void {
    const map = this.map();
    map.on('moveend', cb);
    return () => map.off('moveend', cb);
  }

  private map() {
    return this.gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;
  }

  private dataLayerRenderIds(): string[] {
    return (this.map().getStyle().layers ?? [])
      .filter((l) => (l as { source?: string }).source?.startsWith(SOURCE_PREFIX))
      .map((l) => l.id);
  }

  /** Apply the persisted behaviour config. Safe to call repeatedly. */
  applyConfig(config: Config) {
    this.config = config;
    const settings = this.gm.options.controls?.edit?.change?.settings as
      | { editSelectedOnly?: boolean; bodyDragEnabled?: boolean }
      | undefined;
    if (settings) {
      settings.editSelectedOnly = config.editSelectedOnly;
      settings.bodyDragEnabled = config.bodyDrag;
    }
    const top = this.gm.options.settings as { snapDistance?: number; validateSchema?: boolean };
    top.snapDistance = config.snapTolerance;
    top.validateSchema = config.validateSchema;

    this.setHoverCursor(config.hoverCursor);
    this.setCrossLayerSelect(config.crossLayerSelect);
    this.helperQueue = this.helperQueue.then(() => this.applyHelpers(config));
  }

  private helperQueue: Promise<void> = Promise.resolve();

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

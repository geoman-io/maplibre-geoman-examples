import type { DataLayerStyle, FeatureData, Geoman, StyleValue } from '@geoman-io/maplibre-geoman-pro';
import type maplibregl from 'maplibre-gl';
import type { Feature as GeoFeature, Geometry } from 'geojson';
import { useEditorStore } from './store';
import { clearProject, loadProject, saveProject } from '../storage';
import type { Feature, Layer, LayerSchema, Project } from './types';

const store = () => useEditorStore.getState();
const SOURCE_PREFIX = 'gm_dl_';
const layerIdFromSource = (s: string) => (s.startsWith(SOURCE_PREFIX) ? s.slice(SOURCE_PREFIX.length) : null);

const featuresOf = (layerId: string) => Object.values(store().features).filter((f) => f.layerId === layerId);

const coerce = (metadata: Record<string, string>, schema?: LayerSchema | null): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...metadata };
  for (const f of schema?.fields ?? []) {
    const raw = metadata[f.name];
    if (raw == null || raw === '') continue;
    out[f.name] = f.type === 'number' || f.type === 'integer' ? Number(raw) : f.type === 'boolean' ? raw === 'true' : raw;
  }
  return out;
};

const toGeoJson = (row: Feature, schema?: LayerSchema | null): GeoFeature => ({
  ...(row.geojson as GeoFeature),
  id: row.id,
  properties: {
    ...((row.geojson as GeoFeature).properties ?? {}),
    ...coerce(row.metadata, schema),
    id: row.id,
    ...(row.shape ? { shape: row.shape } : {}),
    metadata: row.metadata,
  },
});

const geoJsonFor = (layerId: string): GeoFeature[] => {
  const layer = store().layers.find((l) => l.id === layerId);
  return featuresOf(layerId).map((r) => toGeoJson(r, layer?.schema));
};

const compileStyle = (layer: Layer): DataLayerStyle => {
  const fill = layer.categorical
    ? ({
        categorical: {
          field: layer.categorical.field,
          categories: layer.categorical.colors,
          fallback: layer.categorical.fallback,
        },
      } as StyleValue<string>)
    : undefined;
  return {
    polygon: { fillColor: fill ?? layer.color, fillOpacity: 0.4, strokeColor: layer.borderColor, strokeWidth: 2 },
    line: { color: layer.borderColor, width: 3 },
    point: { color: fill ?? layer.color, radius: 6, strokeColor: layer.borderColor, strokeWidth: 2 },
    ...(layer.label?.field
      ? {
          label: {
            field: layer.label.field,
            ...(layer.label.size ? { size: layer.label.size } : {}),
            ...(layer.label.color ? { color: layer.label.color } : {}),
            ...(layer.label.haloColor ? { haloColor: layer.label.haloColor } : {}),
          },
        }
      : {}),
  };
};

const readFeatureData = (fd: FeatureData) => {
  const geojson = fd.getGeoJson() as unknown as GeoFeature;
  const props = (geojson.properties ?? {}) as Record<string, unknown>;
  return {
    id: String(fd.id),
    shape: (props.shape as string | undefined) ?? geojson.geometry?.type ?? null,
    geojson,
    metadata: (props.metadata as Record<string, string> | undefined) ?? {},
  };
};

/**
 * Shared editor engine: wires Geoman's data-layer + edit engine to the
 * localStorage-backed store, and exposes the primitives the per-vertical custom
 * toolbars / sidebars call. One instance per mounted vertical.
 */
export class EditorController {
  private wired = false;
  private map: maplibregl.Map;
  private pickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  constructor(
    private gm: Geoman,
    private verticalId: string,
    private seed: () => Project,
    private helpers: string[] = [],
    private activeLayerName?: string,
  ) {
    this.map = gm.mapAdapter.getMapInstance() as unknown as maplibregl.Map;
  }

  // --- lifecycle ---------------------------------------------------------
  async hydrate() {
    const project = loadProject(this.verticalId) ?? this.seed();
    store().setLayers(project.layers);
    store().setFeatures(project.features);
    await this.register();
    for (const h of this.helpers) this.gm.enableMode('helper', h as never);
    if (!this.wired) {
      this.wireEvents();
      this.wired = true;
    }
    store().setHydrated(true);
  }

  private async register() {
    const layers = store().layers;
    const active = layers.find((l) => l.name === this.activeLayerName) ?? layers[0] ?? null;
    for (const layer of layers) this.addGeomanLayer(layer, layer.id === active?.id);
    this.gm.dataLayers.reorder(layers.map((l) => l.id));
    if (active) await this.gm.dataLayers.setActive(active.id);
    store().setActiveLayer(active?.id ?? null);
    this.zoomToAll();
  }

  async resetToSample() {
    store().setSelectedFeature(null);
    clearProject(this.verticalId);
    await Promise.all(store().layers.map((l) => this.gm.dataLayers.remove(l.id)));
    const project = this.seed();
    store().setLayers(project.layers);
    store().setFeatures(project.features);
    await this.register();
    for (const h of this.helpers) this.gm.enableMode('helper', h as never);
    this.persist();
  }

  private addGeomanLayer(layer: Layer, editable: boolean) {
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

  private persist() {
    const project: Project = { layers: store().layers, features: Object.values(store().features) };
    saveProject(this.verticalId, project);
  }

  private wireEvents() {
    this.map.on('gm:create', (e: { feature: FeatureData; shape?: string }) => {
      const layerId = layerIdFromSource(e.feature.source.id) ?? store().activeLayerId;
      if (!layerId) return;
      const read = readFeatureData(e.feature);
      store().upsertFeature({ id: read.id, layerId, shape: e.shape ?? read.shape, geojson: read.geojson, metadata: read.metadata });
      store().setSelectedFeature(read.id);
      this.persist();
    });

    const onUpdate = (e: { feature?: FeatureData; features?: FeatureData[] }) => {
      for (const fd of e.feature ? [e.feature] : (e.features ?? [])) {
        const read = readFeatureData(fd);
        const existing = store().features[read.id];
        if (!existing) continue;
        store().upsertFeature({ ...existing, geojson: read.geojson, shape: read.shape ?? existing.shape });
      }
      this.persist();
    };
    for (const ev of ['gm:editend', 'gm:dragend', 'gm:rotateend', 'gm:scaleend', 'gm:cut'] as const) this.map.on(ev, onUpdate);

    this.map.on('gm:remove', (e: { feature: FeatureData }) => {
      const id = String(e.feature.id);
      if (store().features[id]) store().removeFeature(id);
      this.persist();
    });

    this.map.on('gm:selection', (e: { selection: Array<string | number> }) => {
      const id = e.selection[0];
      store().setSelectedFeature(id != null ? String(id) : null);
    });

    this.map.on('gm:history', (e: { canUndo: boolean; canRedo: boolean }) => store().setHistory(e.canUndo, e.canRedo));
  }

  // --- layers ------------------------------------------------------------
  layerByName(name: string): Layer | undefined {
    return store().layers.find((l) => l.name === name);
  }

  featuresInLayer(name: string): Feature[] {
    const l = this.layerByName(name);
    return l ? featuresOf(l.id) : [];
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

  async setActiveLayerByName(name: string) {
    const l = this.layerByName(name);
    if (l) await this.setActiveLayer(l.id);
  }

  toggleVisibility(layer: Layer) {
    const next = !layer.visible;
    store().upsertLayer({ ...layer, visible: next });
    this.gm.dataLayers.setVisibility(layer.id, next);
    this.persist();
  }

  // --- tools -------------------------------------------------------------
  setActiveTool(t: { key: string; title: string } | null) {
    store().setActiveTool(t);
  }
  async disableAllModes() {
    this.cancelPick();
    await this.gm.disableAllModes();
  }
  /** Set the active (draw target) layer, then start drawing a shape. */
  async drawInto(layerName: string, shape: string) {
    await this.setActiveLayerByName(layerName);
    await this.gm.disableAllModes();
    this.gm.enableDraw(shape as never);
  }
  enableEditVertices() {
    return this.gm.enableGlobalEditMode();
  }
  enableDrag() {
    return this.gm.enableGlobalDragMode();
  }
  enableEdit(name: string) {
    return this.gm.enableMode('edit', name as never);
  }
  undo() {
    return this.gm.history.undo();
  }
  redo() {
    return this.gm.history.redo();
  }
  async deleteSelected() {
    const id = store().selectedFeatureId;
    if (!id) return;
    let fd: FeatureData | null = null;
    this.gm.features.forEach((f) => {
      if (String(f.id) === id) fd = f;
    });
    if (fd) await this.gm.features.deleteAndNotify(fd);
  }

  // --- programmatic feature creation (domain actions) --------------------
  addFeature(layerName: string, geometry: Geometry, metadata: Record<string, string>, shape = 'polygon'): Feature | null {
    const layer = this.layerByName(layerName);
    if (!layer) return null;
    const id = crypto.randomUUID();
    const f: Feature = {
      id,
      layerId: layer.id,
      shape,
      geojson: { type: 'Feature', id, geometry, properties: { id, shape, metadata } },
      metadata,
    };
    store().upsertFeature(f);
    this.gm.dataLayers.setData(layer.id, geoJsonFor(layer.id));
    this.persist();
    return f;
  }

  async updateFeatureMetadata(id: string, metadata: Record<string, string>) {
    let fd: FeatureData | null = null;
    this.gm.features.forEach((f) => {
      if (String(f.id) === id) fd = f;
    });
    await (fd as FeatureData | null)?.updateProperties({ metadata });
    const f = store().features[id];
    if (f) {
      store().upsertFeature({ ...f, metadata });
      // Re-push so categorical fills / labels update on the rendered layer.
      this.gm.dataLayers.setData(f.layerId, geoJsonFor(f.layerId));
    }
    this.persist();
  }

  // --- one-shot map pick (domain click tools) ----------------------------
  private cancelPick() {
    if (this.pickHandler) this.map.off('click', this.pickHandler);
    this.pickHandler = null;
    this.map.getCanvas().style.cursor = '';
  }

  /** Next map click resolves the clicked lng/lat + the topmost hit feature id
   *  among the given layer names (if any). Returns a cancel fn. `loop` re-arms
   *  after each click (until a mode change cancels it). */
  pick(
    layerNames: string[],
    cb: (lngLat: [number, number], hitFeatureId: string | null) => void,
    loop = false,
  ): () => void {
    this.cancelPick();
    this.map.getCanvas().style.cursor = 'crosshair';
    this.pickHandler = (e) => {
      const renderIds = (this.map.getStyle().layers ?? [])
        .filter((l) => {
          const src = (l as { source?: string }).source ?? '';
          const lid = layerIdFromSource(src);
          const name = lid ? store().layers.find((x) => x.id === lid)?.name : null;
          return name != null && layerNames.includes(name);
        })
        .map((l) => l.id);
      const hit = renderIds.length ? this.map.queryRenderedFeatures(e.point, { layers: renderIds })[0] : undefined;
      const fid = hit ? String(hit.properties?.id ?? '') || null : null;
      if (!loop) this.cancelPick();
      cb([e.lngLat.lng, e.lngLat.lat], fid);
    };
    this.map.on('click', this.pickHandler);
    return () => this.cancelPick();
  }

  // --- view --------------------------------------------------------------
  zoomToFeature(id: string) {
    const f = store().features[id];
    if (f) this.fit(this.bounds(f.geojson.geometry), 20);
  }
  zoomToAll() {
    let b: [[number, number], [number, number]] | null = null;
    for (const f of Object.values(store().features)) {
      const fb = this.bounds(f.geojson.geometry);
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
  private bounds(geom: Geometry | null): [[number, number], [number, number]] | null {
    if (!geom) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number') {
        minX = Math.min(minX, c[0] as number);
        maxX = Math.max(maxX, c[0] as number);
        minY = Math.min(minY, c[1] as number);
        maxY = Math.max(maxY, c[1] as number);
      } else if (Array.isArray(c)) c.forEach(walk);
    };
    walk((geom as { coordinates?: unknown }).coordinates);
    return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null;
  }
  private fit(b: [[number, number], [number, number]] | null, maxZoom: number) {
    if (b) this.map.fitBounds(b, { padding: 60, maxZoom, duration: 500 });
  }

  async destroy() {
    if (this.pickHandler) this.map.off('click', this.pickHandler);
  }
}

import "./style.css";

import "maplibre-gl/dist/maplibre-gl.css";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";

import * as ml from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
// point it at one before creating a map. Vite serves the worker via the `?worker&url` query.
ml.setWorkerUrl(workerUrl);
import {
  GeoJsonImportFeature,
  Geoman,
  type GmOptionsPartial,
} from "@geoman-io/maplibre-geoman-free";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div id="dev-map"></div>
  </div>
`;

const mapLibreStyle: ml.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const map = new ml.Map({
  container: "dev-map",
  style: mapLibreStyle,
  center: [0, 51],
  zoom: 5,
});

const gmOptions: GmOptionsPartial = {
  // geoman options here
};

// create a new geoman instance
const geoman = new Geoman(map, gmOptions);

// callback when geoman is fully loaded
geoman.mapAdapter.on("gm:loaded", () => {
  console.log("Geoman fully loaded");

  // Here you can add your geojson shapes for example
  const pointFeature1: GeoJsonImportFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 51] },
    properties: {},
  };
  // add a geojson shape to the map
  geoman.features.importGeoJsonFeature(pointFeature1);

  const pointFeature2: GeoJsonImportFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [3, 52] },
    properties: {},
  };
  // geoman instance is also available on the map object
  geoman.features.importGeoJsonFeature(pointFeature2);
});

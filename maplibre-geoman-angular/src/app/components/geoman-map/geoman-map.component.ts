
import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';

import { Geoman, GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
import * as ml from 'maplibre-gl';

import { demoFeatures } from '../../fixtures/features';
import mapStyle from './style';

// MapLibre GL JS v6 no longer resolves its own web worker once bundled, so the app must
// point it at one before creating a map. `new URL(..., import.meta.url)` is the
// bundler-agnostic form (Turbopack/webpack/esbuild all resolve it).
ml.setWorkerUrl(
  new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href,
);

@Component({
    selector: 'app-geoman-map',
    imports: [],
    templateUrl: './geoman-map.component.html',
    styleUrls: ['./geoman-map.component.scss']
})
export class GeomanMapComponent implements OnInit {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLDivElement>;
  @Output() gmEvent = new EventEmitter<any>();

  ngOnInit() {
    if (!this.mapElement) {
      console.warn('Missing map element');
      return;
    }

    // Create MapLibre map
    const map = new ml.Map({
      container: this.mapElement.nativeElement,
      style: mapStyle,
      center: [0, 51],
      zoom: 5,
    });

    // Define Geoman options
    const gmOptions: GmOptionsPartial = {
      controls: {
        edit: {
          drag: { uiEnabled: true },
          change: { uiEnabled: true },
        },
      },
    };

    // Instantiate Geoman
    const geoman = new Geoman(map, gmOptions);
    const mapOn = geoman.mapAdapter.on.bind(geoman.mapAdapter) as unknown as (
      eventName: string,
      listener: (event: unknown) => void,
    ) => void;

    // Load some demo shapes
    const loadDevShapes = () => {
      demoFeatures.forEach(shapeGeoJson => {
        geoman.features.addGeoJsonFeature({
          shapeGeoJson,
          defaultSource: true,
        });
      });
      console.log('Shapes loaded', demoFeatures);
    };

    // Wait for geoman ready
    mapOn('gm:loaded', () => {
      console.log('Geoman fully loaded');
      loadDevShapes();

      // Enable a default draw tool
      geoman.enableDraw('line');
    });

    // Listen for all relevant Geoman events
    mapOn('gm:globaldrawmodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globaleditmodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globalremovemodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globalrotatemodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globaldragmodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globalcutmodetoggled', e => this.gmEvent.emit(e));
    mapOn('gm:globalsnappingmodetoggled', e => this.gmEvent.emit(e));

    // Create events
    mapOn('gm:create', e => this.gmEvent.emit(e));

    // Edit events
    mapOn('gm:editstart', e => this.gmEvent.emit(e));
    mapOn('gm:editend', e => this.gmEvent.emit(e));

    // Remove events
    mapOn('gm:remove', e => this.gmEvent.emit(e));

    // Rotate events
    mapOn('gm:rotatestart', e => this.gmEvent.emit(e));
    mapOn('gm:rotateend', e => this.gmEvent.emit(e));

    // Drag events
    mapOn('gm:dragstart', e => this.gmEvent.emit(e));
    mapOn('gm:dragend', e => this.gmEvent.emit(e));

    // Cut events
    mapOn('gm:cut', e => this.gmEvent.emit(e));

    // Helper & control
    mapOn('gm:helper', e => this.gmEvent.emit(e));
    mapOn('gm:control', e => this.gmEvent.emit(e));
  }
}

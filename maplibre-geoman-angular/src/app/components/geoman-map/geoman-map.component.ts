
import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';

import { Geoman, GmOptionsPartial } from '@geoman-io/maplibre-geoman-free';
import * as ml from 'maplibre-gl';

import { demoFeatures } from '../../fixtures/features';
import mapStyle from './style';

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
    ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
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
    geoman.mapAdapter.on('gm:loaded', () => {
      console.log('Geoman fully loaded');
      loadDevShapes();

      // Enable a default draw tool
      geoman.enableDraw('line');
    });

    // Listen for all relevant Geoman events
    geoman.mapAdapter.on('gm:globaldrawmodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globaleditmodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globaldeletemodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globalrotatemodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globaldragmodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globalcutmodetoggled', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:globalsnappingmodetoggled', e => this.gmEvent.emit(e));

    // Create events
    geoman.mapAdapter.on('gm:create', e => this.gmEvent.emit(e));

    // Edit events
    geoman.mapAdapter.on('gm:editstart', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:editend', e => this.gmEvent.emit(e));

    // Remove events
    geoman.mapAdapter.on('gm:remove', e => this.gmEvent.emit(e));

    // Rotate events
    geoman.mapAdapter.on('gm:rotatestart', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:rotateend', e => this.gmEvent.emit(e));

    // Drag events
    geoman.mapAdapter.on('gm:dragstart', e => this.gmEvent.emit(e));
    geoman.mapAdapter.on('gm:dragend', e => this.gmEvent.emit(e));

    // Cut events
    geoman.mapAdapter.on('gm:cut', e => this.gmEvent.emit(e));

    // Helper & control
  }
}

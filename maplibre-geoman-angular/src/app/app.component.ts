import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SidebarComponent } from './components/sidebar/sidebar.component';
import { GeomanMapComponent } from './components/geoman-map/geoman-map.component';

interface GmEvent {
  id?: string;
  enabled?: boolean;
  timestamp?: string;
  type?: string;
  shape?: string;
  geojson?: any;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    GeomanMapComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  gmEvents: GmEvent[] = [];

  handleGmEvent(event: any) {
    console.log(event);
    this.gmEvents.push({
      id: event.feature?.id ?? undefined,
      enabled: event.enabled ?? undefined,
      timestamp: new Date().toLocaleTimeString(),
      type: event.type,
      shape: event.shape ?? undefined,
      geojson: event.feature ? this.getGeoJson(event.feature) : undefined,
    });
  }

  getGeoJson(featureData: any) {
    try {
      return JSON.stringify(featureData.getGeoJson(), null, 2);
    } catch (e) {
      return "Can't retrieve GeoJSON";
    }
  }
}

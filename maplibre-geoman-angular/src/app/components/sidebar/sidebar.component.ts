import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef
} from '@angular/core';


interface GmEvent {
  id?: string;
  enabled?: boolean;
  timestamp?: string;
  type?: string;
  shape?: string;
  geojson?: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnChanges {
  @Input() gmEvents: GmEvent[] = [];
  @ViewChild('sidebarElement', { static: true })
  sidebarElement!: ElementRef<HTMLDivElement>;

  expandedGeojsonItem = -1;
  expandedFeatureId = '';

  constructor(hostEl: ElementRef<HTMLDivElement>) {
    this.sidebarElement = hostEl;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gmEvents'] && this.sidebarElement) {
      setTimeout(() => {
        this.sidebarElement.nativeElement.scrollTop =
          this.sidebarElement.nativeElement.scrollHeight;
      });
    }
  }

  toggleGeoJsonItem(index: number) {
    this.expandedGeojsonItem =
      (this.expandedGeojsonItem === index) ? -1 : index;
  }

  toggleFeatureGeoJson(id: string) {
    this.expandedFeatureId =
      (this.expandedFeatureId === id) ? '' : id;
  }
}

import type { FeatureData } from '@geoman-io/maplibre-geoman-free';


export interface GmEvent {
  feature?: FeatureData;
  enabled?: boolean;
  type: string;
  shape?: string;
  [key: string]: unknown;
}

export interface GmEventData {
  id?: string | number;
  enabled?: boolean;
  timestamp: string;
  type: string;
  shape?: string;
  geojson?: string;
}

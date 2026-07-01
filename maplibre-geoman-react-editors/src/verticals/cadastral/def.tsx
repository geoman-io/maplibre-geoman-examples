import { CommonIcons, svg } from '../../core/icons';
import { layerSpec, type VerticalDef } from '../../core/vertical';
import Sidebar from './Sidebar';
import Inspector from './Inspector';

export const LAND_USE: Record<string, string> = {
  residential: '#60a5fa',
  commercial: '#f87171',
  industrial: '#a78bfa',
  agricultural: '#84cc16',
  vacant: '#cbd5e1',
};
const opt = (...v: string[]) => v.map((value) => ({ value }));

const icons = {
  parcel: svg(<><path d="M4 5h16v14H4Z" /><path d="M12 5v14M4 12h8" /></>),
  easement: svg(<rect x="3" y="9" width="18" height="6" rx="1" strokeDasharray="3 2" />),
};

export const cadastral: VerticalDef = {
  id: 'cadastral',
  name: 'Cadastral',
  tagline: 'Parcels & subdivision',
  icon: icons.parcel,
  accent: 'from-emerald-500 to-teal-600',
  center: [-97.7405, 30.2705],
  zoom: 18,
  activeLayerName: 'Parcels',
  helpers: ['snapping', 'pin'], // snapping + topological shared boundaries
  layers: [
    layerSpec({
      key: 'easements', name: 'Easements', color: '#f59e0b', borderColor: '#b45309', geometryType: 'polygon',
      schema: { fields: [
        { name: 'type', type: 'enum', options: opt('utility', 'access', 'drainage') },
        { name: 'width_ft', type: 'number', label: 'width (ft)', min: 0 },
      ] },
    }),
    layerSpec({
      key: 'parcels', name: 'Parcels', color: '#60a5fa', borderColor: '#1e3a8a', geometryType: 'polygon',
      categorical: { field: 'landuse', colors: LAND_USE, fallback: '#cbd5e1' },
      label: { field: 'apn', size: 11, color: '#1e3a8a', haloColor: '#ffffff' },
      schema: { fields: [
        { name: 'apn', type: 'string', required: true, label: 'APN' },
        { name: 'owner', type: 'string' },
        { name: 'landuse', type: 'enum', label: 'land use', options: Object.keys(LAND_USE).map((v) => ({ value: v })) },
      ] },
    }),
  ],
  seed: ({ frame, feat }) => {
    const parcel = (x0: number, y0: number, x1: number, y1: number, m: Record<string, string>) => feat('parcels', frame.rect(x0, y0, x1, y1), m, 'polygon');
    parcel(0, 32, 40, 62, { apn: 'APN-001', owner: 'Rivera', landuse: 'residential' });
    parcel(40, 32, 80, 62, { apn: 'APN-002', owner: 'Chen', landuse: 'residential' });
    parcel(0, 0, 40, 30, { apn: 'APN-003', owner: 'City of Austin', landuse: 'vacant' });
    parcel(40, 0, 80, 30, { apn: 'APN-004', owner: 'Delgado LLC', landuse: 'commercial' });
    feat('easements', frame.rect(0, 30, 80, 32), { type: 'utility', width_ft: '10' }, 'polygon');
  },
  toolbar: [
    {
      name: 'Parcels',
      tools: [
        { id: 'parcel', icon: icons.parcel, title: 'Draw parcel', run: (c) => c.drawInto('Parcels', 'polygon') },
        { id: 'subdivide', icon: CommonIcons.split, title: 'Subdivide', hint: 'Subdivide — draw a line across a parcel to split it', run: (c) => c.enableEdit('split') },
        { id: 'consolidate', icon: CommonIcons.union, title: 'Consolidate', hint: 'Consolidate — click two adjoining parcels to merge', run: (c) => c.enableEdit('union') },
      ],
    },
    {
      name: 'Easements',
      tools: [
        { id: 'easement', icon: icons.easement, title: 'Draw easement', run: (c) => c.drawInto('Easements', 'polygon') },
        { id: 'carve', icon: CommonIcons.difference, title: 'Carve out', hint: 'Difference — subtract one polygon from another', run: (c) => c.enableEdit('difference') },
      ],
    },
    {
      name: 'Edit',
      tools: [
        { id: 'nodes', icon: CommonIcons.edit, title: 'Edit boundary', hint: 'Edit — shared boundaries move together (topology on)', run: (c) => c.enableEditVertices() },
        { id: 'move', icon: CommonIcons.move, title: 'Move', run: (c) => c.enableDrag() },
        { id: 'select', icon: CommonIcons.select, title: 'Select', run: (c) => c.enableEdit('select') },
        { id: 'delete', icon: CommonIcons.delete, title: 'Delete', needsSelection: true, run: (c) => c.deleteSelected() },
      ],
    },
  ],
  Sidebar,
  Inspector,
};

import type { Point } from 'geojson';
import { CommonIcons, svg } from '../../core/icons';
import { layerSpec, type VerticalDef } from '../../core/vertical';
import Sidebar from './Sidebar';
import Inspector from './Inspector';

const opt = (...v: string[]) => v.map((value) => ({ value }));

const icons = {
  main: svg(<><path d="M2 12h20" /><path d="M7 9v6M17 9v6" /></>),
  lateral: svg(<><path d="M3 6h7a4 4 0 0 1 4 4v10" /><path d="M14 10h7" /></>),
  valve: svg(<><path d="M5 7 12 12 5 17Z" /><path d="M19 7 12 12 19 17Z" /><path d="M12 5v2M12 17v2" /></>),
  hydrant: svg(<><rect x="9" y="6" width="6" height="12" rx="3" /><path d="M7 9h10M9 21h6M12 18v3" /></>),
};

export const utility: VerticalDef = {
  id: 'utility',
  name: 'Utility network',
  tagline: 'Water / pipe network',
  icon: icons.main,
  accent: 'from-sky-500 to-blue-600',
  center: [-97.7431, 30.2672],
  zoom: 18,
  activeLayerName: 'Mains',
  helpers: ['snapping'],
  layers: [
    layerSpec({
      key: 'valves', name: 'Valves', color: '#ef4444', borderColor: '#991b1b', geometryType: 'point',
      schema: { fields: [
        { name: 'id', type: 'string' },
        { name: 'type', type: 'enum', options: opt('gate', 'butterfly', 'check') },
        { name: 'status', type: 'enum', options: opt('open', 'closed') },
      ] },
    }),
    layerSpec({
      key: 'hydrants', name: 'Hydrants', color: '#f59e0b', borderColor: '#b45309', geometryType: 'point',
      schema: { fields: [
        { name: 'id', type: 'string' },
        { name: 'flow_gpm', type: 'number', label: 'flow (gpm)', min: 0 },
      ] },
    }),
    layerSpec({
      key: 'laterals', name: 'Service laterals', color: '#22d3ee', borderColor: '#0e7490', geometryType: 'line',
      schema: { fields: [
        { name: 'address', type: 'string' },
        { name: 'diameter_in', type: 'number', label: 'diameter (in)', min: 0 },
      ] },
    }),
    layerSpec({
      key: 'mains', name: 'Mains', color: '#3b82f6', borderColor: '#1e40af', geometryType: 'line',
      label: { field: 'name', size: 10, color: '#1e40af', haloColor: '#ffffff' },
      schema: { fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'diameter_in', type: 'number', label: 'diameter (in)', min: 0 },
        { name: 'material', type: 'enum', options: opt('PVC', 'ductile_iron', 'HDPE', 'steel') },
        { name: 'pressure_zone', type: 'string', label: 'pressure zone' },
      ] },
    }),
  ],
  seed: ({ frame, feat }) => {
    feat('mains', frame.line([[-45, 0], [45, 0]]), { name: 'Main St 12"', diameter_in: '12', material: 'ductile_iron', pressure_zone: 'Z1' }, 'line');
    feat('mains', frame.line([[0, -32], [0, 32]]), { name: 'Oak Ave 8"', diameter_in: '8', material: 'PVC', pressure_zone: 'Z1' }, 'line');
    feat('laterals', frame.line([[-24, 0], [-24, 12]]), { address: '101 Main', diameter_in: '2' }, 'line');
    feat('laterals', frame.line([[24, 0], [24, -12]]), { address: '210 Main', diameter_in: '2' }, 'line');
    feat('laterals', frame.line([[0, 18], [14, 18]]), { address: '14 Oak', diameter_in: '2' }, 'line');
    feat('valves', frame.point([-24, 0]), { id: 'V-1', type: 'gate', status: 'open' }, 'marker');
    feat('valves', frame.point([0, 0]), { id: 'V-2', type: 'gate', status: 'open' }, 'marker');
    feat('valves', frame.point([24, 0]), { id: 'V-3', type: 'butterfly', status: 'closed' }, 'marker');
    feat('hydrants', frame.point([-34, 3]), { id: 'H-1', flow_gpm: '1200' }, 'marker');
    feat('hydrants', frame.point([12, 3]), { id: 'H-2', flow_gpm: '1000' }, 'marker');
  },
  toolbar: [
    {
      name: 'Network',
      tools: [
        { id: 'main', icon: icons.main, title: 'Draw main', hint: 'Draw main — snaps to existing pipes at junctions', run: (c) => c.drawInto('Mains', 'line') },
        { id: 'lateral', icon: icons.lateral, title: 'Service lateral', run: (c) => c.drawInto('Service laterals', 'line') },
        { id: 'split', icon: CommonIcons.split, title: 'Split main', hint: 'Split — cut a main to insert a fitting', run: (c) => c.enableEdit('split') },
      ],
    },
    {
      name: 'Fittings',
      tools: [
        {
          id: 'valve',
          icon: icons.valve,
          title: 'Insert valve',
          hint: 'Insert valve — click along a main to drop a valve on it',
          run: (c) => {
            c.pick(
              ['Mains'],
              (lngLat) => c.addFeature('Valves', { type: 'Point', coordinates: lngLat } as Point, { type: 'gate', status: 'open' }, 'marker'),
              true,
            );
          },
        },
        { id: 'hydrant', icon: icons.hydrant, title: 'Place hydrant', run: (c) => c.drawInto('Hydrants', 'marker') },
      ],
    },
    {
      name: 'Edit',
      tools: [
        { id: 'nodes', icon: CommonIcons.edit, title: 'Edit nodes', run: (c) => c.enableEditVertices() },
        { id: 'move', icon: CommonIcons.move, title: 'Move', run: (c) => c.enableDrag() },
        { id: 'select', icon: CommonIcons.select, title: 'Select', run: (c) => c.enableEdit('select') },
        { id: 'delete', icon: CommonIcons.delete, title: 'Delete', needsSelection: true, run: (c) => c.deleteSelected() },
      ],
    },
  ],
  Sidebar,
  Inspector,
};

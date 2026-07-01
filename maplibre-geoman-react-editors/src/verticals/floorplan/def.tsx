import { CommonIcons, svg } from '../../core/icons';
import { layerSpec, type VerticalDef } from '../../core/vertical';
import Sidebar from './Sidebar';
import Inspector from './Inspector';

/** Departments drive the thematic room colouring + the occupancy rollup. */
export const DEPARTMENTS: Record<string, string> = {
  Eng: '#6366f1',
  Sales: '#f59e0b',
  Ops: '#10b981',
  Exec: '#ef4444',
  Shared: '#94a3b8',
};
export const ROOM_TYPES = ['office', 'meeting', 'open', 'corridor', 'utility', 'restroom'];

const deptOptions = Object.keys(DEPARTMENTS).map((value) => ({ value }));
const roomTypeOptions = ROOM_TYPES.map((value) => ({ value }));

const icons = {
  room: svg(<><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M11 4v16M11 12h10" /></>),
  rect: svg(<rect x="4" y="6" width="16" height="12" rx="1" />),
  door: svg(<><path d="M6 20V5a1 1 0 0 1 1-1h7v16" /><path d="M14 20a8 8 0 0 0-8-8" /></>),
  desk: svg(<><rect x="3" y="9" width="18" height="5" rx="1" /><path d="M6 14v4M18 14v4" /></>),
};

export const floorplan: VerticalDef = {
  id: 'floorplan',
  name: 'Floor plan',
  tagline: 'Space & occupancy planning',
  icon: icons.room,
  accent: 'from-amber-500 to-orange-600',
  center: [-122.401, 37.7906],
  zoom: 20,
  activeLayerName: 'Rooms',
  helpers: ['snapping', 'pin'], // snapping + topological editing (shared walls)
  layers: [
    layerSpec({
      key: 'desks',
      name: 'Desks',
      color: '#2563eb',
      borderColor: '#1e3a8a',
      geometryType: 'point',
      schema: { fields: [
        { name: 'label', type: 'string' },
        { name: 'assigned_to', type: 'string', label: 'assigned to' },
      ] },
    }),
    layerSpec({
      key: 'doors',
      name: 'Doors',
      color: '#64748b',
      borderColor: '#334155',
      geometryType: 'point',
      schema: { fields: [
        { name: 'type', type: 'enum', options: ['single', 'double', 'sliding'].map((v) => ({ value: v })) },
        { name: 'width_in', type: 'number', label: 'width (in)', min: 0 },
      ] },
    }),
    layerSpec({
      key: 'rooms',
      name: 'Rooms',
      color: '#f59e0b',
      borderColor: '#b45309',
      geometryType: 'polygon',
      categorical: { field: 'department', colors: DEPARTMENTS, fallback: '#cbd5e1' },
      label: { field: 'name', size: 11, color: '#78350f', haloColor: '#ffffff' },
      schema: { fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'type', type: 'enum', options: roomTypeOptions },
        { name: 'department', type: 'enum', options: deptOptions },
        { name: 'seats', type: 'integer', min: 0 },
      ] },
    }),
  ],
  seed: ({ frame, feat }) => {
    const room = (x0: number, y0: number, x1: number, y1: number, m: Record<string, string>) =>
      feat('rooms', frame.rect(x0, y0, x1, y1), m, 'polygon');
    room(0, 6.5, 6, 12, { name: 'Eng 1', type: 'office', department: 'Eng', seats: '4' });
    room(6, 6.5, 12, 12, { name: 'Eng 2', type: 'office', department: 'Eng', seats: '4' });
    room(12, 6.5, 20, 12, { name: 'Boardroom', type: 'meeting', department: 'Shared', seats: '10' });
    room(0, 0, 10, 5.5, { name: 'Sales Bullpen', type: 'open', department: 'Sales', seats: '12' });
    room(10, 0, 20, 5.5, { name: 'Ops', type: 'office', department: 'Ops', seats: '6' });
    room(0, 5.5, 20, 6.5, { name: 'Corridor', type: 'corridor', department: 'Shared', seats: '0' });

    feat('doors', frame.point([3, 6.5]), { type: 'single', width_in: '36' }, 'marker');
    feat('doors', frame.point([9, 6.5]), { type: 'single', width_in: '36' }, 'marker');
    feat('doors', frame.point([15, 6.5]), { type: 'double', width_in: '60' }, 'marker');

    for (let i = 0; i < 6; i++) {
      feat('desks', frame.point([1.5 + (i % 3) * 3, 1.6 + Math.floor(i / 3) * 2]), { label: `D${i + 1}` }, 'marker');
    }
  },
  toolbar: [
    {
      name: 'Rooms',
      tools: [
        { id: 'room-poly', icon: icons.room, title: 'Draw room', hint: 'Draw room — click corners, double-click to finish', run: (c) => c.drawInto('Rooms', 'polygon') },
        { id: 'room-rect', icon: icons.rect, title: 'Room (rectangle)', run: (c) => c.drawInto('Rooms', 'rectangle') },
        { id: 'split', icon: CommonIcons.split, title: 'Split room', hint: 'Split — draw a line across a room to divide it', run: (c) => c.enableEdit('split') },
        { id: 'merge', icon: CommonIcons.union, title: 'Merge rooms', hint: 'Merge — click two adjoining rooms', run: (c) => c.enableEdit('union') },
      ],
    },
    {
      name: 'Fixtures',
      tools: [
        { id: 'door', icon: icons.door, title: 'Add door', hint: 'Add door — snaps to walls', run: (c) => c.drawInto('Doors', 'marker') },
        { id: 'desk', icon: icons.desk, title: 'Place desk', run: (c) => c.drawInto('Desks', 'marker') },
      ],
    },
    {
      name: 'Edit',
      tools: [
        { id: 'nodes', icon: CommonIcons.edit, title: 'Edit walls', hint: 'Edit walls — shared walls move together (topology on)', run: (c) => c.enableEditVertices() },
        { id: 'move', icon: CommonIcons.move, title: 'Move', run: (c) => c.enableDrag() },
        { id: 'select', icon: CommonIcons.select, title: 'Select', run: (c) => c.enableEdit('select') },
        { id: 'delete', icon: CommonIcons.delete, title: 'Delete', needsSelection: true, run: (c) => c.deleteSelected() },
      ],
    },
  ],
  Sidebar,
  Inspector,
};

import { useEditorStore } from '../../core/store';
import { Card, LayerList, MetricGrid, ResetButton } from '../../core/ui';
import { areaSqft } from '../../core/measure';
import type { EditorController } from '../../core/controller';
import { DEPARTMENTS } from './def';

const sf = (n: number) => `${Math.round(n).toLocaleString()} sf`;

export default function Sidebar({ controller }: { controller: EditorController }) {
  const features = useEditorStore((s) => s.features);
  const layers = useEditorStore((s) => s.layers);
  const roomsId = layers.find((l) => l.name === 'Rooms')?.id;
  const rooms = Object.values(features).filter((f) => f.layerId === roomsId);

  const totalArea = rooms.reduce((s, r) => s + areaSqft(r.geojson.geometry), 0);
  const totalSeats = rooms.reduce((s, r) => s + (Number(r.metadata.seats) || 0), 0);
  const seatsByDept = (dept: string) =>
    rooms.filter((r) => r.metadata.department === dept).reduce((s, r) => s + (Number(r.metadata.seats) || 0), 0);

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Card title="Space summary">
          <MetricGrid
            items={[
              { label: 'Rooms', value: String(rooms.length) },
              { label: 'Floor area', value: sf(totalArea) },
              { label: 'Seats', value: String(totalSeats) },
              { label: 'Area / seat', value: totalSeats ? sf(totalArea / totalSeats) : '—' },
            ]}
          />
        </Card>

        <Card title="Departments">
          <div className="space-y-1 p-2.5">
            {Object.entries(DEPARTMENTS).map(([dept, color]) => (
              <div key={dept} className="flex items-center gap-2 px-1 text-xs">
                <span className="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: color }} />
                <span className="flex-1 text-zinc-600">{dept}</span>
                <span className="tabular-nums text-zinc-400">{seatsByDept(dept)} seats</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Layers">
          <LayerList controller={controller} />
        </Card>
      </div>

      <div className="border-t border-zinc-200 p-3">
        <ResetButton controller={controller} />
      </div>
    </>
  );
}

import { useEditorStore } from '../../core/store';
import { AttributeForm, Card, InspectorEmpty, MetricGrid } from '../../core/ui';
import { areaSqft } from '../../core/measure';
import { svg } from '../../core/icons';
import type { EditorController } from '../../core/controller';

const sf = (n: number) => `${Math.round(n).toLocaleString()} sf`;

export default function Inspector({ controller }: { controller: EditorController }) {
  const feature = useEditorStore((s) => (s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined));
  const layer = useEditorStore((s) => (feature ? s.layers.find((l) => l.id === feature.layerId) : undefined));

  if (!feature || !layer) {
    return (
      <div className="flex-1">
        <InspectorEmpty
          icon={svg(<><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M11 4v16M11 12h10" /></>)}
          title="Nothing selected"
          hint="Click a room to see its area and occupancy, or edit a door or desk."
        />
      </div>
    );
  }

  const isRoom = layer.name === 'Rooms';
  const seats = Number(feature.metadata.seats) || 0;
  const area = areaSqft(feature.geojson.geometry);
  const title = feature.metadata.name || feature.metadata.label || layer.name.replace(/s$/, '');

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      <Card title={layer.name.replace(/s$/, '')}>
        <div className="border-b border-zinc-200 px-3.5 py-2.5">
          <h3 className="truncate text-base font-semibold text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-400">
            #{feature.id.slice(0, 8)} · {feature.shape ?? 'feature'}
          </p>
        </div>
        {isRoom && (
          <MetricGrid
            items={[
              { label: 'Area', value: sf(area) },
              { label: 'Seats', value: String(seats) },
              { label: 'Area / seat', value: seats ? sf(area / seats) : '—' },
              { label: 'Type', value: feature.metadata.type || '—' },
            ]}
          />
        )}
        <AttributeForm controller={controller} featureId={feature.id} />
      </Card>
    </div>
  );
}

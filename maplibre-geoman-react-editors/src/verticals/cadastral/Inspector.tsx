import { useEditorStore } from '../../core/store';
import { AttributeForm, Card, InspectorEmpty, MetricGrid } from '../../core/ui';
import { areaSqft } from '../../core/measure';
import { svg } from '../../core/icons';
import type { EditorController } from '../../core/controller';

export default function Inspector({ controller }: { controller: EditorController }) {
  const feature = useEditorStore((s) => (s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined));
  const layer = useEditorStore((s) => (feature ? s.layers.find((l) => l.id === feature.layerId) : undefined));

  if (!feature || !layer) {
    return (
      <div className="flex-1">
        <InspectorEmpty
          icon={svg(<><path d="M4 5h16v14H4Z" /><path d="M12 5v14M4 12h8" /></>)}
          title="Nothing selected"
          hint="Click a parcel to see its area, or subdivide it into lots."
        />
      </div>
    );
  }

  const isParcel = layer.name === 'Parcels';
  const sqft = areaSqft(feature.geojson.geometry);
  const title = feature.metadata.apn || feature.metadata.type || layer.name.replace(/s$/, '');

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      <Card title={layer.name.replace(/s$/, '')}>
        <div className="border-b border-zinc-200 px-3.5 py-2.5">
          <h3 className="truncate text-base font-semibold text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-400">
            #{feature.id.slice(0, 8)} · {feature.metadata.owner || feature.shape || 'feature'}
          </p>
        </div>
        {isParcel && (
          <MetricGrid
            items={[
              { label: 'Area', value: `${(sqft / 43560).toFixed(2)} ac` },
              { label: 'Area (sq ft)', value: Math.round(sqft).toLocaleString() },
            ]}
          />
        )}
        <AttributeForm controller={controller} featureId={feature.id} />
      </Card>
    </div>
  );
}

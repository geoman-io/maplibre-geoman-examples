import { useEditorStore } from '../../core/store';
import { AttributeForm, Card, InspectorEmpty, MetricGrid } from '../../core/ui';
import { lengthFt } from '../../core/measure';
import { svg } from '../../core/icons';
import type { EditorController } from '../../core/controller';

const ft = (n: number) => `${Math.round(n).toLocaleString()} ft`;

export default function Inspector({ controller }: { controller: EditorController }) {
  const feature = useEditorStore((s) => (s.selectedFeatureId ? s.features[s.selectedFeatureId] : undefined));
  const layer = useEditorStore((s) => (feature ? s.layers.find((l) => l.id === feature.layerId) : undefined));

  if (!feature || !layer) {
    return (
      <div className="flex-1">
        <InspectorEmpty
          icon={svg(<><path d="M2 12h20" /><path d="M7 9v6M17 9v6" /></>)}
          title="Nothing selected"
          hint="Click a pipe to see its length, or a valve / hydrant to edit it."
        />
      </div>
    );
  }

  const isLine = layer.geometryType === 'line';
  const title = feature.metadata.name || feature.metadata.id || feature.metadata.address || layer.name.replace(/s$/, '');

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      <Card title={layer.name.replace(/s$/, '')}>
        <div className="border-b border-zinc-200 px-3.5 py-2.5">
          <h3 className="truncate text-base font-semibold text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-400">
            #{feature.id.slice(0, 8)} · {feature.shape ?? 'feature'}
          </p>
        </div>
        {isLine && (
          <MetricGrid
            items={[
              { label: 'Length', value: ft(lengthFt(feature.geojson.geometry)) },
              { label: 'Diameter', value: feature.metadata.diameter_in ? `${feature.metadata.diameter_in} in` : '—' },
            ]}
          />
        )}
        <AttributeForm controller={controller} featureId={feature.id} />
      </Card>
    </div>
  );
}

import { useEditorStore } from '../../core/store';
import { Card, LayerList, MetricGrid, ResetButton } from '../../core/ui';
import { lengthFt } from '../../core/measure';
import type { EditorController } from '../../core/controller';

const ft = (n: number) => `${Math.round(n).toLocaleString()} ft`;

export default function Sidebar({ controller }: { controller: EditorController }) {
  const features = useEditorStore((s) => s.features);
  const layers = useEditorStore((s) => s.layers);
  const byName = (name: string) => {
    const id = layers.find((l) => l.name === name)?.id;
    return Object.values(features).filter((f) => f.layerId === id);
  };
  const mains = byName('Mains');
  const mainLength = mains.reduce((s, m) => s + lengthFt(m.geojson.geometry), 0);

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Card title="Network summary">
          <MetricGrid
            items={[
              { label: 'Main length', value: ft(mainLength) },
              { label: 'Laterals', value: String(byName('Service laterals').length) },
              { label: 'Valves', value: String(byName('Valves').length) },
              { label: 'Hydrants', value: String(byName('Hydrants').length) },
            ]}
          />
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

import { useEditorStore } from './store';
import { CommonIcons } from './icons';
import type { EditorController } from './controller';
import type { ToolGroup } from './vertical';

/** The custom toolbar strip. Renders a vertical's tool groups (custom icons +
 *  domain actions), plus shared undo/redo/zoom. Fully drives Geoman. */
export default function Toolbar({ controller, groups }: { controller: EditorController; groups: ToolGroup[] }) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const hasSelection = useEditorStore((s) => s.selectedFeatureId !== null);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);

  const select = async (id: string, title: string, run: () => void | Promise<void>) => {
    await controller.disableAllModes();
    if (activeTool?.key === id) {
      controller.setActiveTool(null);
      return;
    }
    await run();
    controller.setActiveTool({ key: id, title });
  };

  const btn = (
    key: string,
    icon: React.ReactNode,
    title: string,
    onClick: () => void,
    opts: { on?: boolean; disabled?: boolean; tooltip?: string } = {},
  ) => (
    <button
      key={key}
      title={opts.tooltip ?? title}
      aria-label={title}
      aria-pressed={opts.on}
      disabled={opts.disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        opts.on ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {icon}
    </button>
  );

  const sep = (k: string) => <div key={k} className="mx-1 h-6 w-px shrink-0 self-center bg-zinc-200" />;

  return (
    <div className="flex w-max items-center gap-0.5 p-1">
      {btn('undo', CommonIcons.undo, 'Undo', () => void controller.undo(), { disabled: !canUndo })}
      {btn('redo', CommonIcons.redo, 'Redo', () => void controller.redo(), { disabled: !canRedo })}
      {sep('s-hist')}
      {groups.map((g, gi) => (
        <div key={g.name} className="flex items-center gap-0.5">
          {gi > 0 && sep(`s-${g.name}`)}
          {g.tools.map((t) =>
            btn(t.id, t.icon, t.title, () => void select(t.id, t.title, () => t.run(controller)), {
              on: activeTool?.key === t.id,
              disabled: t.needsSelection && !hasSelection,
              tooltip: t.hint,
            }),
          )}
        </div>
      ))}
      {sep('s-view')}
      {btn('zoom', CommonIcons.zoom, 'Zoom to fit', () => controller.zoomToAll())}
    </div>
  );
}

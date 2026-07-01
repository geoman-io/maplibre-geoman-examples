import { useState } from 'react';
import VerticalEditor from './core/VerticalEditor';
import type { VerticalDef } from './core/vertical';
import { floorplan } from './verticals/floorplan/def';
import { utility } from './verticals/utility/def';
import { cadastral } from './verticals/cadastral/def';

const VERTICALS: VerticalDef[] = [floorplan, utility, cadastral];

/** SaaS shell: a brand bar with a vertical switcher; the body is the selected
 *  vertical's full custom editor. */
export default function App() {
  const [activeId, setActiveId] = useState(VERTICALS[0].id);
  const def = VERTICALS.find((d) => d.id === activeId) ?? VERTICALS[0];

  return (
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 21 9v6l-9 6-9-6V9l9-6Z" />
              <path d="M3 9l9 6 9-6" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Geoman Studio</span>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {VERTICALS.map((v) => {
            const active = v.id === activeId;
            return (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors ${
                  active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${v.accent} text-white`}>
                  <span className="scale-[0.7]">{v.icon}</span>
                </span>
                {v.name}
              </button>
            );
          })}
        </nav>

        <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
          Saved locally
        </span>
      </header>

      <VerticalEditor key={def.id} def={def} />
    </div>
  );
}

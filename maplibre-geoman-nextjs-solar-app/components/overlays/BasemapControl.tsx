'use client';

import { useState } from 'react';
import type { EditorController } from '@/lib/geoman/editorController';
import { BASEMAPS } from '@/lib/basemaps';

/** Small bottom-right basemap switcher: a stack icon that expands upward to the
 *  basemap list. Collapsed by default to keep the map uncluttered. */
export default function BasemapControl({ controller }: { controller: EditorController }) {
  const [open, setOpen] = useState(false);
  // The map opens on satellite (see maplibre-style) — a rooftop-solar default.
  const [active, setActive] = useState('satellite');

  const pick = (id: string) => {
    setActive(id);
    const bm = BASEMAPS.find((b) => b.id === id);
    if (bm) controller.setBasemap(bm);
    setOpen(false);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1">
      {open && (
        <div className="flex flex-col overflow-hidden rounded-lg bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => pick(b.id)}
              className={`px-3 py-1.5 text-right text-xs font-medium transition-colors ${
                active === b.id ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Basemap"
        title="Basemap"
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5 backdrop-blur transition-colors ${
          open ? 'bg-blue-600 text-white' : 'bg-white/95 text-zinc-600 hover:text-blue-600'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      </button>
    </div>
  );
}

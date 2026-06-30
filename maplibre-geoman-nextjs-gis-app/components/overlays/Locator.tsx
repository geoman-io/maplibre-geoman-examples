'use client';

import { useState } from 'react';
import type { EditorController } from '@/lib/geoman/editorController';
import { BASEMAPS } from '@/lib/basemaps';

/** Top-left locator: jump to a place name (Nominatim geocoder) or a "lat, lng"
 *  coordinate, plus a basemap switcher. */
export default function Locator({ controller }: { controller: EditorController }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [basemap, setBasemap] = useState('osm');

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    setNote(null);

    // "lat, lng" coordinate?
    const m = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        controller.flyTo(lng, lat, 14);
        return;
      }
    }

    // place name → geocode
    setBusy(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } },
      );
      const hits = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (hits.length) {
        controller.flyTo(Number(hits[0].lon), Number(hits[0].lat), 13);
        setNote(hits[0].display_name);
      } else {
        setNote('No results');
      }
    } catch {
      setNote('Search failed');
    } finally {
      setBusy(false);
    }
  };

  const pickBasemap = (id: string) => {
    setBasemap(id);
    const bm = BASEMAPS.find((b) => b.id === id);
    if (bm) controller.setBasemap(bm.tiles);
  };

  return (
    <div className="pointer-events-auto w-72 rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="flex gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search place or lat, lng"
          aria-label="Search location"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={search}
          disabled={busy}
          aria-label="Go"
          title="Go"
          className="flex items-center rounded-lg bg-blue-600 px-2.5 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
      {note && (
        <p className="truncate px-1 pt-1 text-[11px] text-zinc-500" title={note}>
          {note}
        </p>
      )}
      <div className="mt-1.5 flex gap-1">
        {BASEMAPS.map((b) => (
          <button
            key={b.id}
            onClick={() => pickBasemap(b.id)}
            className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
              basemap === b.id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}

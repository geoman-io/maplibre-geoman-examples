'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EditorController } from '@/lib/geoman/editorController';
import { compass, shadowLength, siteSolarTime, sunPosition } from '@/lib/solar/sun';

const R = 52; // compass radius (px)
const C = 64; // svg centre

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Bearing (° from north, CW) → point on the compass (up = north). */
function polar(bearing: number, radius: number) {
  const a = (bearing * Math.PI) / 180;
  return { x: C + radius * Math.sin(a), y: C - radius * Math.cos(a) };
}

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Sun position for the site (map centre): a compass with the sun's bearing and
 * elevation, the direction shadows fall (for panel spacing / self-shading), and
 * a time-of-day + date scrubber to preview the sun's path across the year.
 */
export default function SunDial({ controller }: { controller: EditorController }) {
  const [open, setOpen] = useState(true);
  const [center, setCenter] = useState(() => controller.mapCenter());
  const [hour, setHour] = useState(12);
  const [date, setDate] = useState(todayISO);

  useEffect(() => controller.onMapMoveEnd(() => setCenter(controller.mapCenter())), [controller]);

  const sun = useMemo(() => {
    const base = new Date(`${date}T00:00:00`);
    return sunPosition(siteSolarTime(hour, center.lng, base), center.lat, center.lng);
  }, [date, hour, center.lat, center.lng]);

  const up = sun.elevation > 0;
  const sunPt = polar(sun.azimuth, R * Math.max(0, (90 - sun.elevation) / 90));
  const shadow = shadowLength(sun.elevation);
  const shadowPt = shadow != null ? polar((sun.azimuth + 180) % 360, Math.min(R, 12 + shadow * 6)) : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Sun position"
        title="Sun position"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-amber-500 shadow-lg ring-1 ring-black/5 backdrop-blur hover:text-amber-600"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-[184px] rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sun</span>
        <button onClick={() => setOpen(false)} aria-label="Collapse sun dial" className="text-zinc-400 hover:text-zinc-600">
          ✕
        </button>
      </div>

      <svg viewBox="0 0 128 128" className="mx-auto block h-[124px] w-[124px]">
        <circle cx={C} cy={C} r={R} className="fill-sky-50 stroke-zinc-200" />
        <circle cx={C} cy={C} r={R / 2} className="fill-none stroke-zinc-200" strokeDasharray="2 3" />
        {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([label, bearing]) => {
          const p = polar(bearing, R + 8);
          return (
            <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-zinc-400 text-[9px] font-semibold">
              {label}
            </text>
          );
        })}
        {shadowPt && (
          <line x1={C} y1={C} x2={shadowPt.x} y2={shadowPt.y} className="stroke-slate-400" strokeWidth={2} strokeLinecap="round" strokeDasharray="1 3" />
        )}
        {up && <line x1={C} y1={C} x2={sunPt.x} y2={sunPt.y} className="stroke-amber-300" strokeWidth={2} />}
        <circle
          cx={sunPt.x}
          cy={sunPt.y}
          r={up ? 6 : 4}
          className={up ? 'fill-amber-400 stroke-amber-500' : 'fill-zinc-300 stroke-zinc-400'}
        />
      </svg>

      <div className="mt-1 text-center text-[11px] text-zinc-600">
        {up ? (
          <>
            Sun <b>{compass(sun.azimuth)}</b> {Math.round(sun.azimuth)}° · <b>{Math.round(sun.elevation)}°</b> up
          </>
        ) : (
          <span className="text-zinc-400">Sun below horizon</span>
        )}
      </div>

      <input
        type="range"
        min={0}
        max={24}
        step={0.25}
        value={hour}
        onChange={(e) => setHour(Number(e.target.value))}
        className="mt-2 w-full accent-amber-500"
        aria-label="Hour of day"
      />
      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span className="tabular-nums">{fmtHour(hour)}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-zinc-200 px-1 py-0.5 text-[10px]"
          aria-label="Date"
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';

/** Transient top-centre toast for blocking feedback (e.g. a geofencing block).
 *  Auto-clears a couple of seconds after the last message. */
export default function Toast() {
  const notice = useEditorStore((s) => s.notice);
  const setNotice = useEditorStore((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  if (!notice) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-amber-500/95 px-4 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-black/10">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        {notice}
      </div>
    </div>
  );
}

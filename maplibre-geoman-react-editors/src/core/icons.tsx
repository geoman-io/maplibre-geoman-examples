import type { ReactNode } from 'react';

/** Wrap SVG path content in a consistent 20px stroked icon. */
export const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/** Editing icons shared across every vertical toolbar. */
export const CommonIcons = {
  select: svg(<path d="m3 3 7.5 18 2.5-7.5L20.5 11 3 3Z" />),
  edit: svg(<><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="6" cy="18" r="2" /><path d="M8 6h8M18 8v8M16 18H8M6 16V8" /></>),
  move: svg(<><path d="M12 2v20M2 12h20" /><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" /></>),
  rotate: svg(<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>),
  scale: svg(<><rect x="4" y="4" width="11" height="11" rx="1" /><path d="M20 9v11H9M16 16l4 4" /></>),
  delete: svg(<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m4 5v6m6-6v6" />),
  undo: svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" /></>),
  redo: svg(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h4" /></>),
  split: svg(<><path d="M12 3v18" strokeDasharray="2 2" /><path d="M7 8 5 6 3 8M17 8l2-2 2 2" /></>),
  union: svg(<><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></>),
  difference: svg(<><rect x="3" y="6" width="12" height="12" rx="1" /><path d="M9 6h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9" strokeDasharray="2 2" /></>),
  hole: svg(<><path d="M4 4h16v16H4Z" /><circle cx="12" cy="12" r="3.5" strokeDasharray="2 2" /></>),
  zoom: svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></>),
};

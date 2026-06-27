'use client';

import { signOut, useSession } from '@/lib/auth-client';

export default function UserMenu() {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-white/95 py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-semibold text-white">
          {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
        </div>
      )}
      <span className="max-w-[9rem] truncate text-sm font-medium text-zinc-700">
        {user.name || user.email}
      </span>
      <button
        onClick={() => signOut()}
        title="Sign out"
        aria-label="Sign out"
        className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

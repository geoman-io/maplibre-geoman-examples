'use client';

import { useState } from 'react';
import { devCredentialsEnabled, signIn, signUp } from '@/lib/auth-client';

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-zinc-600">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </span>
      {children}
    </li>
  );
}

export default function SignInPanel() {
  const [email, setEmail] = useState('dev@example.com');
  const [password, setPassword] = useState('password123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dev = async (mode: 'in' | 'up') => {
    setBusy(true);
    setError(null);
    const res =
      mode === 'up'
        ? await signUp.email({ email, password, name: email.split('@')[0] })
        : await signIn.email({ email, password });
    setBusy(false);
    if (res.error) setError(res.error.message ?? 'Authentication failed');
  };

  return (
    <div className="pointer-events-auto w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* Brand header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-7 pb-6 pt-7 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Geoman GIS</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-blue-50">
          A fully custom GIS editor built on Geoman Pro — draw, organize into
          layers, and annotate features on a single map.
        </p>
      </div>

      {/* Body */}
      <div className="px-7 py-6">
        <ul className="mb-6 space-y-3">
          <Feature
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            }
          >
            Draw &amp; edit with Pro tools
          </Feature>
          <Feature
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
              </svg>
            }
          >
            Organize features into layers
          </Feature>
          <Feature
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            }
          >
            Attach metadata to anything
          </Feature>
        </ul>

        <button
          onClick={() => signIn.social({ provider: 'github', callbackURL: '/' })}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign in with GitHub
        </button>

        {devCredentialsEnabled && (
          <>
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                or dev sign-in
              </span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <div className="space-y-2">
              <input
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                aria-label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2 pt-1">
                <button
                  disabled={busy}
                  onClick={() => dev('in')}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  Sign in
                </button>
                <button
                  disabled={busy}
                  onClick={() => dev('up')}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  Sign up
                </button>
              </div>
              {error && <p className="pt-1 text-xs text-red-600">{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

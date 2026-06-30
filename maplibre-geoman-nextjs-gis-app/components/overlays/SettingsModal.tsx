'use client';

import { CONFIG_LABELS, CONFIG_SECTIONS, useConfig, type Config, type ToggleKey } from '@/hooks/useConfig';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const config = useConfig();

  const Toggle = ({ k }: { k: ToggleKey }) => {
    const { label, hint } = CONFIG_LABELS[k];
    const on = config[k];
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-zinc-50">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-800">{label}</div>
          <p className="text-[11px] leading-snug text-zinc-500">{hint}</p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={() => config.set({ [k]: !on } as Partial<Config>)}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
            on ? 'bg-blue-600' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              on ? 'left-4' : 'left-0.5'
            }`}
          />
        </button>
      </label>
    );
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-[30rem] max-w-full overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Editor settings</h2>
            <p className="text-[11px] text-zinc-400">Saved to this browser</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100">
            ✕
          </button>
        </div>

        <div className="p-2">
          {CONFIG_SECTIONS.map((section) => (
            <div key={section.title} className="px-2">
              <h3 className="px-2 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {section.title}
              </h3>
              <div className="divide-y divide-zinc-100">
                {section.keys.map((k) => (
                  <div key={k}>
                    <Toggle k={k} />
                    {k === 'snapping' && config.snapping && (
                      <div className="flex items-center gap-3 px-2 pb-2.5">
                        <span className="text-[11px] text-zinc-500">Tolerance</span>
                        <input
                          type="range"
                          min={4}
                          max={40}
                          value={config.snapTolerance}
                          onChange={(e) => config.set({ snapTolerance: Number(e.target.value) })}
                          aria-label="Snap tolerance"
                          className="flex-1 accent-blue-600"
                        />
                        <span className="w-10 text-right text-[11px] tabular-nums text-zinc-500">
                          {config.snapTolerance}px
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

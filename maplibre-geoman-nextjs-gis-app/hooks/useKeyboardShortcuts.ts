'use client';

import { useEffect } from 'react';
import type { Geoman } from '@geoman-io/maplibre-geoman-pro';
import type { EditorController } from '@/lib/geoman/editorController';
import { useEditorStore } from '@/hooks/useEditorStore';

const isTyping = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

/** Standard GIS keyboard shortcuts, wired to the editor controller. */
export function useKeyboardShortcuts(gm: Geoman | null, controller: EditorController | null) {
  useEffect(() => {
    if (!gm || !controller) return;

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // Geoman handles map-scoped history/delete/draw keys in capture phase.
      // Replaying the same key here ran Undo twice (or deleted while drawing).
      if (e.defaultPrevented) {
        if (e.key === 'Escape') useEditorStore.getState().setActiveTool(null);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) void controller.redo();
        else void controller.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        void controller.redo();
      } else if (mod && key === 'c') {
        controller.copySelected();
      } else if (mod && key === 'v') {
        e.preventDefault();
        void controller.paste();
      } else if (key === 'delete' || key === 'backspace') {
        if (useEditorStore.getState().selectedFeatureId) {
          e.preventDefault();
          void controller.deleteSelected();
        }
      } else if (key === 'escape') {
        void gm.disableAllModes().catch(() => {});
        useEditorStore.getState().setActiveTool(null);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gm, controller]);
}

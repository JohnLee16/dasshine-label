import { useEffect } from 'react';
import useAnnotationStore, { Tool2D, Tool3D } from '../store/annotationStore';

// ─── useAnnotationHotkeys ─────────────────────────────────────────────────────
// Global keyboard shortcuts for the annotation workspace.

export function useAnnotationHotkeys() {
  const store = useAnnotationStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire when typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const { mode, activeTool2d, activeTool3d, setTool2d, setTool3d,
              undo, redo, deleteAnnotation2d, deleteBox3d,
              selectedIds2d, selectedIds3d, labelClasses, setActiveLabel } = store;

      // Undo / Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); return; }
        if (e.key === 'y') { e.preventDefault(); redo(); return; }
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds2d.length > 0) deleteAnnotation2d(selectedIds2d);
        if (selectedIds3d.length > 0) deleteBox3d(selectedIds3d);
        return;
      }

      // 2D tool hotkeys
      if (mode === '2d') {
        const map: Record<string, Tool2D> = {
          v: 'select', b: 'bbox', p: 'polygon',
          l: 'polyline', k: 'keypoint', h: 'pan', e: 'eraser',
        };
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const tool = map[e.key.toLowerCase()];
          if (tool) { setTool2d(tool); return; }
        }
      }

      // 3D tool hotkeys
      if (mode === '3d') {
        const map: Record<string, Tool3D> = {
          v: 'select', b: 'box3d', o: 'orbit', h: 'pan',
        };
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const tool = map[e.key.toLowerCase()];
          if (tool) { setTool3d(tool); return; }
        }
      }

      // Label hotkeys (1–9)
      labelClasses.forEach((lc) => {
        if (lc.hotkey && e.key === lc.hotkey && !e.ctrlKey) {
          setActiveLabel(lc.name);
        }
      });
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);
}

// ─── useAutoSave ──────────────────────────────────────────────────────────────
// Debounced auto-save to localStorage (replace with API call in production).

export function useAutoSave(taskId: string, intervalMs = 10_000) {
  const { annotations2d, boxes3d } = useAnnotationStore();

  useEffect(() => {
    const id = setInterval(() => {
      const payload = { taskId, annotations2d, boxes3d, savedAt: new Date().toISOString() };
      try {
        localStorage.setItem(`dasshine_autosave_${taskId}`, JSON.stringify(payload));
      } catch {
        // quota exceeded – ignore silently
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [taskId, annotations2d, boxes3d, intervalMs]);
}

// ─── useLoadSaved ─────────────────────────────────────────────────────────────

export function useLoadSaved(taskId: string) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`dasshine_autosave_${taskId}`);
      if (!raw) return;
      const { annotations2d, boxes3d } = JSON.parse(raw);
      useAnnotationStore.setState({ annotations2d, boxes3d });
    } catch {
      // ignore
    }
  }, [taskId]);
}

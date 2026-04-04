import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnnotationType = 'bbox' | 'polygon' | 'polyline' | 'keypoint' | 'box3d'
export type AnnotationMode = '2d' | '3d'

export interface Point2D { x: number; y: number }
export interface Point3D { x: number; y: number; z: number }

export interface Annotation2D {
  id: string
  type: AnnotationType
  label: string
  color: string
  points: Point2D[]
  visible: boolean
  locked: boolean
  score?: number
  isAI?: boolean
  attributes?: Record<string, string | number | boolean>
}

export interface Box3D {
  id: string
  label: string
  color: string
  center: Point3D
  size: Point3D
  rotation: Point3D
  visible: boolean
  locked: boolean
  score?: number
  isAI?: boolean
  attributes?: Record<string, string | number | boolean>
}

export interface LabelClass {
  id: string
  name: string
  color: string
  hotkey?: string
}

export type Tool2D = 'select' | 'bbox' | 'polygon' | 'polyline' | 'keypoint' | 'pan' | 'eraser'
export type Tool3D = 'select' | 'box3d' | 'orbit' | 'pan'

// ── Draft = one frame's saved state ──────────────────────────────────────────

export interface AnnotationDraft {
  taskId: string
  imageIndex: number
  annotations2d: Annotation2D[]
  boxes3d: Box3D[]
  savedAt: string        // ISO timestamp
  isSubmitted: boolean
}

// ── Auto-save metadata ────────────────────────────────────────────────────────

export interface AutoSaveMeta {
  lastSavedAt: string | null  // ISO
  isDirty: boolean            // unsaved changes exist
  saveCount: number
  error: string | null
}

// ─── Store state ──────────────────────────────────────────────────────────────

interface AnnotationState {
  // Mode
  mode: AnnotationMode

  // 2D
  annotations2d: Annotation2D[]
  activeTool2d: Tool2D
  selectedIds2d: string[]

  // 3D
  boxes3d: Box3D[]
  activeTool3d: Tool3D
  selectedIds3d: string[]

  // Shared
  labelClasses: LabelClass[]
  activeLabel: string
  zoom: number
  showLabels: boolean
  showConfidence: boolean
  opacity: number

  // History (undo/redo)
  past: { annotations2d: Annotation2D[]; boxes3d: Box3D[] }[]
  future: { annotations2d: Annotation2D[]; boxes3d: Box3D[] }[]

  // ── Draft / Auto-save ──────────────────────────────────────────────────────
  currentTaskId: string | null
  currentImageIndex: number
  drafts: Record<string, AnnotationDraft>   // key = `${taskId}:${imageIndex}`
  autoSaveMeta: AutoSaveMeta

  // ── 2D Actions ─────────────────────────────────────────────────────────────
  setMode: (mode: AnnotationMode) => void
  setTool2d: (tool: Tool2D) => void
  addAnnotation2d: (ann: Annotation2D) => void
  updateAnnotation2d: (id: string, patch: Partial<Annotation2D>) => void
  deleteAnnotation2d: (ids: string[]) => void
  selectAnnotations2d: (ids: string[]) => void
  clearSelection2d: () => void

  // ── 3D Actions ─────────────────────────────────────────────────────────────
  setTool3d: (tool: Tool3D) => void
  addBox3d: (box: Box3D) => void
  updateBox3d: (id: string, patch: Partial<Box3D>) => void
  deleteBox3d: (ids: string[]) => void
  selectBoxes3d: (ids: string[]) => void
  clearSelection3d: () => void

  // ── Shared Actions ─────────────────────────────────────────────────────────
  setActiveLabel: (label: string) => void
  setZoom: (zoom: number) => void
  toggleLabels: () => void
  toggleConfidence: () => void
  setOpacity: (v: number) => void
  setLabelClasses: (classes: LabelClass[]) => void

  // ── History ────────────────────────────────────────────────────────────────
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // ── Draft / Auto-save ──────────────────────────────────────────────────────
  setCurrentTask: (taskId: string, imageIndex?: number) => void
  saveDraft: () => void                           // manual save
  loadDraft: (taskId: string, imageIndex: number) => boolean  // returns true if draft existed
  deleteDraft: (taskId: string, imageIndex: number) => void
  clearAllDrafts: () => void
  getDraftList: () => AnnotationDraft[]
  markDirty: () => void
  markClean: () => void
  setCurrentImageIndex: (index: number) => void
}

// ─── Default label classes ────────────────────────────────────────────────────

const DEFAULT_LABELS: LabelClass[] = [
  { id: '1', name: 'car',          color: '#00d4ff', hotkey: '1' },
  { id: '2', name: 'person',       color: '#7c3aed', hotkey: '2' },
  { id: '3', name: 'truck',        color: '#10b981', hotkey: '3' },
  { id: '4', name: 'bicycle',      color: '#f59e0b', hotkey: '4' },
  { id: '5', name: 'motorcycle',   color: '#ef4444', hotkey: '5' },
  { id: '6', name: 'traffic_sign', color: '#ec4899', hotkey: '6' },
  { id: '7', name: 'pedestrian',   color: '#a78bfa', hotkey: '7' },
  { id: '8', name: 'bus',          color: '#34d399', hotkey: '8' },
]

function draftKey(taskId: string, imageIndex: number) {
  return `${taskId}:${imageIndex}`
}

// ─── Store ────────────────────────────────────────────────────────────────────

const useAnnotationStore = create<AnnotationState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // ── Initial state ──────────────────────────────────────────────────
        mode: '2d',
        annotations2d: [],
        activeTool2d: 'bbox',
        selectedIds2d: [],
        boxes3d: [],
        activeTool3d: 'box3d',
        selectedIds3d: [],
        labelClasses: DEFAULT_LABELS,
        activeLabel: 'car',
        zoom: 1,
        showLabels: true,
        showConfidence: true,
        opacity: 0.3,
        past: [],
        future: [],

        // Draft state
        currentTaskId: null,
        currentImageIndex: 0,
        drafts: {},
        autoSaveMeta: {
          lastSavedAt: null,
          isDirty: false,
          saveCount: 0,
          error: null,
        },

        // ── 2D ────────────────────────────────────────────────────────────
        setMode: (mode) => set((s) => { s.mode = mode }),
        setTool2d: (tool) => set((s) => { s.activeTool2d = tool }),

        addAnnotation2d: (ann) => set((s) => {
          get().pushHistory()
          s.annotations2d.push(ann)
          s.autoSaveMeta.isDirty = true
        }),

        updateAnnotation2d: (id, patch) => set((s) => {
          const idx = s.annotations2d.findIndex((a) => a.id === id)
          if (idx !== -1) {
            Object.assign(s.annotations2d[idx], patch)
            s.autoSaveMeta.isDirty = true
          }
        }),

        deleteAnnotation2d: (ids) => set((s) => {
          get().pushHistory()
          s.annotations2d = s.annotations2d.filter((a) => !ids.includes(a.id))
          s.selectedIds2d = s.selectedIds2d.filter((id) => !ids.includes(id))
          s.autoSaveMeta.isDirty = true
        }),

        selectAnnotations2d: (ids) => set((s) => { s.selectedIds2d = ids }),
        clearSelection2d: () => set((s) => { s.selectedIds2d = [] }),

        // ── 3D ────────────────────────────────────────────────────────────
        setTool3d: (tool) => set((s) => { s.activeTool3d = tool }),

        addBox3d: (box) => set((s) => {
          get().pushHistory()
          s.boxes3d.push(box)
          s.autoSaveMeta.isDirty = true
        }),

        updateBox3d: (id, patch) => set((s) => {
          const idx = s.boxes3d.findIndex((b) => b.id === id)
          if (idx !== -1) {
            Object.assign(s.boxes3d[idx], patch)
            s.autoSaveMeta.isDirty = true
          }
        }),

        deleteBox3d: (ids) => set((s) => {
          get().pushHistory()
          s.boxes3d = s.boxes3d.filter((b) => !ids.includes(b.id))
          s.selectedIds3d = s.selectedIds3d.filter((id) => !ids.includes(id))
          s.autoSaveMeta.isDirty = true
        }),

        selectBoxes3d: (ids) => set((s) => { s.selectedIds3d = ids }),
        clearSelection3d: () => set((s) => { s.selectedIds3d = [] }),

        // ── Shared ────────────────────────────────────────────────────────
        setActiveLabel: (label) => set((s) => { s.activeLabel = label }),
        setZoom: (zoom) => set((s) => { s.zoom = Math.max(0.1, Math.min(10, zoom)) }),
        toggleLabels: () => set((s) => { s.showLabels = !s.showLabels }),
        toggleConfidence: () => set((s) => { s.showConfidence = !s.showConfidence }),
        setOpacity: (v) => set((s) => { s.opacity = v }),
        setLabelClasses: (classes) => set((s) => { s.labelClasses = classes }),

        // ── History ────────────────────────────────────────────────────────
        pushHistory: () => {
          const { annotations2d, boxes3d, past } = get()
          set((s) => {
            s.past = [
              ...past.slice(-49),
              {
                annotations2d: JSON.parse(JSON.stringify(annotations2d)),
                boxes3d: JSON.parse(JSON.stringify(boxes3d)),
              },
            ]
            s.future = []
          })
        },

        undo: () => set((s) => {
          if (s.past.length === 0) return
          const prev = s.past[s.past.length - 1]
          s.future.unshift({
            annotations2d: JSON.parse(JSON.stringify(s.annotations2d)),
            boxes3d: JSON.parse(JSON.stringify(s.boxes3d)),
          })
          s.past.pop()
          s.annotations2d = prev.annotations2d
          s.boxes3d = prev.boxes3d
          s.autoSaveMeta.isDirty = true
        }),

        redo: () => set((s) => {
          if (s.future.length === 0) return
          const next = s.future[0]
          s.past.push({
            annotations2d: JSON.parse(JSON.stringify(s.annotations2d)),
            boxes3d: JSON.parse(JSON.stringify(s.boxes3d)),
          })
          s.future.shift()
          s.annotations2d = next.annotations2d
          s.boxes3d = next.boxes3d
          s.autoSaveMeta.isDirty = true
        }),

        // ── Draft / Auto-save ─────────────────────────────────────────────

        setCurrentTask: (taskId, imageIndex = 0) => set((s) => {
          s.currentTaskId = taskId
          s.currentImageIndex = imageIndex
        }),

        setCurrentImageIndex: (index) => set((s) => {
          s.currentImageIndex = index
        }),

        saveDraft: () => {
          const { currentTaskId, currentImageIndex, annotations2d, boxes3d, drafts } = get()
          if (!currentTaskId) return

          const key = draftKey(currentTaskId, currentImageIndex)
          const draft: AnnotationDraft = {
            taskId: currentTaskId,
            imageIndex: currentImageIndex,
            annotations2d: JSON.parse(JSON.stringify(annotations2d)),
            boxes3d: JSON.parse(JSON.stringify(boxes3d)),
            savedAt: new Date().toISOString(),
            isSubmitted: false,
          }

          set((s) => {
            s.drafts[key] = draft
            s.autoSaveMeta.lastSavedAt = draft.savedAt
            s.autoSaveMeta.isDirty = false
            s.autoSaveMeta.saveCount += 1
            s.autoSaveMeta.error = null
          })
        },

        loadDraft: (taskId, imageIndex) => {
          const { drafts } = get()
          const key = draftKey(taskId, imageIndex)
          const draft = drafts[key]
          if (!draft) return false

          set((s) => {
            s.annotations2d = JSON.parse(JSON.stringify(draft.annotations2d))
            s.boxes3d = JSON.parse(JSON.stringify(draft.boxes3d))
            s.currentTaskId = taskId
            s.currentImageIndex = imageIndex
            s.selectedIds2d = []
            s.selectedIds3d = []
            s.past = []
            s.future = []
            s.autoSaveMeta.isDirty = false
            s.autoSaveMeta.lastSavedAt = draft.savedAt
          })
          return true
        },

        deleteDraft: (taskId, imageIndex) => set((s) => {
          const key = draftKey(taskId, imageIndex)
          delete s.drafts[key]
        }),

        clearAllDrafts: () => set((s) => {
          s.drafts = {}
          s.autoSaveMeta = { lastSavedAt: null, isDirty: false, saveCount: 0, error: null }
        }),

        getDraftList: () => {
          return Object.values(get().drafts).sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
          )
        },

        markDirty: () => set((s) => { s.autoSaveMeta.isDirty = true }),
        markClean: () => set((s) => { s.autoSaveMeta.isDirty = false }),
      })),
      {
        name: 'dasshine_annotation_store',
        // Only persist drafts and label settings, NOT the current canvas state
        // (canvas state is loaded from drafts on demand)
        partialize: (s) => ({
          drafts: s.drafts,
          labelClasses: s.labelClasses,
          activeLabel: s.activeLabel,
          showLabels: s.showLabels,
          showConfidence: s.showConfidence,
          opacity: s.opacity,
          autoSaveMeta: s.autoSaveMeta,
        }),
      }
    )
  )
)

export default useAnnotationStore

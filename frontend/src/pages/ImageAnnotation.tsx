import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { message } from 'antd'
import { v4 as uuid } from 'uuid'
import useAnnotationStore, { Annotation2D } from '../store/annotationStore'
import { useAnnotationHotkeys, useAutoSave, useLoadSaved } from '../hooks/useAnnotation'
import '../components/annotation/annotation.css'

import AnnotationTopBar  from '../components/annotation/AnnotationTopBar'
import AnnotationToolbar from '../components/annotation/AnnotationToolbar'
import Canvas2D          from '../components/annotation/2d/Canvas2D'
import RightPanel        from '../components/annotation/RightPanel'
import ExportPanel       from '../components/annotation/ExportPanel'

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=1280&q=80',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1280&q=80',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80',
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1280&q=80',
  'https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?w=1280&q=80',
]

function makeAIAnnotations(idx: number): Annotation2D[] {
  const templates = [
    [
      { label: 'car',    color: '#00d4ff', pts: [{ x: 120, y: 200 }, { x: 360, y: 380 }], score: 0.94 },
      { label: 'person', color: '#7c3aed', pts: [{ x: 440, y: 120 }, { x: 510, y: 310 }], score: 0.88 },
      { label: 'car',    color: '#00d4ff', pts: [{ x: 600, y: 210 }, { x: 820, y: 370 }], score: 0.91 },
    ],
    [
      { label: 'person', color: '#7c3aed', pts: [{ x: 80,  y: 150 }, { x: 160, y: 350 }], score: 0.82 },
      { label: 'car',    color: '#00d4ff', pts: [{ x: 300, y: 240 }, { x: 550, y: 400 }], score: 0.95 },
    ],
  ]
  return (templates[idx % templates.length] ?? []).map(t => ({
    id: uuid(), type: 'bbox' as const, label: t.label, color: t.color,
    points: t.pts, visible: true, locked: false, score: t.score, isAI: true,
  }))
}

export default function ImageAnnotation() {
  const { taskId = '1001' } = useParams<{ taskId: string }>()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const { annotations2d } = useAnnotationStore()

  useAnnotationHotkeys()
  useAutoSave(taskId)
  useLoadSaved(taskId)

  const currentImage = MOCK_IMAGES[currentIdx % MOCK_IMAGES.length]
  const imageName = `frame_${String(currentIdx + 1).padStart(4, '0')}.jpg`

  function clearFrame() {
    useAnnotationStore.setState({ annotations2d: [], selectedIds2d: [], past: [], future: [] })
  }
  const goNext = () => { setCurrentIdx(i => Math.min(i + 1, MOCK_IMAGES.length - 1)); clearFrame() }
  const goPrev = () => { setCurrentIdx(i => Math.max(i - 1, 0)); clearFrame() }

  function loadAI() {
    setAiLoading(true)
    setTimeout(() => {
      const anns = makeAIAnnotations(currentIdx)
      useAnnotationStore.setState({ annotations2d: anns })
      setAiLoading(false)
      message.success({ content: `AI 预标注完成，生成 ${anns.length} 个候选框`, duration: 3 })
    }, 1100)
  }

  const aiCount     = annotations2d.filter(a => a.isAI).length
  const manualCount = annotations2d.filter(a => !a.isAI).length

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden select-none">
      <AnnotationTopBar
        taskName={`Task #${taskId} — 2D 图像标注`}
        totalImages={MOCK_IMAGES.length}
        currentImage={currentIdx + 1}
        onPrev={goPrev}
        onNext={goNext}
        onExport={() => setShowExport(v => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <AnnotationToolbar />
        <div className="flex-1 relative overflow-hidden">
          <Canvas2D imageUrl={currentImage} />

          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-auto">
            <button
              onClick={loadAI} disabled={aiLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border backdrop-blur-sm transition-all active:scale-95
                ${aiLoading
                  ? 'bg-black/40 border-[#00d4ff]/15 text-[#00d4ff]/40 cursor-not-allowed'
                  : 'bg-black/50 border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/15'}`}
            >
              {aiLoading
                ? <span className="w-3 h-3 border border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
                : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4 8 1z" strokeLinejoin="round"/>
                  </svg>}
              {aiLoading ? 'AI 预标注中…' : 'AI 预标注'}
            </button>
            {aiCount > 0 && (
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-[#00d4ff]/20 text-[#00d4ff]/70 text-[10px] px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
                {aiCount} AI 候选 · {manualCount} 人工确认
              </div>
            )}
          </div>

          {showExport && (
            <div className="absolute top-12 right-4 z-30">
              <ExportPanel taskId={taskId} imageName={imageName} imageWidth={1280} imageHeight={720} onClose={() => setShowExport(false)} />
            </div>
          )}
        </div>
        <RightPanel />
      </div>
    </div>
  )
}

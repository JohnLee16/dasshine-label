import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { message } from 'antd'
import { v4 as uuid } from 'uuid'
import useAnnotationStore from '../store/annotationStore'
import { useAnnotationHotkeys, useAutoSave } from '../hooks/useAnnotation'
import '../components/annotation/annotation.css'

import AnnotationTopBar  from '../components/annotation/AnnotationTopBar'
import AnnotationToolbar from '../components/annotation/AnnotationToolbar'
import Canvas3D          from '../components/annotation/3d/Canvas3D'
import RightPanel        from '../components/annotation/RightPanel'
import ExportPanel       from '../components/annotation/ExportPanel'

export default function PointCloudAnnotation() {
  const { taskId = '1001' } = useParams<{ taskId: string }>()
  const [showExport, setShowExport] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const { boxes3d } = useAnnotationStore()

  useAnnotationHotkeys()
  useAutoSave(taskId)

  // Switch to 3D mode on mount
  useState(() => { useAnnotationStore.getState().setMode('3d') })

  function loadAI3D() {
    setAiLoading(true)
    setTimeout(() => {
      const boxes = [
        { id: uuid(), label: 'car',    color: '#00d4ff', center: { x: 5,  y: 0.75, z: 3  }, size: { x: 4.5, y: 1.5, z: 2   }, rotation: { x: 0, y: 0.2,  z: 0 }, visible: true, locked: false, score: 0.92, isAI: true },
        { id: uuid(), label: 'person', color: '#7c3aed', center: { x: -3, y: 0.9,  z: 6  }, size: { x: 0.6, y: 1.8, z: 0.6 }, rotation: { x: 0, y: 0,    z: 0 }, visible: true, locked: false, score: 0.85, isAI: true },
        { id: uuid(), label: 'truck',  color: '#10b981', center: { x: 10, y: 1.5,  z: -5 }, size: { x: 8,   y: 3,   z: 2.5 }, rotation: { x: 0, y: -0.1, z: 0 }, visible: true, locked: false, score: 0.78, isAI: true },
      ]
      useAnnotationStore.setState({ boxes3d: boxes })
      setAiLoading(false)
      message.success({ content: `AI 3D 预标注完成，生成 ${boxes.length} 个包围盒`, duration: 3 })
    }, 1400)
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden select-none">
      <AnnotationTopBar
        taskName={`Task #${taskId} — 3D 点云标注`}
        totalImages={1}
        currentImage={1}
        onExport={() => setShowExport(v => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <AnnotationToolbar />
        <div className="flex-1 relative overflow-hidden">
          <Canvas3D />

          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-auto">
            <button
              onClick={loadAI3D} disabled={aiLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border backdrop-blur-sm transition-all active:scale-95
                ${aiLoading
                  ? 'bg-black/40 border-[#a78bfa]/15 text-[#a78bfa]/40 cursor-not-allowed'
                  : 'bg-black/50 border-[#a78bfa]/30 text-[#a78bfa] hover:bg-[#7c3aed]/15'}`}
            >
              {aiLoading
                ? <span className="w-3 h-3 border border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
                : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4 8 1z" strokeLinejoin="round"/>
                  </svg>}
              {aiLoading ? 'AI 3D 预标注中…' : 'AI 3D 预标注'}
            </button>
            {boxes3d.filter(b => b.isAI).length > 0 && (
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-[#a78bfa]/20 text-[#a78bfa]/70 text-[10px] px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
                {boxes3d.filter(b => b.isAI).length} AI 候选 3D 框
              </div>
            )}
          </div>

          {showExport && (
            <div className="absolute top-12 right-4 z-30">
              <ExportPanel taskId={taskId} onClose={() => setShowExport(false)} />
            </div>
          )}
        </div>
        <RightPanel />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Slider, Switch } from 'antd'
import useAnnotationStore, { Annotation2D, Box3D, AnnotationDraft } from '../../store/annotationStore'
import DraftListPanel from './DraftListPanel'

// ─── LabelPanel ───────────────────────────────────────────────────────────────

function LabelPanel() {
  const { labelClasses, activeLabel, setActiveLabel } = useAnnotationStore()
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-white/30 uppercase tracking-widest px-1 mb-2">Labels</div>
      {labelClasses.map((lc) => (
        <button
          key={lc.id}
          onClick={() => setActiveLabel(lc.name)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all
            ${activeLabel === lc.name ? 'bg-[#1e1e2e] text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          style={{ boxShadow: activeLabel === lc.name ? `0 0 0 1px ${lc.color}40` : undefined }}
        >
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: lc.color }} />
          <span className="text-xs flex-1">{lc.name}</span>
          {lc.hotkey && <kbd className="text-[10px] opacity-40 bg-white/10 px-1 py-0.5 rounded">{lc.hotkey}</kbd>}
        </button>
      ))}
    </div>
  )
}

// ─── AnnotationList2D ────────────────────────────────────────────────────────

function AnnotationList2D() {
  const { annotations2d, selectedIds2d, selectAnnotations2d, deleteAnnotation2d, updateAnnotation2d } = useAnnotationStore()
  if (annotations2d.length === 0)
    return <div className="text-xs text-white/20 text-center py-6">暂无标注</div>
  return (
    <div className="space-y-1">
      {annotations2d.map((ann) => {
        const isSelected = selectedIds2d.includes(ann.id)
        return (
          <div
            key={ann.id}
            onClick={() => selectAnnotations2d([ann.id])}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group
              ${isSelected ? 'bg-[#1e1e2e]' : 'hover:bg-white/5'}`}
            style={{ boxShadow: isSelected ? `0 0 0 1px ${ann.color}40` : undefined }}
          >
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ann.color }} />
            <span className="text-xs text-white/70 flex-1 truncate">{ann.label}</span>
            <span className="text-[10px] text-white/30">{ann.type}</span>
            {ann.isAI && <span className="text-[10px] text-[#00d4ff]/60">AI</span>}
            {ann.score != null && <span className="text-[10px] text-white/30">{(ann.score * 100).toFixed(0)}%</span>}
            <button
              onClick={(e) => { e.stopPropagation(); updateAnnotation2d(ann.id, { visible: !ann.visible }) }}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteAnnotation2d([ann.id]) }}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M3 3l10 10M3 13L13 3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── AnnotationList3D ────────────────────────────────────────────────────────

function AnnotationList3D() {
  const { boxes3d, selectedIds3d, selectBoxes3d, deleteBox3d, updateBox3d } = useAnnotationStore()
  if (boxes3d.length === 0)
    return <div className="text-xs text-white/20 text-center py-6">暂无 3D 框</div>
  return (
    <div className="space-y-1">
      {boxes3d.map((box) => {
        const isSelected = selectedIds3d.includes(box.id)
        return (
          <div
            key={box.id}
            onClick={() => selectBoxes3d([box.id])}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group
              ${isSelected ? 'bg-[#1e1e2e]' : 'hover:bg-white/5'}`}
            style={{ boxShadow: isSelected ? `0 0 0 1px ${box.color}40` : undefined }}
          >
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: box.color }} />
            <span className="text-xs text-white/70 flex-1 truncate">{box.label}</span>
            <span className="text-[10px] text-white/30">
              {box.size.x.toFixed(1)}×{box.size.y.toFixed(1)}×{box.size.z.toFixed(1)}
            </span>
            {box.isAI && <span className="text-[10px] text-[#00d4ff]/60">AI</span>}
            <button
              onClick={(e) => { e.stopPropagation(); deleteBox3d([box.id]) }}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M3 3l10 10M3 13L13 3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

function SettingsPanel() {
  const { showLabels, showConfidence, opacity, toggleLabels, toggleConfidence, setOpacity } = useAnnotationStore()
  return (
    <div className="space-y-3 pt-3 border-t border-[#1e1e2e]">
      <div className="text-[10px] text-white/30 uppercase tracking-widest">显示设置</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">显示标签</span>
        <Switch size="small" checked={showLabels} onChange={toggleLabels} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">显示置信度</span>
        <Switch size="small" checked={showConfidence} onChange={toggleConfidence} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">填充透明度</span>
          <span className="text-[10px] text-white/30 font-mono">{Math.round(opacity * 100)}%</span>
        </div>
        <Slider min={0} max={1} step={0.05} value={opacity} onChange={setOpacity}
          className="!m-0" tooltip={{ open: false }} />
      </div>
    </div>
  )
}

// ─── RightPanel ───────────────────────────────────────────────────────────────

interface RightPanelProps {
  taskId?: string
}

export default function RightPanel({ taskId = '' }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'labels' | 'list' | 'drafts' | 'settings'>('labels')
  const { mode, annotations2d, boxes3d, autoSaveMeta } = useAnnotationStore()
  const count = mode === '2d' ? annotations2d.length : boxes3d.length

  const TABS = [
    { key: 'labels' as const,   label: '标签' },
    { key: 'list' as const,     label: `列表(${count})` },
    { key: 'drafts' as const,   label: '草稿', badge: autoSaveMeta.isDirty },
    { key: 'settings' as const, label: '设置' },
  ]

  return (
    <div className="w-60 flex flex-col bg-[#12121a] border-l border-[#1e1e2e] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#1e1e2e]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-[11px] relative transition-all
              ${activeTab === tab.key
                ? 'text-[#00d4ff] border-b-2 border-[#00d4ff] -mb-px'
                : 'text-white/30 hover:text-white/60'}`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {activeTab === 'labels'   && <LabelPanel />}
        {activeTab === 'list'     && (mode === '2d' ? <AnnotationList2D /> : <AnnotationList3D />)}
        {activeTab === 'drafts'   && <DraftListPanel taskId={taskId} />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

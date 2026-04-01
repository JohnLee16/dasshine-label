import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const MOCK_PROJECTS = [
  { id: 1, name: '自动驾驶场景标注', type: 'bbox',    status: 'active',   tasks: 5000, done: 3240, members: 12, reward: 0.8 },
  { id: 2, name: '点云 3D 目标检测', type: 'box3d',   status: 'active',   tasks: 1200, done: 480,  members: 6,  reward: 1.5 },
  { id: 3, name: '行人关键点检测',   type: 'keypoint',status: 'active',   tasks: 800,  done: 800,  members: 4,  reward: 0.6 },
  { id: 4, name: '交通标志分类',     type: 'bbox',    status: 'paused',   tasks: 3000, done: 1100, members: 8,  reward: 0.5 },
  { id: 5, name: '道路分割标注',     type: 'polygon', status: 'completed',tasks: 2000, done: 2000, members: 10, reward: 1.2 },
]

const TYPE_LABELS: Record<string, string> = {
  bbox: '2D 矩形框', box3d: '3D 包围盒', keypoint: '关键点', polygon: '多边形', polyline: '折线',
}
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: '进行中', color: '#10b981' },
  paused:    { label: '已暂停', color: '#f59e0b' },
  completed: { label: '已完成', color: '#9ba0ad' },
  draft:     { label: '草稿',   color: '#5c6070' },
}

export default function Projects() {
  const navigate = useNavigate()

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">项目管理</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 hover:bg-[#00d4ff]/20 transition-all">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          新建项目
        </button>
      </div>

      <div className="space-y-3">
        {MOCK_PROJECTS.map(p => {
          const st = STATUS_CONFIG[p.status]
          const progress = Math.round((p.done / p.tasks) * 100)
          return (
            <div key={p.id}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-white/20 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {p.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-xs text-white/30">
                    {TYPE_LABELS[p.type]} · {p.members} 位标注员 · ¥{p.reward}/任务
                  </div>
                </div>
                {p.status === 'active' && (
                  <button
                    onClick={() => navigate(p.type === 'box3d' ? `/annotate-3d/100${p.id}` : `/annotate-image/100${p.id}`)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20
                      hover:bg-[#00d4ff]/20 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                  >
                    进入标注
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span>{p.done.toLocaleString()} / {p.tasks.toLocaleString()} 任务</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100 ? '#10b981' : 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

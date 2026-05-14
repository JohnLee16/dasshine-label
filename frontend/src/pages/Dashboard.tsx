import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const LEVEL_COLORS: Record<string, string> = {
  novice: '#9ba0ad', junior: '#10b981', intermediate: '#00d4ff',
  senior: '#a78bfa', expert: '#f59e0b',
}

type WorkbenchItem = {
  id: string
  label: string
  desc: string
  href: string
  color: string
  icon: string
}

/** 四种标注模态入口 — 均从主页可进入 */
const WORKBENCH: WorkbenchItem[] = [
  { id: '2d', label: '2D 图像标注', desc: '矩形框 / 多边形 / 关键点', href: '/annotate-image/1001', color: '#00d4ff', icon: '◧' },
  { id: '3d', label: '3D 点云标注', desc: '三维包围盒', href: '/annotate-3d/1002', color: '#a78bfa', icon: '⬡' },
  { id: 'embodied', label: '具身数据标注', desc: '机器人视觉与 3D 工作台', href: '/embodied', color: '#f97316', icon: '◆' },
  { id: 'nlp', label: '语言标注', desc: '语料项目与任务入口', href: '/language', color: '#ec4899', icon: '≡' },
]

type ProjectShortcut = { id: string; label: string; category: string }

/** 项目分类直达（与项目管理页筛选一致） */
const PROJECT_CATEGORY_SHORTCUTS: ProjectShortcut[] = [
  { id: 'image_2d', label: '图像 2D', category: 'image_2d' },
  { id: 'pointcloud_3d', label: '3D 点云', category: 'pointcloud_3d' },
  { id: 'embodied', label: '具身', category: 'embodied' },
  { id: 'nlp', label: '语料', category: 'nlp' },
  { id: 'video', label: '视频', category: 'video' },
  { id: 'audio', label: '语音', category: 'audio' },
  { id: 'ocr', label: 'OCR', category: 'ocr' },
  { id: 'multimodal', label: '多模态', category: 'multimodal' },
]

function QuickCard({
  item,
  onNavigate,
}: {
  item: WorkbenchItem
  onNavigate: (href: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      className="flex items-center gap-4 p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-left
        hover:border-white/20 active:scale-[0.98] transition-all group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${item.color}15`, border: `1px solid ${item.color}30`, color: item.color }}
      >
        {item.icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{item.label}</div>
        <div className="text-xs text-white/30 mt-0.5">{item.desc}</div>
      </div>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
        className="w-4 h-4 text-white/20 group-hover:text-white/50 ml-auto flex-shrink-0 transition-colors">
        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const color = LEVEL_COLORS[user?.level ?? 'novice']
  const isAdmin = user?.is_admin ?? false

  const stats = [
    { label: '今日任务', value: user?.active_tasks ?? 0,      unit: '个', color: '#00d4ff' },
    { label: '累计完成', value: user?.total_completed ?? 0,   unit: '个', color: '#10b981' },
    { label: '准确率',   value: `${((user?.accuracy_rate ?? 0.6) * 100).toFixed(1)}`, unit: '%', color: '#a78bfa' },
    { label: '累计收益', value: `¥${(user?.total_earnings ?? 0).toFixed(2)}`, unit: '', color: '#f59e0b' },
  ]

  return (
    <div className="p-8 space-y-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          你好，<span style={{ color }}>{user?.username ?? '标注员'}</span> 👋
        </h1>
        <p className="text-sm text-white/30 mt-1">
          当前等级：<span className="font-medium" style={{ color }}>{user?.level ?? 'novice'}</span>
          　·　今日继续加油！
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <div className="text-[11px] text-white/30 mb-2">{s.label}</div>
            <div className="text-2xl font-semibold font-mono" style={{ color: s.color }}>
              {s.value}<span className="text-sm font-normal text-white/30 ml-1">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 标注工作台 */}
      <section>
        <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-widest">标注工作台</h2>
        <p className="text-xs text-white/25 -mt-2 mb-4">2D、3D、具身、语言四类入口均可由此进入</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WORKBENCH.map(item => (
            <QuickCard key={item.id} item={item} onNavigate={navigate} />
          ))}
        </div>
      </section>

      {/* 项目与任务 */}
      <section>
        <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-widest">项目与任务</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="flex items-center gap-4 p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-left
              hover:border-white/20 active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
              bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-[#f59e0b]">
              ◈
            </div>
            <div>
              <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">项目总览</div>
              <div className="text-xs text-white/30 mt-0.5">搜索、状态筛选、分类筛选与卡片总览</div>
            </div>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="w-4 h-4 text-white/20 group-hover:text-white/50 ml-auto transition-colors">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-4 p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-left
              hover:border-white/20 active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
              bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981]">
              ☰
            </div>
            <div>
              <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">任务列表</div>
              <div className="text-xs text-white/30 mt-0.5">领取待办、继续进行中与审核中的任务</div>
            </div>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="w-4 h-4 text-white/20 group-hover:text-white/50 ml-auto transition-colors">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/projects?action=create')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-xl text-sm font-medium
              bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/25 hover:border-[#00d4ff]/50
              active:scale-[0.98] transition-all"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            新建项目（打开创建向导）
          </button>
        )}

        <div className="text-[11px] text-white/35 mb-2">按分类进入项目列表</div>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORY_SHORTCUTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/projects?category=${s.category}`)}
              className="px-3 py-1.5 rounded-full text-xs bg-[#12121a] border border-[#1e1e2e] text-white/45
                hover:text-white/75 hover:border-white/20 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

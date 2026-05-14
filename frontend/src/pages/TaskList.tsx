import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

type Status = 'all' | 'pending' | 'in_progress' | 'submitted' | 'approved'

const MOCK_TASKS = [
  { id: 1001, project: '自动驾驶场景标注', type: '2D BBox', status: 'pending',     priority: 'high',   reward: 0.8 },
  { id: 1002, project: '点云 3D 标注',     type: '3D Box', status: 'in_progress', priority: 'medium', reward: 1.5 },
  { id: 1003, project: '行人检测',         type: '2D 多边形', status: 'submitted', priority: 'low',    reward: 0.5 },
  { id: 1004, project: '交通标志识别',     type: '2D BBox', status: 'approved',   priority: 'high',   reward: 0.8 },
  { id: 1005, project: '自动驾驶场景标注', type: '2D BBox', status: 'pending',     priority: 'medium', reward: 0.8 },
  { id: 1006, project: '点云 3D 标注',     type: '3D Box', status: 'pending',     priority: 'high',   reward: 1.5 },
  { id: 1007, project: '双臂抓取仿真',     type: '具身 2D+3D', status: 'pending', priority: 'high',   reward: 2.0 },
  { id: 1008, project: '家庭服务机器人',   type: '具身 3D', status: 'in_progress', priority: 'medium', reward: 1.8 },
  { id: 1009, project: '客服对话 NER',     type: 'NER', status: 'pending', priority: 'medium', reward: 0.6 },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:     { label: '待领取', color: '#f59e0b' },
  in_progress: { label: '进行中', color: '#00d4ff' },
  submitted:   { label: '审核中', color: '#a78bfa' },
  approved:    { label: '已完成', color: '#10b981' },
}
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: '高',  color: '#ef4444' },
  medium: { label: '中',  color: '#f59e0b' },
  low:    { label: '低',  color: '#9ba0ad' },
}

export default function TaskList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeStatus, setActiveStatus] = useState<Status>('all')

  const fromProject = (location.state as { fromProject?: string } | null)?.fromProject

  const baseTasks = useMemo(() => {
    if (!fromProject) return MOCK_TASKS
    return MOCK_TASKS.filter(t => t.project === fromProject)
  }, [fromProject])

  const filtered = baseTasks.filter(t => activeStatus === 'all' || t.status === activeStatus)

  const TABS: { key: Status; label: string }[] = [
    { key: 'all',         label: `全部 (${baseTasks.length})` },
    { key: 'pending',     label: `待领取 (${baseTasks.filter(t => t.status === 'pending').length})` },
    { key: 'in_progress', label: '进行中' },
    { key: 'submitted',   label: '审核中' },
    { key: 'approved',    label: '已完成' },
  ]

  function startTask(task: typeof MOCK_TASKS[0]) {
    if (task.type === 'NER' || task.type.includes('语料')) {
      navigate('/language')
      return
    }
    if (task.type.includes('具身')) {
      navigate('/embodied')
      return
    }
    if (task.type.includes('3D')) {
      navigate(`/annotate-3d/${task.id}`)
    } else {
      navigate(`/annotate-image/${task.id}`)
    }
  }

  function clearProjectFilter() {
    navigate('/tasks', { replace: true, state: {} })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">任务列表</h1>
        {fromProject && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40">已筛选项目</span>
            <span className="text-xs px-2 py-1 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/25 max-w-[240px] truncate">
              {fromProject}
            </span>
            <button
              type="button"
              onClick={clearProjectFilter}
              className="text-xs text-white/35 hover:text-white/60 underline underline-offset-2"
            >
              显示全部任务
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#12121a] border border-[#1e1e2e] rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all
              ${activeStatus === tab.key
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] ring-1 ring-[#00d4ff]/20'
                : 'text-white/40 hover:text-white/70'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              {['任务 ID', '项目', '类型', '优先级', '状态', '奖励', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] text-white/30 font-medium uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">
                  {fromProject ? '该项目暂无匹配任务，可返回项目总览或清除筛选。' : '暂无任务'}
                </td>
              </tr>
            ) : (
              filtered.map((task, i) => {
              const st = STATUS_CONFIG[task.status]
              const pr = PRIORITY_CONFIG[task.priority]
              return (
                <tr key={task.id}
                  className={`border-b border-[#1e1e2e]/50 hover:bg-white/[0.02] transition-colors
                    ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3 font-mono text-white/50 text-xs">#{task.id}</td>
                  <td className="px-4 py-3 text-white/70">{task.project}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{task.type}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${pr.color}15`, color: pr.color }}>
                      {pr.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#10b981] font-mono text-xs">¥{task.reward}</td>
                  <td className="px-4 py-3">
                    {(task.status === 'pending' || task.status === 'in_progress') && (
                      <button
                        onClick={() => startTask(task)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20
                          hover:bg-[#00d4ff]/20 active:scale-95 transition-all"
                      >
                        开始标注
                      </button>
                    )}
                  </td>
                </tr>
              )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

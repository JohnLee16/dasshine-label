import { useNavigate } from 'react-router-dom'

const ACCENT = '#f97316'

const ENTRIES = [
  {
    label: '具身 Episode（多视角 API）',
    desc: '与后端 manifest / 草稿同步；时间片段、多路流清单',
    href: '/annotate-embodied/1001',
    color: ACCENT,
    icon: '⎘',
  },
  {
    label: '2D 图像标注',
    desc: '第一视角 / 腕部相机画面，框选与多边形',
    href: '/annotate-image/1001',
    color: '#00d4ff',
    icon: '◧',
  },
  {
    label: '3D 点云标注',
    desc: '机器人工作区深度 / LiDAR，三维包围盒',
    href: '/annotate-3d/1002',
    color: '#a78bfa',
    icon: '⬡',
  },
  {
    label: '任务列表',
    desc: '领取与继续具身相关标注任务',
    href: '/tasks',
    color: '#10b981',
    icon: '☰',
  },
  {
    label: '具身项目',
    desc: '在项目管理中筛选「具身机器人」类别',
    href: '/projects?category=embodied',
    color: ACCENT,
    icon: '◆',
  },
] as const

export default function EmbodiedHub() {
  const navigate = useNavigate()

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
            style={{
              background: `${ACCENT}18`,
              color: ACCENT,
              border: `1px solid ${ACCENT}35`,
            }}
          >
            Embodied AI
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">
          具身数据标注
        </h1>
        <p className="text-sm text-white/30 mt-2 leading-relaxed max-w-2xl">
          具身智能数据通常包含<strong className="text-white/45 font-medium">视觉观测</strong>与
          <strong className="text-white/45 font-medium">三维空间</strong>两类模态。
          本平台将具身项目作为独立类别管理；具体框选、轨迹与动作序列仍在 2D / 3D 工作台中完成，
          与自动驾驶等任务共用同一套标注工具。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '支持模态', value: '2D + 3D', sub: '可组合项目' },
          { label: '项目类型', value: '轨迹 / 动作 / 抓取 / 场景', sub: '创建项目时选择' },
          { label: '工具链', value: '与通用标注一致', sub: '快捷键与导出相同' },
          { label: '数据导入', value: 'ZIP / COCO 等', sub: '按项目配置' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
            <div className="text-[11px] text-white/30 mb-2">{s.label}</div>
            <div className="text-sm font-medium text-white/80 leading-snug">{s.value}</div>
            <div className="text-[10px] text-white/20 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-widest">
          进入工作台
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ENTRIES.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => navigate(l.href)}
              className="flex items-center gap-4 p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-left
                hover:border-white/20 active:scale-[0.98] transition-all group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: `${l.color}15`,
                  border: `1px solid ${l.color}30`,
                  color: l.color,
                }}
              >
                {l.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {l.label}
                </div>
                <div className="text-xs text-white/30 mt-0.5">{l.desc}</div>
              </div>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4 text-white/20 group-hover:text-white/50 ml-auto flex-shrink-0 transition-colors"
              >
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/20">
        新建具身类项目：工作台「项目与任务」→ 项目总览或「新建项目」→ 数据类型选「具身机器人」，再选轨迹、动作序列、抓取或场景理解等标注方式。
      </p>
    </div>
  )
}

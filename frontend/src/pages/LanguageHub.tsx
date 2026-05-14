import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const ACCENT = '#ec4899'

export default function LanguageHub() {
  const navigate = useNavigate()
  const isAdmin = useAuthStore(s => s.user?.is_admin ?? false)

  const entries = [
    {
      label: '任务列表',
      desc: '领取 NER、分类、摘要、翻译等语料任务',
      href: '/tasks',
      color: '#10b981',
      icon: '☰',
    },
    {
      label: '语料项目',
      desc: '在项目管理中筛选「语料」类别',
      href: '/projects?category=nlp',
      color: ACCENT,
      icon: '≡',
    },
    {
      label: isAdmin ? '新建语料项目' : '语料项目总览',
      desc: isAdmin ? '管理员：打开创建向导并选择语料类型' : '查看语料类项目（创建需管理员）',
      href: isAdmin ? '/projects?action=create' : '/projects?category=nlp',
      color: '#f59e0b',
      icon: '+',
    },
  ] as const

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider inline-block mb-2"
          style={{
            background: `${ACCENT}18`,
            color: ACCENT,
            border: `1px solid ${ACCENT}35`,
          }}
        >
          NLP
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">语言标注</h1>
        <p className="text-sm text-white/30 mt-2 leading-relaxed max-w-2xl">
          语料类标注（命名实体、关系抽取、情感、文本分类、问答对等）在项目中配置 schema 与导入格式；
          当前前端以<strong className="text-white/45 font-medium">任务领取 + 项目维度管理</strong>为主入口，
          独立文本标注画布可在后续版本接入同一任务流。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {entries.map((l) => (
          <button
            key={l.label}
            type="button"
            onClick={() => navigate(l.href)}
            className="flex items-center gap-4 p-4 bg-[#12121a] border border-[#1e1e2e] rounded-xl text-left
              hover:border-white/20 active:scale-[0.98] transition-all group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-mono flex-shrink-0"
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
              className="w-4 h-4 text-white/20 group-hover:text-white/50 ml-auto flex-shrink-0"
            >
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>

      <p className="text-xs text-white/20">
        非管理员请从「任务列表」进入已分派的语料任务；创建项目需管理员权限。
      </p>
    </div>
  )
}

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useEmbodiedTask } from '../hooks/useEmbodiedTask'
import type { TemporalSegment } from '../types/embodied'
import { EMBODIED_SCHEMA_VERSION } from '../types/embodied'

const ACCENT = '#f97316'

function newId(prefix: string) {
  return `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`
}

export default function EmbodiedAnnotationWorkspace() {
  const { taskId: raw } = useParams<{ taskId: string }>()
  const taskId = useMemo(() => Number.parseInt(raw ?? '', 10), [raw])
  const { manifest, annotation, setAnnotation, savedAt, loading, saving, error, save, reload } = useEmbodiedTask(taskId)

  const addSegment = () => {
    const seg: TemporalSegment = {
      id: newId('seg'),
      label: '新阶段',
      t_start: 0,
      t_end: 1,
    }
    setAnnotation((prev) => ({
      ...prev,
      schema_version: EMBODIED_SCHEMA_VERSION,
      segments: [...prev.segments, seg],
    }))
  }

  const updateSegment = (id: string, patch: Partial<TemporalSegment>) => {
    setAnnotation((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  const removeSegment = (id: string) => {
    setAnnotation((prev) => ({
      ...prev,
      segments: prev.segments.filter((s) => s.id !== id),
    }))
  }

  const handleSave = async () => {
    await save()
    toast.success('已同步到后端')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white/90 flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur shrink-0">
        <Link to="/embodied" className="text-xs text-white/40 hover:text-white/70">
          ← 具身中心
        </Link>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
          style={{
            background: `${ACCENT}18`,
            color: ACCENT,
            border: `1px solid ${ACCENT}35`,
          }}
        >
          Episode API
        </span>
        <h1 className="text-sm font-medium text-white/80">任务 #{raw}</h1>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void reload()}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
        >
          重新加载
        </button>
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void handleSave().catch(() => toast.error('保存失败'))}
          className="text-xs px-4 py-1.5 rounded-lg bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30 disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存草稿'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-[#1e1e2e] p-4 overflow-y-auto shrink-0 bg-[#12121a]/50">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Manifest</div>
          {loading && <p className="text-xs text-white/30">加载中…</p>}
          {!loading && manifest && (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-white/35">episode_id</span>
                <div className="text-white/75 font-mono truncate">{manifest.episode_id}</div>
              </div>
              <div>
                <span className="text-white/35">sync_mode</span>
                <div className="text-[#00d4ff]">{manifest.sync_mode}</div>
              </div>
              <div>
                <span className="text-white/35">ref_stream_id</span>
                <div className="text-white/75 font-mono">{manifest.ref_stream_id}</div>
              </div>
              <div>
                <span className="text-white/35">frame_count</span>
                <div>{manifest.frame_count}</div>
              </div>
              <div>
                <span className="text-white/35 mb-1 block">streams ({manifest.streams.length})</span>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {manifest.streams.map((s) => (
                    <li
                      key={s.id}
                      className="px-2 py-1.5 rounded-md bg-white/5 border border-white/5 text-[11px]"
                    >
                      <span className="text-white/60">{s.label || s.id}</span>
                      <span className="text-white/25 mx-1">·</span>
                      <span className="text-white/35">{s.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
          <p className="text-sm text-white/40 mb-6 max-w-2xl leading-relaxed">
            本页与后端 <code className="text-[#00d4ff]/80">GET/PUT /tasks/:id/embodied/*</code> 联调：
            多视角清单来自任务数据；时间片段等写入任务 metadata 草稿，后续可与正式提交合并。
          </p>

          {error && (
            <div className="mb-4 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/70">时间片段（segments）</h2>
            <button
              type="button"
              onClick={addSegment}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:text-white hover:border-white/25"
            >
              + 添加片段
            </button>
          </div>

          <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-white/35 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 font-medium">label</th>
                  <th className="px-3 py-2 font-medium w-24">t_start</th>
                  <th className="px-3 py-2 font-medium w-24">t_end</th>
                  <th className="px-3 py-2 font-medium w-32">stream</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {annotation.segments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-white/25">
                      暂无片段，点击「添加片段」开始标注
                    </td>
                  </tr>
                )}
                {annotation.segments.map((s) => (
                  <tr key={s.id} className="border-t border-[#1e1e2e] hover:bg-white/[0.02]">
                    <td className="px-3 py-2">
                      <input
                        value={s.label}
                        onChange={(e) => updateSegment(s.id, { label: e.target.value })}
                        className="w-full bg-transparent border border-transparent hover:border-white/10 rounded px-1 py-0.5 focus:border-[#00d4ff]/50 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={s.t_start}
                        onChange={(e) => updateSegment(s.id, { t_start: Number(e.target.value) })}
                        className="w-full bg-transparent border border-white/10 rounded px-1 py-0.5 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={s.t_end}
                        onChange={(e) => updateSegment(s.id, { t_end: Number(e.target.value) })}
                        className="w-full bg-transparent border border-white/10 rounded px-1 py-0.5 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={s.stream_id ?? ''}
                        placeholder="可选"
                        onChange={(e) =>
                          updateSegment(s.id, { stream_id: e.target.value || undefined })
                        }
                        className="w-full bg-transparent border border-white/10 rounded px-1 py-0.5 font-mono text-[11px]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeSegment(s.id)}
                        className="text-white/25 hover:text-red-400/90"
                      >
                        删
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-white/25 mt-4">
            上次服务端确认时间：{savedAt ?? '—'}
          </p>
        </main>
      </div>
    </div>
  )
}

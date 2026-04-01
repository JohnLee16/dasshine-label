import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('两次密码不一致'); return }
    setError(''); setLoading(true)
    try {
      await api.post('/auth/register', {
        username: form.username, email: form.email, password: form.password,
      })
      navigate('/login')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-sm bg-[#a78bfa]" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Dasshine Label</span>
          </div>
          <p className="text-sm text-white/30">创建新账户</p>
        </div>

        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'username', label: '用户名', type: 'text', placeholder: '3-64 个字符' },
              { key: 'email',    label: '邮箱',   type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: '密码',   type: 'password', placeholder: '至少 6 位' },
              { key: 'confirm',  label: '确认密码', type: 'password', placeholder: '再输一次' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-white/40 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  required
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20
                    focus:outline-none focus:border-[#a78bfa]/50 focus:ring-1 focus:ring-[#a78bfa]/20 transition-all"
                />
              </div>
            ))}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]
                bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30
                hover:bg-[#7c3aed]/25 hover:border-[#7c3aed]/50
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '注册中…' : '注册'}
            </button>
          </form>
          <div className="mt-4 text-center text-xs text-white/30">
            已有账户？{' '}
            <Link to="/login" className="text-[#a78bfa]/70 hover:text-[#a78bfa] transition-colors">登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FolderKanban, 
  ClipboardList, 
  LogOut,
  Menu,
  X,
  Zap,
  User,
  Box
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { authApi } from '../services/api'

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, setUser } = useAuthStore()

  // 获取当前用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authApi.getMe()
        setUser(response.data)
      } catch (error) {
        // Token 无效，会被拦截器处理
      }
    }
    fetchUser()
  }, [setUser])

  const menuItems = [
    { key: '/', icon: LayoutDashboard, label: '工作台' },
    { key: '/projects', icon: FolderKanban, label: '项目管理' },
    { key: '/tasks', icon: ClipboardList, label: '任务列表' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'manager': '项目经理',
      'annotator': '标注员',
      'reviewer': '审核员',
    }
    return labels[role || ''] || '用户'
  }

  const getLevelLabel = (level?: string) => {
    const labels: Record<string, string> = {
      'novice': '新手',
      'junior': '初级',
      'intermediate': '中级',
      'senior': '高级',
      'expert': '专家',
    }
    return labels[level || ''] || level
  }

  return (
    <div className="min-h-screen bg-ds-dark tech-grid flex">
      {/* 侧边栏 */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-ds-card/95 backdrop-blur-xl border-r border-ds-border z-50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center px-6 border-b border-ds-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ds-primary to-ds-secondary flex items-center justify-center shadow-lg shadow-ds-primary/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-lg font-bold text-white tracking-tight">
                  Dasshine
                </div>
                <div className="text-xs text-ds-primary font-mono tracking-wider">
                  LABEL
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.key
            return (
              <Link
                key={item.key}
                to={item.key}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-ds-primary/20 to-transparent border-l-2 border-ds-primary text-ds-primary' 
                    : 'text-ds-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-ds-primary' : ''
                }`} />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 底部信息 */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-ds-border ${collapsed ? 'hidden lg:block' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ds-secondary to-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.username || '用户'}</div>
                <div className="text-xs text-ds-primary">{getLevelLabel(user?.level) || getRoleLabel(user?.role)}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-ds-text-muted hover:text-ds-danger hover:bg-ds-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>退出登录</span>}
          </button>
        </div>

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-ds-card border border-ds-border rounded-full items-center justify-center text-ds-text-muted hover:text-ds-primary transition-colors"
        >
          <div className={`transform transition-transform ${collapsed ? 'rotate-180' : ''}`}>
            <Menu className="w-3 h-3" />
          </div>
        </button>
      </aside>

      {/* 遮罩层 */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${
        collapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        {/* 顶部栏 */}
        <header className="h-16 bg-ds-card/50 backdrop-blur-xl border-b border-ds-border flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-ds-text-muted hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-ds-primary/10 rounded-full border border-ds-primary/20">
              <div className="w-2 h-2 rounded-full bg-ds-success animate-pulse" />
              <span className="text-xs text-ds-primary font-mono">系统正常</span>
            </div>
            <div className="text-sm text-ds-text-muted">
              {new Date().toLocaleDateString('zh-CN')}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout

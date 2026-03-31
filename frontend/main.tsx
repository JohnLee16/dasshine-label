import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import './index.css'
import './styles/theme.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Ant Design 主题配置组件
const AntdThemeConfig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme()

  const theme = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#00d4ff' : '#0891b2',
      colorSuccess: isDark ? '#10b981' : '#059669',
      colorWarning: isDark ? '#f59e0b' : '#d97706',
      colorError: isDark ? '#ef4444' : '#dc2626',
      colorInfo: isDark ? '#00d4ff' : '#0891b2',
      colorBgBase: isDark ? '#0a0a0f' : '#f8fafc',
      colorBgContainer: isDark ? '#12121a' : '#ffffff',
      colorBgElevated: isDark ? '#1a1a25' : '#f1f5f9',
      colorBorder: isDark ? '#1e1e2e' : '#e2e8f0',
      colorText: isDark ? '#e2e8f0' : '#1e293b',
      colorTextSecondary: isDark ? '#94a3b8' : '#475569',
      borderRadius: 8,
      wireframe: false,
    },
  }

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      {children}
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AntdThemeConfig>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntdThemeConfig>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

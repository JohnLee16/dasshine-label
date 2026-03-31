import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  themeMode: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// 获取系统默认主题
const getSystemTheme = (): ThemeMode => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// 从 localStorage 读取主题设置
const getStoredTheme = (): ThemeMode | null => {
  try {
    const stored = localStorage.getItem('dasshine-theme')
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // localStorage 不可用
  }
  return null
}

// 保存主题设置
const storeTheme = (mode: ThemeMode) => {
  try {
    localStorage.setItem('dasshine-theme', mode)
  } catch {
    // localStorage 不可用
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return getStoredTheme() || getSystemTheme()
  })

  const isDark = themeMode === 'dark'

  useEffect(() => {
    // 应用主题到 document
    document.documentElement.setAttribute('data-theme', themeMode)
    storeTheme(themeMode)
    
    // 更新 body 背景色
    document.body.style.backgroundColor = isDark ? '#0a0a0f' : '#f8fafc'
    document.body.style.color = isDark ? '#e2e8f0' : '#1e293b'
  }, [themeMode, isDark])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // 只有在用户没有手动设置主题时才跟随系统
      if (!getStoredTheme()) {
        setThemeMode(mediaQuery.matches ? 'dark' : 'light')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 自定义 Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext

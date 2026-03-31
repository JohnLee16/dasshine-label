/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量支持主题切换
        'ds-dark': 'var(--ds-bg-base)',
        'ds-card': 'var(--ds-bg-card)',
        'ds-elevated': 'var(--ds-bg-elevated)',
        'ds-border': 'var(--ds-border)',
        'ds-primary': 'var(--ds-primary)',
        'ds-secondary': 'var(--ds-secondary)',
        'ds-accent': 'var(--ds-warning)',
        'ds-success': 'var(--ds-success)',
        'ds-danger': 'var(--ds-danger)',
        'ds-warning': 'var(--ds-warning)',
        'ds-info': 'var(--ds-info)',
        'ds-text': 'var(--ds-text)',
        'ds-text-secondary': 'var(--ds-text-secondary)',
        'ds-text-muted': 'var(--ds-text-muted)',
        // 保持向后兼容
        'ds-dark-solid': '#0a0a0f',
        'ds-card-solid': '#12121a',
        'ds-primary-solid': '#00d4ff',
        'ds-secondary-solid': '#7c3aed',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-tech': 'linear-gradient(135deg, var(--ds-primary) 0%, var(--ds-secondary) 100%)',
        'gradient-dark': 'linear-gradient(180deg, var(--ds-bg-base) 0%, var(--ds-bg-card) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px var(--ds-primary), 0 0 10px var(--ds-primary)' },
          '100%': { boxShadow: '0 0 20px var(--ds-primary), 0 0 30px var(--ds-secondary)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  // 确保 CSS 变量优先级
  corePlugins: {
    textOpacity: true,
    backgroundOpacity: true,
  },
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Form, message } from 'antd'
import { Zap, Eye, EyeOff, Lock, User } from 'lucide-react'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      // TODO: 调用实际登录API
      await new Promise(resolve => setTimeout(resolve, 1000))
      localStorage.setItem('token', 'mock-token')
      message.success('登录成功')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ds-dark tech-grid flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ds-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ds-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-ds-primary to-ds-secondary mb-6 shadow-2xl shadow-ds-primary/30">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Dasshine Label
          </h1>
          <p className="text-ds-text-muted">
            智能标注与分发平台
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="gradient-border p-8">
          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            className="space-y-6"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<User className="w-5 h-5 text-ds-text-muted" />}
                placeholder="用户名"
                size="large"
                className="bg-ds-dark border-ds-border hover:border-ds-primary focus:border-ds-primary"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input
                prefix={<Lock className="w-5 h-5 text-ds-text-muted" />}
                type={showPassword ? 'text' : 'password'}
                placeholder="密码"
                size="large"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-ds-text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                className="bg-ds-dark border-ds-border hover:border-ds-primary focus:border-ds-primary"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="w-full h-12 text-lg font-medium bg-gradient-to-r from-ds-primary to-ds-secondary border-0 hover:opacity-90 btn-tech"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ds-text-muted">
              还没有账号？
              <a href="#" className="text-ds-primary hover:text-ds-secondary transition-colors">
                立即注册
              </a>
            </p>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-xs text-ds-text-muted">
          <p>© 2026 Dasshine Label. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-ds-primary">隐私政策</a>
            <a href="#" className="hover:text-ds-primary">服务条款</a>
            <a href="#" className="hover:text-ds-primary">帮助中心</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

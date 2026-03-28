import React from 'react'
import { Link } from 'react-router-dom'
import { Card, Progress, Statistic, Row, Col } from 'antd'
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Award,
  Clock,
  CheckCircle2,
  BarChart3,
  ArrowRight
} from 'lucide-react'

const Dashboard: React.FC = () => {
  // 模拟统计数据
  const stats = {
    todayTasks: 12,
    completed: 8,
    accuracy: 96.5,
    earnings: 128.50,
    level: '中级标注员',
    totalTasks: 156,
  }

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden gradient-border p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ds-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ds-primary to-ds-secondary flex items-center justify-center shadow-lg shadow-ds-primary/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">欢迎回到 Dasshine Label</h1>
              <p className="text-ds-text-muted">今天也是高效标注的一天 💪</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-ds-primary/20 text-ds-primary rounded-full text-sm font-medium">
              {stats.level}
            </span>
            <span className="text-ds-text-muted text-sm">
              已完成 {stats.totalTasks} 个任务
            </span>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="gradient-border card-hover bg-transparent">
            <Statistic
              title={<span className="text-ds-text-muted flex items-center gap-2"><Target className="w-4 h-4" /> 今日任务</span>}
              value={stats.todayTasks}
              className="text-white"
              valueStyle={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="gradient-border card-hover bg-transparent">
            <Statistic
              title={<span className="text-ds-text-muted flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> 已完成</span>}
              value={stats.completed}
              suffix={`/ ${stats.todayTasks}`}
              className="text-white"
              valueStyle={{ color: '#00d4ff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="gradient-border card-hover bg-transparent">
            <Statistic
              title={<span className="text-ds-text-muted flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 准确率</span>}
              value={stats.accuracy}
              suffix="%"
              className="text-white"
              valueStyle={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold' }}
            />
            <Progress percent={stats.accuracy} strokeColor="#10b981" showInfo={false} className="mt-2" />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="gradient-border card-hover bg-transparent">
            <Statistic
              title={<span className="text-ds-text-muted flex items-center gap-2"><Award className="w-4 h-4" /> 今日收益</span>}
              value={stats.earnings}
              prefix="¥"
              precision={2}
              className="text-white"
              valueStyle={{ color: '#f59e0b', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="grid grid-cols-3 gap-6">
        {/* 快速操作 */}
        <div className="col-span-2 gradient-border p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-ds-primary" />
            快速开始
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: '法律文书实体识别', type: 'NER', count: 23, color: 'from-blue-500 to-cyan-500' },
              { title: '医疗病历分类', type: '文本分类', count: 15, color: 'from-purple-500 to-pink-500' },
              { title: '电商评论情感分析', type: '情感分析', count: 8, color: 'from-orange-500 to-red-500' },
              { title: '金融公告摘要', type: '文本摘要', count: 12, color: 'from-green-500 to-emerald-500' },
            ].map((project, index) => (
              <Link
                key={index}
                to="/tasks"
                className="group relative overflow-hidden rounded-xl bg-ds-card p-4 hover:bg-ds-card/80 transition-all card-hover"
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${project.color}`} />
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white group-hover:text-ds-primary transition-colors">{project.title}</h3>
                    <p className="text-sm text-ds-text-muted mt-1">{project.type}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-ds-primary">
                    <span className="text-lg font-bold">{project.count}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-ds-text-muted">{project.count} 个待标注任务</div>
              </Link>
            ))}
          </div>
        </div>

        {/* 等级进度 */}
        <div className="gradient-border p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-ds-secondary" />
            等级进度
          </h2>
          
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-ds-primary/20 to-ds-secondary/20 border-2 border-ds-primary/30 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-ds-primary">Lv.3</div>
                <div className="text-xs text-ds-text-muted">中级</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ds-text-muted">当前经验</span>
                <span className="text-white">1,280 / 2,000</span>
              </div>
              
              <Progress 
                percent={64} 
                strokeColor={{ from: '#00d4ff', to: '#7c3aed' }}
                showInfo={false}
              />
              
              <p className="text-xs text-ds-text-muted mt-2">
                再完成 720 XP 升级到高级标注员
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

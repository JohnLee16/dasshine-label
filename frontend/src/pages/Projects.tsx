import React, { useState } from 'react'
import { Table, Tag, Button, Progress, Badge } from 'antd'
import { Plus, FolderKanban, Users, Clock } from 'lucide-react'

interface Project {
  id: number
  name: string
  type: string
  status: 'active' | 'paused' | 'completed'
  progress: number
  totalTasks: number
  completedTasks: number
  members: number
  deadline: string
}

const Projects: React.FC = () => {
  const [projects] = useState<Project[]>([
    {
      id: 1,
      name: '法律文书实体识别',
      type: 'NER',
      status: 'active',
      progress: 65,
      totalTasks: 5000,
      completedTasks: 3250,
      members: 12,
      deadline: '2026-04-15',
    },
    {
      id: 2,
      name: '医疗病历分类',
      type: '文本分类',
      status: 'active',
      progress: 30,
      totalTasks: 3000,
      completedTasks: 900,
      members: 8,
      deadline: '2026-04-30',
    },
    {
      id: 3,
      name: '电商评论情感分析',
      type: '情感分析',
      status: 'paused',
      progress: 80,
      totalTasks: 10000,
      completedTasks: 8000,
      members: 20,
      deadline: '2026-03-30',
    },
  ])

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: '#10b981', text: '进行中' },
      paused: { color: '#f59e0b', text: '已暂停' },
      completed: { color: '#64748b', text: '已完成' },
    }
    const config = configs[status]
    return <Badge color={config.color} text={config.text} />
  }

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ds-primary/20 to-ds-secondary/20 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-ds-primary" />
          </div>
          <div>
            <div className="font-medium text-white">{text}</div>
            <div className="text-xs text-ds-text-muted">{record.type}</div>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_: any, record: Project) => (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ds-text-muted">{record.completedTasks.toLocaleString()} / {record.totalTasks.toLocaleString()}</span>
            <span className="text-ds-primary">{record.progress}%</span>
          </div>
          <Progress 
            percent={record.progress} 
            strokeColor={record.status === 'completed' ? '#10b981' : '#00d4ff'}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: '成员',
      dataIndex: 'members',
      key: 'members',
      width: 100,
      render: (members: number) => (
        <div className="flex items-center gap-1 text-ds-text-muted">
          <Users className="w-4 h-4" />
          <span>{members}人</span>
        </div>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string) => (
        <div className="flex items-center gap-1 text-ds-text-muted">
          <Clock className="w-4 h-4" />
          <span>{date}</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: () => (
        <Button 
          type="primary" 
          size="small"
          className="bg-ds-primary border-0 hover:opacity-90"
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">项目管理</h1>
          <p className="text-ds-text-muted mt-1">查看和管理您参与的标注项目</p>
        </div>
        
        <Button 
          type="primary" 
          icon={<Plus className="w-4 h-4" />}
          className="bg-gradient-to-r from-ds-primary to-ds-secondary border-0"
        >
          新建项目
        </Button>
      </div>

      <div className="gradient-border">
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          pagination={false}
        />
      </div>
    </div>
  )
}

export default Projects

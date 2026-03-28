import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Tag, Button, Badge, Progress, Space, Dropdown } from 'antd'
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Filter,
  ArrowRight
} from 'lucide-react'

interface Task {
  id: number
  projectName: string
  type: string
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'assigned' | 'in_progress' | 'reviewing'
  deadline: string
  progress: number
}

const TaskList: React.FC = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  // 模拟任务数据
  const tasks: Task[] = [
    { id: 1001, projectName: '法律文书实体识别', type: 'NER', priority: 'high', status: 'in_progress', deadline: '2026-03-30', progress: 65 },
    { id: 1002, projectName: '医疗病历分类', type: '文本分类', priority: 'normal', status: 'assigned', deadline: '2026-04-02', progress: 0 },
    { id: 1003, projectName: '电商评论情感分析', type: '情感分析', priority: 'low', status: 'pending', deadline: '2026-04-05', progress: 0 },
    { id: 1004, projectName: '金融公告摘要', type: '文本摘要', priority: 'high', status: 'reviewing', deadline: '2026-03-28', progress: 100 },
    { id: 1005, projectName: '合同关键信息提取', type: '信息抽取', priority: 'normal', status: 'pending', deadline: '2026-04-01', progress: 0 },
  ]

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'red',
      normal: 'blue',
      low: 'green',
    }
    return colors[priority] || 'default'
  }

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      high: '高',
      normal: '中',
      low: '低',
    }
    return texts[priority] || priority
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { status: 'success' | 'processing' | 'default' | 'warning'; text: string; icon: React.ReactNode }> = {
      pending: { status: 'default', text: '待领取', icon: <Clock className="w-3 h-3" /> },
      assigned: { status: 'warning', text: '已分配', icon: <AlertCircle className="w-3 h-3" /> },
      in_progress: { status: 'processing', text: '进行中', icon: <Play className="w-3 h-3" /> },
      reviewing: { status: 'success', text: '审核中', icon: <CheckCircle2 className="w-3 h-3" /> },
    }
    const config = configs[status]
    return (
      <Badge 
        status={config.status} 
        text={
          <span className="flex items-center gap-1">{config.icon} {config.text}</span>
        } 
      />
    )
  }

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => (
        <span className="font-mono text-ds-primary">#{id}</span>
      ),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (text: string, record: Task) => (
        <div>
          <div className="font-medium text-white">{text}</div>
          <div className="text-xs text-ds-text-muted">{record.type}</div>
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)} className="rounded-full">
          {getPriorityText(priority)}
        </Tag>
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
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number) => (
        <div className="flex items-center gap-2">
          <Progress 
            percent={progress} 
            size="small" 
            strokeColor={progress === 100 ? '#10b981' : '#00d4ff'}
            className="w-24"
          />
          <span className="text-xs text-ds-text-muted">{progress}%</span>
        </div>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string) => (
        <span className="text-sm text-ds-text-muted">{date}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Task) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<Play className="w-4 h-4" />}
            onClick={() => navigate(`/annotate/${record.id}`)}
            disabled={record.status === 'reviewing'}
            className="bg-ds-primary border-0 hover:opacity-90"
          >
            {record.status === 'in_progress' ? '继续' : '开始'}
          </Button>
          
          <Dropdown
            menu={{
              items: [
                { key: '1', label: '查看详情' },
                { key: '2', label: '放弃任务', danger: true },
              ]
            }}
          >
            <Button size="small" icon={<MoreVertical className="w-4 h-4" />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter)

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">任务列表</h1>
          <p className="text-ds-text-muted mt-1">管理和执行您的标注任务</p>
        </div>
        
        <Button 
          icon={<Filter className="w-4 h-4" />}
          className="border-ds-border hover:border-ds-primary hover:text-ds-primary"
        >
          筛选
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '待领取', value: 12, color: 'text-ds-text-muted' },
          { label: '进行中', value: 5, color: 'text-ds-primary' },
          { label: '审核中', value: 3, color: 'text-ds-accent' },
          { label: '已完成', value: 156, color: 'text-ds-success' },
        ].map((stat, index) => (
          <div 
            key={index}
            className="gradient-border p-4 card-hover cursor-pointer"
            onClick={() => setFilter(index === 0 ? 'pending' : index === 1 ? 'in_progress' : index === 2 ? 'reviewing' : 'all')}
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-ds-text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="gradient-border">
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          className="tech-table"
        />
      </div>
    </div>
  )
}

export default TaskList

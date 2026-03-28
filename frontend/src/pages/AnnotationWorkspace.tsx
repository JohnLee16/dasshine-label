import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Progress, Tooltip, message } from 'antd'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  SkipForward,
  HelpCircle
} from 'lucide-react'

// 模拟任务数据
const mockTask = {
  id: 1001,
  projectName: '法律文书实体识别',
  data: {
    text: '本院认为，被告张三于2024年3月15日在北京市朝阳区与他人发生纠纷，造成原告李四经济损失人民币50000元。',
    entities: [
      { id: 1, label: '法院', text: '本院', start: 0, end: 2, color: '#ef4444' },
      { id: 2, label: '被告人', text: '张三', start: 12, end: 14, color: '#f59e0b' },
      { id: 3, label: '日期', text: '2024年3月15日', start: 15, end: 24, color: '#10b981' },
      { id: 4, label: '地点', text: '北京市朝阳区', start: 25, end: 32, color: '#8b5cf6' },
    ]
  },
  labels: ['法院', '原告', '被告人', '日期', '地点', '金额', '罪名'],
  progress: { current: 23, total: 100 },
  preLabel: {
    confidence: 0.85,
    entities: [
      { label: '被告人', text: '张三', confidence: 0.92 },
      { label: '日期', text: '2024年3月15日', confidence: 0.88 },
    ]
  }
}

const AnnotationWorkspace: React.FC = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [selectedText, setSelectedText] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [annotations, setAnnotations] = useState(mockTask.data.entities)
  const [timer, setTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 文本选择处理
  const handleTextSelect = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString())
    }
  }

  // 添加标注
  const addAnnotation = () => {
    if (!selectedText || !selectedLabel) {
      message.warning('请先选择文本和标签')
      return
    }
    
    const newAnnotation = {
      id: Date.now(),
      label: selectedLabel,
      text: selectedText,
      start: 0,
      end: selectedText.length,
      color: getLabelColor(selectedLabel)
    }
    
    setAnnotations([...annotations, newAnnotation])
    setSelectedText('')
    message.success('标注添加成功')
  }

  // 删除标注
  const removeAnnotation = (id: number) => {
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  // 获取标签颜色
  const getLabelColor = (label: string) => {
    const colors: Record<string, string> = {
      '法院': '#ef4444',
      '原告': '#3b82f6',
      '被告人': '#f59e0b',
      '日期': '#10b981',
      '地点': '#8b5cf6',
      '金额': '#ec4899',
      '罪名': '#6366f1',
    }
    return colors[label] || '#00d4ff'
  }

  // 提交标注
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('标注提交成功！')
      navigate('/tasks')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 渲染带标注的文本
  const renderAnnotatedText = () => {
    let lastIndex = 0
    const parts: JSX.Element[] = []
    
    annotations.forEach((entity, index) => {
      // 添加标注前的文本
      if (entity.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {mockTask.data.text.slice(lastIndex, entity.start)}
          </span>
        )
      }
      
      // 添加标注
      parts.push(
        <Tooltip 
          key={`entity-${entity.id}`} 
          title={
            <div className="text-xs">
              <div className="font-medium">{entity.label}</div>
              <div className="text-ds-text-muted">点击删除</div>
            </div>
          }
        >
          <span
            className="inline-block px-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
            style={{ 
              backgroundColor: `${entity.color}30`,
              borderBottom: `2px solid ${entity.color}`,
              color: entity.color
            }}
            onClick={() => removeAnnotation(entity.id)}
          >
            {entity.text}
            <span className="ml-1 text-xs opacity-70">{entity.label}</span>
          </span>
        </Tooltip>
      )
      
      lastIndex = entity.end
    })
    
    // 添加剩余文本
    if (lastIndex < mockTask.data.text.length) {
      parts.push(
        <span key="text-end">
          {mockTask.data.text.slice(lastIndex)}
        </span>
      )
    }
    
    return parts
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/tasks')}
            className="border-ds-border hover:border-ds-primary hover:text-ds-primary"
          >
            返回
          </Button>
          
          <div>
            <h1 className="text-xl font-bold text-white">{mockTask.projectName}</h1>
            <p className="text-sm text-ds-text-muted">任务 #{taskId}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 进度 */}
          <div className="flex items-center gap-3 px-4 py-2 bg-ds-card rounded-lg border border-ds-border">
            <Progress 
              percent={Math.round((mockTask.progress.current / mockTask.progress.total) * 100)} 
              size="small" 
              className="w-32"
              strokeColor="#00d4ff"
            />
            <span className="text-sm text-ds-text-muted">
              {mockTask.progress.current} / {mockTask.progress.total}
            </span>
          </div>

          {/* 计时器 */}
          <div className="flex items-center gap-2 px-4 py-2 bg-ds-card rounded-lg border border-ds-border">
            <Clock className="w-4 h-4 text-ds-primary" />
            <span className="text-sm font-mono">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
          </div>

          <Button 
            type="primary"
            icon={<CheckCircle className="w-4 h-4" />}
            loading={isSubmitting}
            onClick={handleSubmit}
            className="bg-ds-success border-0 hover:opacity-90"
          >
            提交标注
          </Button>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* 左侧：标注区 */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* 预标注提示 */}
          {mockTask.preLabel.confidence > 0.8 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-ds-primary/10 rounded-lg border border-ds-primary/30">
              <div className="w-2 h-2 rounded-full bg-ds-primary animate-pulse" />
              <span className="text-sm text-ds-primary">
                AI预标注完成，置信度 {Math.round(mockTask.preLabel.confidence * 100)}%
              </span>
            </div>
          )}

          {/* 文本标注区 */}
          <div className="flex-1 gradient-border p-6 overflow-auto">
            <div 
              className="text-lg leading-loose text-ds-text cursor-text select-text"
              onMouseUp={handleTextSelect}
            >
              {renderAnnotatedText()}
            </div>
          </div>

          {/* 选中提示 */}
          {selectedText && (
            <div className="flex items-center gap-4 px-4 py-3 bg-ds-secondary/10 rounded-lg border border-ds-secondary/30 animate-fade-in">
              <span className="text-sm text-ds-text-muted">已选择:</span>
              <span className="text-sm font-medium text-white px-2 py-1 bg-ds-secondary/20 rounded">
                {selectedText}
              </span>
              <Button 
                size="small" 
                onClick={() => setSelectedText('')}
                className="ml-auto"
              >
                清除
              </Button>
            </div>
          )}
        </div>

        {/* 右侧：标签选择区 */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* 标签列表 */}
          <div className="gradient-border p-4">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-ds-primary" />
              选择标签
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {mockTask.labels.map(label => (
                <button
                  key={label}
                  onClick={() => setSelectedLabel(label)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    selectedLabel === label
                      ? 'bg-ds-primary text-ds-dark'
                      : 'bg-ds-card text-ds-text hover:bg-ds-primary/20 hover:text-ds-primary'
                  }`}
                  style={selectedLabel === label ? {} : { borderLeft: `3px solid ${getLabelColor(label)}` }}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              type="primary"
              className="w-full mt-4 bg-gradient-to-r from-ds-primary to-ds-secondary border-0"
              disabled={!selectedText || !selectedLabel}
              onClick={addAnnotation}
            >
              添加标注
            </Button>
          </div>

          {/* 当前标注列表 */}
          <div className="flex-1 gradient-border p-4 overflow-auto">
            <h3 className="text-sm font-medium text-white mb-4">
              当前标注 ({annotations.length})
            </h3>
            
            <div className="space-y-2">
              {annotations.map(entity => (
                <div 
                  key={entity.id}
                  className="flex items-center gap-3 p-3 bg-ds-card rounded-lg group hover:bg-ds-card/80 transition-colors"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entity.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{entity.text}</div>
                    <div className="text-xs text-ds-text-muted">{entity.label}</div>
                  </div>
                  
                  <button
                    onClick={() => removeAnnotation(entity.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ds-danger hover:bg-ds-danger/10 rounded transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              
              {annotations.length === 0 && (
                <div className="text-center py-8 text-ds-text-muted text-sm">
                  暂无标注，请选中文本添加
                </div>
              )}
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 border-ds-border hover:border-ds-accent hover:text-ds-accent"
              icon={<SkipForward className="w-4 h-4" />}
            >
              跳过
            </Button>
            
            <Button 
              className="flex-1 border-ds-border hover:border-ds-danger hover:text-ds-danger"
              icon={<AlertCircle className="w-4 h-4" />}
            >
              举报
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnnotationWorkspace

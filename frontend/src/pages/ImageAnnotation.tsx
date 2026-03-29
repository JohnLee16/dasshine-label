import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Tooltip, message, Select, Badge, Switch } from 'antd'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  MousePointer2,
  Square,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Move,
  Pentagon,
  Dot,
  Undo2,
  Redo2,
  Copy,
  Layers,
  Eye,
  EyeOff,
  X,
  Hand
} from 'lucide-react'

// 标注类型
type AnnotationType = 'rectangle' | 'polygon' | 'point'
type ToolType = 'select' | 'rectangle' | 'polygon' | 'point' | 'move'

// 关键点可见性
type KeypointVisibility = 'visible' | 'occluded' | 'hidden'

interface Point {
  x: number
  y: number
}

interface Annotation {
  id: string
  type: AnnotationType
  label: string
  color: string
  // 矩形: [x, y, width, height] (百分比)
  // 多边形: [[x1,y1], [x2,y2], ...] 扁平数组
  // 关键点: [x, y]
  coordinates: number[]
  // 关键点专用
  visibility?: KeypointVisibility
  // 多边形专用 - 是否闭合
  closed?: boolean
  // 属性
  attributes?: Record<string, string | number | boolean>
}

interface LabelConfig {
  name: string
  color: string
  shortcut?: string
  type: AnnotationType[]
  attributes?: { name: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] }[]
}

// 历史记录（用于撤销/重做）
interface HistoryState {
  annotations: Annotation[]
  selectedId: string | null
}

// 模拟任务数据
const mockTask = {
  id: 1002,
  projectName: '智能交通目标检测',
  imageUrl: 'https://picsum.photos/seed/traffic123/1200/800.jpg',
  labels: [
    { name: '车辆', color: '#ef4444', shortcut: '1', type: ['rectangle', 'polygon'] as AnnotationType[],
      attributes: [{ name: '车型', type: 'select', options: ['轿车', 'SUV', '卡车', '公交'] }, { name: '颜色', type: 'text' }] },
    { name: '行人', color: '#10b981', shortcut: '2', type: ['rectangle', 'point'] as AnnotationType[],
      attributes: [{ name: '姿态', type: 'select', options: ['站立', '行走', '奔跑', '骑车'] }] },
    { name: '交通灯', color: '#f59e0b', shortcut: '3', type: ['point'] as AnnotationType[],
      attributes: [{ name: '状态', type: 'select', options: ['红', '黄', '绿'] }] },
    { name: '路标', color: '#8b5cf6', shortcut: '4', type: ['polygon', 'rectangle'] as AnnotationType[],
      attributes: [{ name: '类型', type: 'text' }] },
    { name: '车道线', color: '#3b82f6', shortcut: '5', type: ['polygon'] as AnnotationType[] },
    { name: '人脸关键点', color: '#ec4899', shortcut: '6', type: ['point'] as AnnotationType[],
      attributes: [{ name: '可见性', type: 'select', options: ['visible', 'occluded', 'hidden'] }] },
  ] as LabelConfig[],
  progress: { current: 15, total: 200 },
  preLabel: [
    { id: 'pre1', type: 'rectangle' as const, label: '车辆', color: '#ef4444', coordinates: [20, 30, 15, 12] },
    { id: 'pre2', type: 'point' as const, label: '交通灯', color: '#f59e0b', coordinates: [60, 15], visibility: 'visible' },
  ] as Annotation[]
}

const ImageAnnotation: React.FC = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  
  // 画布相关
  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // 标注相关
  const [annotations, setAnnotations] = useState<Annotation[]>(mockTask.preLabel)
  const [selectedTool, setSelectedTool] = useState<ToolType>('rectangle')
  const [selectedLabel, setSelectedLabel] = useState<string>(mockTask.labels[0]?.name || '')
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  
  // 多边形绘制状态
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  
  // 矩形绘制状态
  const [isDrawingRect, setIsDrawingRect] = useState(false)
  const [rectStart, setRectStart] = useState<Point | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  
  // 顶点编辑
  const [editingVertex, setEditingVertex] = useState<{ annotationId: string; vertexIndex: number } | null>(null)
  const [isDraggingVertex, setIsDraggingVertex] = useState(false)
  
  // 历史记录（撤销/重做）
  const [history, setHistory] = useState<HistoryState[]>([{ annotations: mockTask.preLabel, selectedId: null }])
  const [historyIndex, setHistoryIndex] = useState(0)
  
  // 图片加载状态
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  
  // 当前标签配置
  const currentLabelConfig = mockTask.labels.find(l => l.name === selectedLabel)
  const availableTools = currentLabelConfig?.type || ['rectangle']

  // 保存历史记录
  const saveHistory = useCallback((newAnnotations: Annotation[], newSelectedId: string | null = selectedAnnotation) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ annotations: newAnnotations, selectedId: newSelectedId })
    // 限制历史记录长度
    if (newHistory.length > 50) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex, selectedAnnotation])

  // 撤销
  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setAnnotations(prev.annotations)
      setSelectedAnnotation(prev.selectedId)
    }
  }

  // 重做
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setAnnotations(next.annotations)
      setSelectedAnnotation(next.selectedId)
    }
  }

  // 获取标签颜色
  const getLabelColor = (labelName: string) => {
    return mockTask.labels.find(l => l.name === labelName)?.color || '#00d4ff'
  }

  // 坐标转换：屏幕坐标 -> 图片百分比坐标
  const screenToImagePercent = (screenX: number, screenY: number) => {
    if (!canvasRef.current || !imageRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const imgRect = imageRef.current.getBoundingClientRect()
    
    const x = ((screenX - rect.left - position.x) / scale - (imgRect.width * scale - imgRect.width) / 2) / imgRect.width * 100
    const y = ((screenY - rect.top - position.y) / scale - (imgRect.height * scale - imgRect.height) / 2) / imgRect.height * 100
    
    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    }
  }

  // 获取顶点坐标（用于编辑）
  const getVertexAtPosition = (x: number, y: number): { annotationId: string; vertexIndex: number } | null => {
    const threshold = 5 / scale // 5像素容差
    
    for (const anno of annotations) {
      if (anno.type === 'rectangle') {
        const [rx, ry, rw, rh] = anno.coordinates
        const vertices = [
          { x: rx, y: ry, idx: 0 },
          { x: rx + rw, y: ry, idx: 1 },
          { x: rx + rw, y: ry + rh, idx: 2 },
          { x: rx, y: ry + rh, idx: 3 }
        ]
        for (const v of vertices) {
          if (Math.abs(v.x - x) < threshold && Math.abs(v.y - y) < threshold) {
            return { annotationId: anno.id, vertexIndex: v.idx }
          }
        }
      } else if (anno.type === 'polygon') {
        for (let i = 0; i < anno.coordinates.length; i += 2) {
          const vx = anno.coordinates[i]
          const vy = anno.coordinates[i + 1]
          if (Math.abs(vx - x) < threshold && Math.abs(vy - y) < threshold) {
            return { annotationId: anno.id, vertexIndex: i / 2 }
          }
        }
      } else if (anno.type === 'point') {
        const [px, py] = anno.coordinates
        if (Math.abs(px - x) < threshold && Math.abs(py - y) < threshold) {
          return { annotationId: anno.id, vertexIndex: 0 }
        }
      }
    }
    return null
  }

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    const { x, y } = screenToImagePercent(e.clientX, e.clientY)
    
    // 检查是否点击了顶点（编辑模式）
    const vertex = getVertexAtPosition(x, y)
    if (vertex && selectedTool === 'select') {
      setEditingVertex(vertex)
      setIsDraggingVertex(true)
      setSelectedAnnotation(vertex.annotationId)
      return
    }
    
    if (selectedTool === 'rectangle') {
      setIsDrawingRect(true)
      setRectStart({ x, y })
      setCurrentRect({ x, y, width: 0, height: 0 })
    } else if (selectedTool === 'polygon') {
      // 多边形：添加顶点
      const newPoint = { x, y }
      
      // 检查是否点击了第一个点来闭合
      if (polygonPoints.length >= 3) {
        const firstPoint = polygonPoints[0]
        const dist = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2))
        if (dist < 3) { // 3% 容差
          // 闭合多边形
          const newAnnotation: Annotation = {
            id: Date.now().toString(),
            type: 'polygon',
            label: selectedLabel,
            color: getLabelColor(selectedLabel),
            coordinates: polygonPoints.flatMap(p => [p.x, p.y]),
            closed: true
          }
          const newAnnotations = [...annotations, newAnnotation]
          setAnnotations(newAnnotations)
          saveHistory(newAnnotations, newAnnotation.id)
          setPolygonPoints([])
          setIsDrawingPolygon(false)
          message.success(`已添加 ${selectedLabel} 多边形`)
          return
        }
      }
      
      setPolygonPoints([...polygonPoints, newPoint])
      setIsDrawingPolygon(true)
    } else if (selectedTool === 'point') {
      // 关键点：直接放置
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'point',
        label: selectedLabel,
        color: getLabelColor(selectedLabel),
        coordinates: [x, y],
        visibility: 'visible'
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveHistory(newAnnotations, newAnnotation.id)
      message.success(`已添加 ${selectedLabel} 关键点`)
    } else if (selectedTool === 'move' || (selectedTool === 'select' && e.shiftKey)) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    } else if (selectedTool === 'select') {
      // 检查是否点击了标注
      const clickedAnno = annotations.find(anno => {
        if (anno.type === 'rectangle') {
          const [rx, ry, rw, rh] = anno.coordinates
          return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
        } else if (anno.type === 'point') {
          const [px, py] = anno.coordinates
          return Math.abs(x - px) < 2 && Math.abs(y - py) < 2
        } else if (anno.type === 'polygon') {
          // 简化的点在多边形内检测
          for (let i = 0; i < anno.coordinates.length; i += 2) {
            const px = anno.coordinates[i]
            const py = anno.coordinates[i + 1]
            if (Math.abs(x - px) < 3 && Math.abs(y - py) < 3) return true
          }
        }
        return false
      })
      setSelectedAnnotation(clickedAnno?.id || null)
    }
  }

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = screenToImagePercent(e.clientX, e.clientY)
    
    if (isDraggingVertex && editingVertex) {
      // 移动顶点
      const newAnnotations = annotations.map(anno => {
        if (anno.id !== editingVertex.annotationId) return anno
        
        const newCoords = [...anno.coordinates]
        if (anno.type === 'rectangle') {
          // 矩形顶点编辑
          const idx = editingVertex.vertexIndex
          if (idx === 0) { newCoords[0] = x; newCoords[1] = y; }
          else if (idx === 1) { newCoords[2] = x - newCoords[0]; }
          else if (idx === 2) { newCoords[2] = x - newCoords[0]; newCoords[3] = y - newCoords[1]; }
          else if (idx === 3) { newCoords[3] = y - newCoords[1]; }
        } else if (anno.type === 'polygon') {
          newCoords[editingVertex.vertexIndex * 2] = x
          newCoords[editingVertex.vertexIndex * 2 + 1] = y
        } else if (anno.type === 'point') {
          newCoords[0] = x
          newCoords[1] = y
        }
        return { ...anno, coordinates: newCoords }
      })
      setAnnotations(newAnnotations)
    } else if (isDrawingRect && rectStart) {
      setCurrentRect({
        x: Math.min(rectStart.x, x),
        y: Math.min(rectStart.y, y),
        width: Math.abs(x - rectStart.x),
        height: Math.abs(y - rectStart.y)
      })
    } else if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  // 鼠标释放
  const handleMouseUp = () => {
    if (isDraggingVertex && editingVertex) {
      saveHistory(annotations)
      setIsDraggingVertex(false)
      setEditingVertex(null)
    } else if (isDrawingRect && rectStart && currentRect) {
      if (currentRect.width > 1 && currentRect.height > 1) {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'rectangle',
          label: selectedLabel,
          color: getLabelColor(selectedLabel),
          coordinates: [currentRect.x, currentRect.y, currentRect.width, currentRect.height]
        }
        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveHistory(newAnnotations, newAnnotation.id)
        message.success(`已添加 ${selectedLabel} 矩形`)
      }
      setIsDrawingRect(false)
      setRectStart(null)
      setCurrentRect(null)
    }
    setIsDragging(false)
  }

  // 双击完成多边形
  const handleDoubleClick = () => {
    if (selectedTool === 'polygon' && polygonPoints.length >= 3) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'polygon',
        label: selectedLabel,
        color: getLabelColor(selectedLabel),
        coordinates: polygonPoints.flatMap(p => [p.x, p.y]),
        closed: true
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveHistory(newAnnotations, newAnnotation.id)
      setPolygonPoints([])
      setIsDrawingPolygon(false)
      message.success(`已添加 ${selectedLabel} 多边形`)
    }
  }

  // 删除标注
  const deleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(a => a.id !== id)
    setAnnotations(newAnnotations)
    saveHistory(newAnnotations, null)
    setSelectedAnnotation(null)
    message.success('标注已删除')
  }

  // 删除最后一个多边形顶点
  const removeLastPolygonPoint = () => {
    if (polygonPoints.length > 0) {
      setPolygonPoints(polygonPoints.slice(0, -1))
      if (polygonPoints.length === 1) {
        setIsDrawingPolygon(false)
      }
    }
  }

  // 清空所有
  const clearAll = () => {
    if (annotations.length === 0) return
    if (window.confirm('确定要清空所有标注吗？')) {
      setAnnotations([])
      saveHistory([], null)
      message.success('已清空所有标注')
    }
  }

  // 复制选中标注
  const copyAnnotation = () => {
    if (!selectedAnnotation) return
    const anno = annotations.find(a => a.id === selectedAnnotation)
    if (!anno) return
    
    const newAnnotation: Annotation = {
      ...anno,
      id: Date.now().toString(),
      coordinates: [...anno.coordinates]
    }
    // 稍微偏移位置
    if (newAnnotation.type === 'rectangle') {
      newAnnotation.coordinates[0] += 2
      newAnnotation.coordinates[1] += 2
    } else if (newAnnotation.type === 'point') {
      newAnnotation.coordinates[0] += 2
      newAnnotation.coordinates[1] += 2
    } else if (newAnnotation.type === 'polygon') {
      for (let i = 0; i < newAnnotation.coordinates.length; i += 2) {
        newAnnotation.coordinates[i] += 2
        newAnnotation.coordinates[i + 1] += 2
      }
    }
    
    const newAnnotations = [...annotations, newAnnotation]
    setAnnotations(newAnnotations)
    saveHistory(newAnnotations, newAnnotation.id)
    message.success('已复制标注')
  }

  // 缩放控制
  const zoomIn = () => setScale(s => Math.min(s * 1.2, 5))
  const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.2))
  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // 提交标注
  const handleSubmit = async () => {
    if (annotations.length === 0) {
      message.warning('请先添加至少一个标注')
      return
    }
    
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success(`成功提交 ${annotations.length} 个标注`)
    } catch (error) {
      message.error('提交失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 数字键选择标签
      if (!e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= mockTask.labels.length) {
          setSelectedLabel(mockTask.labels[num - 1].name)
          message.info(`已选择标签: ${mockTask.labels[num - 1].name}`)
        }
      }
      
      // 撤销/重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      
      // 删除
      if (e.key === 'Delete' && selectedAnnotation) {
        deleteAnnotation(selectedAnnotation)
      }
      
      // 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedAnnotation) {
        e.preventDefault()
        copyAnnotation()
      }
      
      // ESC 取消多边形绘制
      if (e.key === 'Escape') {
        if (isDrawingPolygon) {
          setPolygonPoints([])
          setIsDrawingPolygon(false)
        }
        setSelectedAnnotation(null)
      }
      
      // Backspace 删除最后一个多边形点
      if (e.key === 'Backspace' && isDrawingPolygon) {
        e.preventDefault()
        removeLastPolygonPoint()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [annotations, selectedAnnotation, historyIndex, isDrawingPolygon, polygonPoints])

  return (
    <div className="h-screen flex flex-col bg-ds-dark">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-ds-card border-b border-ds-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            icon={<ArrowLeft className="w-4 h-4" />} 
            onClick={() => navigate('/tasks')}
            className="bg-transparent border-ds-border text-ds-text hover:text-ds-primary"
          >
            返回
          </Button>
          <div className="h-6 w-px bg-ds-border" />
          <h1 className="text-lg font-medium text-white">{mockTask.projectName}</h1>
          <Tag color="blue">图片标注</Tag>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button 
              icon={<Undo2 className="w-4 h-4" />} 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="bg-ds-dark border-ds-border"
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Shift+Z)">
            <Button 
              icon={<Redo2 className="w-4 h-4" />} 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="bg-ds-dark border-ds-border"
            />
          </Tooltip>
          <div className="h-6 w-px bg-ds-border" />
          <Tooltip title="缩小 (-)">
            <Button icon={<ZoomOut className="w-4 h-4" />} onClick={zoomOut} className="bg-ds-dark border-ds-border" />
          </Tooltip>
          <span className="text-sm text-ds-text-muted w-16 text-center">{Math.round(scale * 100)}%</span>
          <Tooltip title="放大 (+)">
            <Button icon={<ZoomIn className="w-4 h-4" />} onClick={zoomIn} className="bg-ds-dark border-ds-border" />
          </Tooltip>
          <Tooltip title="重置视图 (R)">
            <Button icon={<RotateCcw className="w-4 h-4" />} onClick={resetView} className="bg-ds-dark border-ds-border" />
          </Tooltip>
          <div className="h-6 w-px bg-ds-border" />
          <Button 
            icon={<Save className="w-4 h-4" />} 
            onClick={() => message.success('已保存草稿')}
            className="bg-ds-dark border-ds-border"
          >
            保存草稿
          </Button>
          <Button 
            type="primary"
            icon={<CheckCircle className="w-4 h-4" />}
            loading={isSubmitting}
            onClick={handleSubmit}
            className="bg-gradient-to-r from-ds-primary to-ds-secondary border-0"
          >
            提交标注
          </Button>
        </div>
      </header>

      {/* 主工作区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧工具栏 */}
        <aside className="w-16 bg-ds-card border-r border-ds-border flex flex-col items-center py-4 gap-2 shrink-0">
          <Tooltip title="选择工具 (V)" placement="right">
            <button
              onClick={() => setSelectedTool('select')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'select' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <MousePointer2 className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="矩形框 (R)" placement="right">
            <button
              onClick={() => setSelectedTool('rectangle')}
              disabled={!availableTools.includes('rectangle')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'rectangle' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              } ${!availableTools.includes('rectangle') ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Square className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="多边形 (P)" placement="right">
            <button
              onClick={() => setSelectedTool('polygon')}
              disabled={!availableTools.includes('polygon')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'polygon' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              } ${!availableTools.includes('polygon') ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Pentagon className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="关键点 (K)" placement="right"
003e
            <button
              onClick={() => setSelectedTool('point')}
              disabled={!availableTools.includes('point')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'point' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              } ${!availableTools.includes('point') ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Dot className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="拖拽画布 (H)" placement="right">
            <button
              onClick={() => setSelectedTool('move')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'move' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Hand className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <div className="h-px w-8 bg-ds-border my-2" />
          
          <Tooltip title="复制选中 (Ctrl+C)" placement="right">
            <button
              onClick={copyAnnotation}
              disabled={!selectedAnnotation}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedAnnotation ? 'text-ds-text-muted hover:text-white hover:bg-white/5' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <Copy className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="清空所有" placement="right">
            <button
              onClick={clearAll}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-ds-text-muted hover:text-ds-danger hover:bg-ds-danger/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </Tooltip>
        </aside>

        {/* 画布区域 */}
        <div 
          ref={canvasRef}
          className={`flex-1 bg-ds-dark/50 relative overflow-hidden ${
            selectedTool === 'move' || isDragging ? 'cursor-grab active:cursor-grabbing' : 
            selectedTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* 图片容器 */}
          <div
            className="absolute top-1/2 left-1/2 origin-center"
            style={{
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
          >
            <img
              ref={imageRef}
              src={mockTask.imageUrl}
              alt="标注图片"
              className="max-w-none shadow-2xl"
              style={{ maxHeight: '80vh' }}
              onLoad={(e) => {
                setImageLoaded(true)
                setImageSize({
                  width: (e.target as HTMLImageElement).naturalWidth,
                  height: (e.target as HTMLImageElement).naturalHeight
                })
              }}
              draggable={false}
            />
            
            {/* 标注层 */}
            {imageLoaded && (
              <div className="absolute inset-0">
                {/* 已有标注 */}
                {annotations.map((anno) => (
                  <React.Fragment key={anno.id}>
                    {/* 矩形标注 */}
                    {anno.type === 'rectangle' && (
                      <div
                        className={`absolute border-2 cursor-pointer transition-all ${
                          selectedAnnotation === anno.id ? 'ring-2 ring-white shadow-lg' : 'hover:border-opacity-80'
                        }`}
                        style={{
                          left: `${anno.coordinates[0]}%`,
                          top: `${anno.coordinates[1]}%`,
                          width: `${anno.coordinates[2]}%`,
                          height: `${anno.coordinates[3]}%`,
                          borderColor: anno.color,
                          backgroundColor: selectedAnnotation === anno.id ? `${anno.color}30` : `${anno.color}15`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAnnotation(anno.id)
                        }}
                      >
                        {showLabels && (
                          <span 
                            className="absolute -top-6 left-0 px-2 py-0.5 text-xs rounded text-white whitespace-nowrap font-medium"
                            style={{ backgroundColor: anno.color }}
                          >
                            {anno.label}
                          </span>
                        )}
                        {/* 顶点控制点 */}
                        {selectedAnnotation === anno.id && [
                          { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
                        ].map((pos, idx) => (
                          <div
                            key={idx}
                            className="absolute w-3 h-3 bg-white border-2 rounded-full cursor-move hover:scale-125 transition-transform"
                            style={{
                              borderColor: anno.color,
                              left: `calc(${pos.x}% - 6px)`,
                              top: `calc(${pos.y}% - 6px)`,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              setEditingVertex({ annotationId: anno.id, vertexIndex: idx })
                              setIsDraggingVertex(true)
                            }}
                          />
                        ))}
                        {/* 删除按钮 */}
                        {selectedAnnotation === anno.id && (
                          <button
                            className="absolute -top-2 -right-2 w-5 h-5 bg-ds-danger rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAnnotation(anno.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* 多边形标注 */}
                    {anno.type === 'polygon' && (
                      <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAnnotation(anno.id)
                        }}
                      >
                        <svg className="absolute inset-0 w-full h-full overflow-visible">
                          <polygon
                            points={anno.coordinates.map((c, i) => 
                              i % 2 === 0 ? `${c}%` : `${c}%`
                            ).join(' ')}
                            fill={selectedAnnotation === anno.id ? `${anno.color}30` : `${anno.color}15`}
                            stroke={anno.color}
                            strokeWidth="2"
                            className={selectedAnnotation === anno.id ? 'filter drop-shadow-lg' : ''}
                          />
                        </svg>
                        {/* 顶点 */}
                        {anno.coordinates.map((c, i) => i % 2 === 0 &> {
                          const x = anno.coordinates[i]
                          const y = anno.coordinates[i + 1]
                          return (
                            <div
                              key={i}
                              className={`absolute w-3 h-3 rounded-full border-2 transition-transform ${
                                selectedAnnotation === anno.id ? 'bg-white hover:scale-150 cursor-move' : 'bg-transparent'
                              }`}
                              style={{
                                borderColor: anno.color,
                                left: `calc(${x}% - 6px)`,
                                top: `calc(${y}% - 6px)`,
                              }}
                              onMouseDown={(e) => {
                                if (selectedAnnotation !== anno.id) return
                                e.stopPropagation()
                                setEditingVertex({ annotationId: anno.id, vertexIndex: i / 2 })
                                setIsDraggingVertex(true)
                              }}
                            />
                          )
                        })}
                        {/* 标签 */}
                        {showLabels && anno.coordinates.length >= 2 && (
                          <span 
                            className="absolute px-2 py-0.5 text-xs rounded text-white whitespace-nowrap font-medium pointer-events-none"
                            style={{ 
                              backgroundColor: anno.color,
                              left: `${anno.coordinates[0]}%`,
                              top: `${anno.coordinates[1]}%`,
                              transform: 'translateY(-120%)'
                            }}
                          >
                            {anno.label}
                          </span>
                        )}
                        {/* 删除按钮 */}
                        {selectedAnnotation === anno.id && anno.coordinates.length >= 2 && (
                          <button
                            className="absolute w-5 h-5 bg-ds-danger rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                            style={{
                              left: `${anno.coordinates[0]}%`,
                              top: `${anno.coordinates[1]}%`,
                              transform: 'translate(-50%, -150%)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAnnotation(anno.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* 关键点标注 */}
                    {anno.type === 'point' && (
                      <div
                        className="absolute cursor-pointer"
                        style={{
                          left: `${anno.coordinates[0]}%`,
                          top: `${anno.coordinates[1]}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAnnotation(anno.id)
                        }}
                      >
                        <div 
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            selectedAnnotation === anno.id ? 'scale-150 ring-2 ring-white' : 'hover:scale-125'
                          }`}
                          style={{
                            backgroundColor: anno.color,
                            borderColor: 'white',
                            boxShadow: `0 0 10px ${anno.color}`,
                            opacity: anno.visibility === 'hidden' ? 0.3 : anno.visibility === 'occluded' ? 0.6 : 1
                          }}
                        />
                        {showLabels && (
                          <span 
                            className="absolute top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-xs rounded whitespace-nowrap font-medium"
                            style={{ backgroundColor: anno.color, color: 'white' }}
                          >
                            {anno.label}
                            {anno.visibility === 'occluded' && ' 👁'}
                            {anno.visibility === 'hidden' && ' ✕'}
                          </span>
                        )}
                        {/* 删除按钮 */}
                        {selectedAnnotation === anno.id && (
                          <button
                            className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-ds-danger rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAnnotation(anno.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
                
                
                {/* 正在绘制的多边形 */}
                {isDrawingPolygon && polygonPoints.length > 0 &> (
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                      <polyline
                        points={polygonPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
                        fill="none"
                        stroke={getLabelColor(selectedLabel)}
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    </svg>
                    {polygonPoints.map((p, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-white rounded-full border-2"
                        style={{
                          borderColor: getLabelColor(selectedLabel),
                          left: `calc(${p.x}% - 6px)`,
                          top: `calc(${p.y}% - 6px)`,
                        }}
                      />
                    ))}
                    {/* 第一个点的闭合提示 */}
                    {polygonPoints.length >= 3 && (
                      <div
                        className="absolute w-6 h-6 rounded-full border-2 border-dashed animate-pulse"
                        style={{
                          borderColor: getLabelColor(selectedLabel),
                          left: `calc(${polygonPoints[0].x}% - 12px)`,
                          top: `calc(${polygonPoints[0].y}% - 12px)`,
                          backgroundColor: `${getLabelColor(selectedLabel)}20`
                        }}
                      />
                    )}
                  </div>
                )}
                
                {/* 正在绘制的矩形 */}
                {isDrawingRect && currentRect && (
                  <div
                    className="absolute border-2 border-dashed pointer-events-none"
                    style={{
                      left: `${currentRect.x}%`,
                      top: `${currentRect.y}%`,
                      width: `${currentRect.width}%`,
                      height: `${currentRect.height}%`,
                      borderColor: getLabelColor(selectedLabel),
                      backgroundColor: `${getLabelColor(selectedLabel)}20`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* 提示文字 */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-ds-text-muted">
              加载图片中...
            </div>
          )}
          
          {/* 多边形绘制提示 */}
          {isDrawingPolygon && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-ds-card/90 backdrop-blur px-4 py-2 rounded-lg border border-ds-border text-sm text-ds-text">
              点击添加顶点，双击或点击第一个点闭合 • ESC取消 • Backspace撤销
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <aside className="w-80 bg-ds-card border-l border-ds-border flex flex-col shrink-0">
          {/* 标签选择 */}
          <div className="p-4 border-b border-ds-border">
            <h3 className="text-sm font-medium text-white mb-3">标签选择</h3>
            <Select
              value={selectedLabel}
              onChange={(val) => {
                setSelectedLabel(val)
                // 自动切换到第一个可用工具
                const config = mockTask.labels.find(l => l.name === val)
                if (config?.type.length > 0) {
                  setSelectedTool(config.type[0] as ToolType)
                }
              }}
              className="w-full"
              dropdownStyle={{ background: '#12121a', border: '1px solid #1e1e2e' }}
            >
              {mockTask.labels.map(label => (
                <Select.Option key={label.name} value={label.name}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: label.color }}
                    />
                    <span>{label.name}</span>
                    <span className="text-xs text-ds-text-muted ml-auto">
                      {label.type.map(t => ({ rectangle: '□', polygon: '⬡', point: '●' }[t])).join(' ')}
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
            
            {/* 快捷标签按钮 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {mockTask.labels.map((label, idx) => (
                <button
                  key={label.name}
                  onClick={() => {
                    setSelectedLabel(label.name)
                    if (label.type.length > 0) setSelectedTool(label.type[0] as ToolType)
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    selectedLabel === label.name 
                      ? 'ring-1 ring-white' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: `${label.color}30`,
                    color: label.color,
                  }}
                >
                  {idx + 1}. {label.name}
                </button>
              ))}
            </div>
            
            {/* 工具选择 */}
            <div className="mt-4">
              <span className="text-xs text-ds-text-muted">当前工具:</span>
              <div className="flex gap-2 mt-2">
                {availableTools.map(tool => (
                  <button
                    key={tool}
                    onClick={() => setSelectedTool(tool as ToolType)}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      selectedTool === tool
                        ? 'bg-ds-primary text-white'
                        : 'bg-ds-dark text-ds-text-muted hover:text-white'
                    }`}
                  >
                    {{ rectangle: '矩形', polygon: '多边形', point: '关键点' }[tool]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 标注列表 */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">标注列表</h3>
              <div className="flex items-center gap-2">
                <Switch
                  size="small"
                  checked={showLabels}
                  onChange={setShowLabels}
                  checkedChildren={<Eye className="w-3 h-3" />}
                  unCheckedChildren={<EyeOff className="w-3 h-3" />}
                />
                <Badge count={annotations.length} style={{ backgroundColor: '#00d4ff' }} />
              </div>
            </div>
            
            {annotations.length === 0 ? (
              <div className="text-center text-ds-text-muted text-sm py-8">
                暂无标注<br/>
                <span className="text-xs">选择工具后在图片上绘制</span>
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map((anno, idx) => (
                  <div
                    key={anno.id}
                    onClick={() => setSelectedAnnotation(anno.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedAnnotation === anno.id 
                        ? 'bg-ds-primary/20 border border-ds-primary' 
                        : 'bg-ds-dark/50 border border-transparent hover:border-ds-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: anno.color }}
                      />
                      <span className="text-sm text-white flex-1">{anno.label}</span>
                      <span className="text-xs text-ds-text-muted px-1.5 py-0.5 rounded bg-ds-dark">
                        {{ rectangle: '矩形', polygon: '多边形', point: '点' }[anno.type]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-ds-text-muted flex items-center gap-2">
                      <span>#{idx + 1}</span>
                      {anno.type === 'rectangle' && (
                        <span>{Math.round(anno.coordinates[2])}×{Math.round(anno.coordinates[3])}</span>
                      )}
                      {anno.type === 'polygon' && (
                        <span>{anno.coordinates.length / 2} 顶点</span>
                      )}
                      {anno.visibility && anno.visibility !== 'visible' && (
                        <span className="text-ds-accent">
                          {anno.visibility === 'occluded' ? '👁 遮挡' : '✕ 隐藏'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 任务进度 */}
          <div className="p-4 border-t border-ds-border">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ds-text-muted">任务进度</span>
              <span className="text-white">{mockTask.progress.current} / {mockTask.progress.total}</span>
            </div>
            <div className="h-1.5 bg-ds-dark rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-ds-primary to-ds-secondary rounded-full"
                style={{ width: `${(mockTask.progress.current / mockTask.progress.total) * 100}%` }}
              />
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                icon={<ChevronLeft className="w-4 h-4" />}
                className="flex-1 bg-ds-dark border-ds-border"
              >
                上一个
              </Button>
              <Button 
                icon={<ChevronRight className="w-4 h-4" />}
                className="flex-1 bg-ds-dark border-ds-border"
              >
                下一个
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ImageAnnotation

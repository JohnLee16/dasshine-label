import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tag, Tooltip, message, Select, Switch, Slider, Radio } from 'antd'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  MousePointer2,
  Box as BoxIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Copy,
  Maximize2
} from 'lucide-react'

// 3D标注类型
type Annotation3DType = 'cuboid' | 'point' | 'polygon3d'
type Tool3DType = 'select' | 'cuboid' | 'point' | 'move'

// 3D边界框 (9自由度: x,y,z, w,h,d, roll,pitch,yaw)
interface Cuboid3D {
  id: string
  position: [number, number, number]  // x, y, z (中心点)
  size: [number, number, number]      // width, height, depth
  rotation: [number, number, number]  // roll, pitch, yaw (弧度)
  label: string
  color: string
}

// 3D点
interface Point3D {
  id: string
  position: [number, number, number]
  label: string
  color: string
}

// 统一标注类型
type Annotation3D = Cuboid3D | Point3D

// 视图类型
type ViewType = 'perspective' | 'top' | 'front' | 'side'

// 标签配置
interface LabelConfig3D {
  name: string
  color: string
  shortcut?: string
  type: ('cuboid' | 'point')[]
}

// 模拟点云数据 (随机生成一些点模拟车辆)
const generateMockPointCloud = () => {
  const points: number[] = []
  const colors: number[] = []
  
  // 生成地面点
  for (let i = 0; i < 500; i++) {
    points.push(
      (Math.random() - 0.5) * 50,  // x
      0,                           // y (地面)
      (Math.random() - 0.5) * 50   // z
    )
    colors.push(0.3, 0.3, 0.3)  // 灰色地面
  }
  
  // 生成车辆1 (轿车)
  for (let i = 0; i < 300; i++) {
    points.push(
      5 + (Math.random() - 0.5) * 4,   // x
      0.5 + Math.random() * 1.5,       // y
      5 + (Math.random() - 0.5) * 2    // z
    )
    colors.push(0.8, 0.2, 0.2)  // 红色
  }
  
  // 生成车辆2 (卡车)
  for (let i = 0; i < 400; i++) {
    points.push(
      -8 + (Math.random() - 0.5) * 3,  // x
      1 + Math.random() * 2.5,         // y
      -3 + (Math.random() - 0.5) * 8   // z
    )
    colors.push(0.2, 0.6, 0.8)  // 蓝色
  }
  
  // 生成行人
  for (let i = 0; i < 100; i++) {
    points.push(
      2 + (Math.random() - 0.5) * 1,
      0.8 + Math.random() * 1.2,
      8 + (Math.random() - 0.5) * 1
    )
    colors.push(0.2, 0.8, 0.4)  // 绿色
  }
  
  return { points: new Float32Array(points), colors: new Float32Array(colors) }
}

// 模拟任务数据
const mockTask3D = {
  id: 2001,
  projectName: '自动驾驶3D目标检测',
  pointCloud: generateMockPointCloud(),
  labels: [
    { name: '车辆-轿车', color: '#ef4444', shortcut: '1', type: ['cuboid'] },
    { name: '车辆-卡车', color: '#3b82f6', shortcut: '2', type: ['cuboid'] },
    { name: '行人', color: '#10b981', shortcut: '3', type: ['cuboid', 'point'] },
    { name: '自行车', color: '#f59e0b', shortcut: '4', type: ['cuboid'] },
    { name: '交通标志', color: '#8b5cf6', shortcut: '5', type: ['point'] },
  ] as LabelConfig3D[],
  progress: { current: 8, total: 100 },
  preLabel: [
    { 
      id: 'pre1', 
      position: [5, 1, 5] as [number, number, number], 
      size: [4, 1.5, 2] as [number, number, number], 
      rotation: [0, 0.3, 0] as [number, number, number],
      label: '车辆-轿车', 
      color: '#ef4444' 
    },
    { 
      id: 'pre2', 
      position: [-8, 1.8, -3] as [number, number, number], 
      size: [3, 2.8, 8] as [number, number, number], 
      rotation: [0, -0.2, 0] as [number, number, number],
      label: '车辆-卡车', 
      color: '#3b82f6' 
    },
  ] as Cuboid3D[]
}

// 点云组件
function PointCloud({ 
  points, 
  colors, 
  pointSize = 0.1,
  visible = true 
}: { 
  points: Float32Array
  colors: Float32Array
  pointSize?: number
  visible?: boolean
}) {
  const meshRef = useRef<THREE.Points>(null)
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [points, colors])
  
  if (!visible) return null
  
  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial 
        size={pointSize} 
        vertexColors 
        sizeAttenuation 
        transparent 
        opacity={0.8}
      />
    </points>
  )
}

// 3D边界框组件
function Cuboid({ 
  cuboid, 
  isSelected, 
  onClick,
  onVertexDrag
}: { 
  cuboid: Cuboid3D
  isSelected: boolean
  onClick: () => void
  onVertexDrag?: (vertexIndex: number, position: [number, number, number]) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // 创建框线几何体
  const edgesGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(...cuboid.size)
    return new THREE.EdgesGeometry(geometry)
  }, [cuboid.size])
  
  return (
    <group 
      position={cuboid.position} 
      rotation={cuboid.rotation}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 半透明显示框 */}
      <mesh ref={meshRef}>
        <boxGeometry args={cuboid.size} />
        <meshBasicMaterial 
          color={cuboid.color} 
          transparent 
          opacity={isSelected ? 0.3 : 0.15}
          depthWrite={false}
        />
      </mesh>
      
      {/* 框线 */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial 
          color={isSelected ? '#ffffff' : cuboid.color} 
          linewidth={isSelected ? 3 : 2}
        />
      </lineSegments>
      
      {/* 选中时的顶点控制点 */}
      {isSelected && [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ].map((corner, idx) => (
        <mesh
          key={idx}
          position={[
            corner[0] * cuboid.size[0] / 2,
            corner[1] * cuboid.size[1] / 2,
            corner[2] * cuboid.size[2] / 2
          ]}
          onPointerDown={(e) => {
            e.stopPropagation()
            // 这里可以实现顶点拖拽
          }}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      
      {/* 标签 */}
      <Text
        position={[0, cuboid.size[1] / 2 + 0.5, 0]}
        fontSize={0.5}
        color={cuboid.color}
        anchorX="center"
        anchorY="bottom"
      >
        {cuboid.label}
      </Text>
    </group>
  )
}

// 3D点标注组件
function Point3DMarker({ 
  point, 
  isSelected, 
  onClick 
}: { 
  point: Point3D
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <group position={point.position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial 
          color={point.color} 
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* 选中时的高亮环 */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.3}
        color={point.color}
        anchorX="center"
      >
        {point.label}
      </Text>
    </group>
  )
}

// 主场景组件
function Scene3D({
  annotations,
  selectedId,
  onSelect,
  pointCloud,
  showPointCloud,
  tool,
  onCreateCuboid
}: {
  annotations: Annotation3D[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  pointCloud: { points: Float32Array; colors: Float32Array }
  showPointCloud: boolean
  tool: Tool3DType
  onCreateCuboid: (position: [number, number, number]) => void
}) {
  const { camera, scene } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  
  // 处理点击创建
  const handleClick = (e: any) => {
    if (tool === 'cuboid') {
      const point = e.point as THREE.Vector3
      onCreateCuboid([point.x, point.y, point.z])
    }
  }
  
  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      
      {/* 网格地面 */}
      <Grid 
        args={[100, 100]} 
        position={[0, -0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        cellColor="#333333"
        sectionColor="#555555"
      />
      
      {/* 点云 */}
      <PointCloud 
        points={pointCloud.points} 
        colors={pointCloud.colors}
        visible={showPointCloud}
      />
      
      {/* 标注框 */}
      {annotations.map((anno) => {
        if ('size' in anno) {
          return (
            <Cuboid
              key={anno.id}
              cuboid={anno as Cuboid3D}
              isSelected={selectedId === anno.id}
              onClick={() => onSelect(anno.id)}
            />
          )
        } else {
          return (
            <Point3DMarker
              key={anno.id}
              point={anno as Point3D}
              isSelected={selectedId === anno.id}
              onClick={() => onSelect(anno.id)}
            />
          )
        }
      })}
      
      {/* 点击平面（用于创建） */}
      {tool === 'cuboid' && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.5, 0]}
          onClick={handleClick}
          visible={false}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      
      {/* 控制器 */}
      <OrbitControls 
        enablePan={tool === 'move'}
        enableRotate={tool !== 'cuboid'}
        enableZoom={true}
      />
    </>
  )
}

// 主组件
const PointCloudAnnotation: React.FC = () => {
  const { taskId } = useParams()
  const navigate = useNavigate()
  
  // 状态
  const [annotations, setAnnotations] = useState<Annotation3D[]>(mockTask3D.preLabel)
  const [selectedTool, setSelectedTool] = useState<Tool3DType>('select')
  const [selectedLabel, setSelectedLabel] = useState<string>(mockTask3D.labels[0]?.name || '')
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('perspective')
  const [showPointCloud, setShowPointCloud] = useState(true)
  const [pointSize, setPointSize] = useState(0.1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 当前标签配置
  const currentLabelConfig = mockTask3D.labels.find(l => l.name === selectedLabel)
  const availableTools = currentLabelConfig?.type || ['cuboid']
  
  // 获取标签颜色
  const getLabelColor = (labelName: string) => {
    return mockTask3D.labels.find(l => l.name === labelName)?.color || '#00d4ff'
  }
  
  // 创建3D框
  const handleCreateCuboid = (position: [number, number, number]) => {
    const newCuboid: Cuboid3D = {
      id: Date.now().toString(),
      position,
      size: [4, 1.6, 2],  // 默认轿车尺寸
      rotation: [0, 0, 0],
      label: selectedLabel,
      color: getLabelColor(selectedLabel)
    }
    setAnnotations([...annotations, newCuboid])
    setSelectedAnnotation(newCuboid.id)
    message.success(`已添加 ${selectedLabel}`)
  }
  
  // 删除标注
  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
    setSelectedAnnotation(null)
    message.success('标注已删除')
  }
  
  // 更新标注属性
  const updateAnnotation = (id: string, updates: Partial<Cuboid3D>) => {
    setAnnotations(annotations.map(a => 
      a.id === id ? { ...a, ...updates } as Annotation3D : a
    ))
  }
  
  // 提交
  const handleSubmit = async () => {
    if (annotations.length === 0) {
      message.warning('请先添加至少一个标注')
      return
    }
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success(`成功提交 ${annotations.length} 个3D标注`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= mockTask3D.labels.length) {
        setSelectedLabel(mockTask3D.labels[num - 1].name)
      }
      if (e.key === 'Delete' && selectedAnnotation) {
        deleteAnnotation(selectedAnnotation)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotation])
  
  // 获取选中标注
  const selectedAnnoData = annotations.find(a => a.id === selectedAnnotation)
  
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
          <h1 className="text-lg font-medium text-white">{mockTask3D.projectName}</h1>
          <Tag color="purple">3D点云</Tag>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title="撤销">
            <Button icon={<Undo2 className="w-4 h-4" />} className="bg-ds-dark border-ds-border" />
          </Tooltip>
          <Tooltip title="重做">
            <Button icon={<Redo2 className="w-4 h-4" />} className="bg-ds-dark border-ds-border" />
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
          
          <Tooltip title="3D框 (B)" placement="right">
            <button
              onClick={() => setSelectedTool('cuboid')}
              disabled={!availableTools.includes('cuboid')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'cuboid' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              } ${!availableTools.includes('cuboid') ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <BoxIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <Tooltip title="3D点 (P)" placement="right">
            <button
              onClick={() => setSelectedTool('point')}
              disabled={!availableTools.includes('point')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'point' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              } ${!availableTools.includes('point') ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <div className="w-3 h-3 rounded-full bg-current" />
            </button>
          </Tooltip>
          
          <Tooltip title="移动视图 (M)" placement="right">
            <button
              onClick={() => setSelectedTool('move')}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedTool === 'move' ? 'bg-ds-primary text-white' : 'text-ds-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Move className="w-5 h-5" />
            </button>
          </Tooltip>
          
          <div className="h-px w-8 bg-ds-border my-2" />
          
          <Tooltip title="显示/隐藏点云" placement="right">
            <button
              onClick={() => setShowPointCloud(!showPointCloud)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-ds-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              {showPointCloud ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </Tooltip>
          
          <Tooltip title="清空所有" placement="right">
            <button
              onClick={() => {
                if (window.confirm('确定要清空所有标注吗？')) {
                  setAnnotations([])
                  setSelectedAnnotation(null)
                }
              }}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-ds-text-muted hover:text-ds-danger hover:bg-ds-danger/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </Tooltip>
        </aside>

        {/* 3D视图区 */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [20, 20, 20], fov: 50 }}
            style={{ background: '#0a0a0f' }}
          >
            <Scene3D
              annotations={annotations}
              selectedId={selectedAnnotation}
              onSelect={setSelectedAnnotation}
              pointCloud={mockTask3D.pointCloud}
              showPointCloud={showPointCloud}
              tool={selectedTool}
              onCreateCuboid={handleCreateCuboid}
            />
          </Canvas>
          
          {/* 视图切换 */}
          <div className="absolute top-4 left-4 flex gap-2">
            {[
              { key: 'perspective', label: '透视', icon: Maximize2 },
              { key: 'top', label: '鸟瞰', icon: Layers },
              { key: 'front', label: '前视', icon: BoxIcon },
              { key: 'side', label: '侧视', icon: RotateCw },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as ViewType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeView === key 
                    ? 'bg-ds-primary text-white' 
                    : 'bg-ds-card/80 text-ds-text-muted hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          
          {/* 点大小调节 */}
          <div className="absolute bottom-4 left-4 bg-ds-card/90 backdrop-blur px-4 py-3 rounded-lg border border-ds-border">
            <div className="text-xs text-ds-text-muted mb-2">点云大小</div>
            <Slider
              min={0.05}
              max={0.5}
              step={0.01}
              value={pointSize}
              onChange={setPointSize}
              style={{ width: 120 }}
            />
          </div>
          
          {/* 操作提示 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-ds-card/90 backdrop-blur px-4 py-2 rounded-lg border border-ds-border text-sm text-ds-text">
            {selectedTool === 'cuboid' && '点击点云放置3D框'}
            {selectedTool === 'point' && '点击放置关键点'}
            {selectedTool === 'select' && '点击选择，拖拽旋转视图'}
            {selectedTool === 'move' && '拖拽平移视图'}
          </div>
        </div>

        {/* 右侧面板 */}
        <aside className="w-80 bg-ds-card border-l border-ds-border flex flex-col shrink-0">
          {/* 标签选择 */}
          <div className="p-4 border-b border-ds-border">
            <h3 className="text-sm font-medium text-white mb-3">标签选择</h3>
            <Select
              value={selectedLabel}
              onChange={setSelectedLabel}
              className="w-full"
              dropdownStyle={{ background: '#12121a', border: '1px solid #1e1e2e' }}
            >
              {mockTask3D.labels.map(label => (
                <Select.Option key={label.name} value={label.name}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                    <span>{label.name}</span>
                    <span className="text-xs text-ds-text-muted ml-auto">
                      {label.type.map(t => t === 'cuboid' ? '□' : '●').join(' ')}
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
            
            {/* 快捷标签 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {mockTask3D.labels.map((label, idx) => (
                <button
                  key={label.name}
                  onClick={() => setSelectedLabel(label.name)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    selectedLabel === label.name ? 'ring-1 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: `${label.color}30`, color: label.color }}
                >
                  {idx + 1}. {label.name}
                </button>
              ))}
            </div>
          </div>

          {/* 属性编辑 */}
          {selectedAnnoData && 'size' in selectedAnnoData && (
            <div className="p-4 border-b border-ds-border">
              <h3 className="text-sm font-medium text-white mb-3">编辑属性</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-ds-text-muted">位置 (X, Y, Z)</label>
                  <div className="flex gap-2 mt-1">
                    {['X', 'Y', 'Z'].map((axis, idx) => (
                      <input
                        key={axis}
                        type="number"
                        step={0.1}
                        value={(selectedAnnoData as Cuboid3D).position[idx].toFixed(2)}
                        onChange={(e) => {
                          const newPos = [...(selectedAnnoData as Cuboid3D).position] as [number, number, number]
                          newPos[idx] = parseFloat(e.target.value) || 0
                          updateAnnotation(selectedAnnoData.id, { position: newPos })
                        }}
                        className="w-20 px-2 py-1 bg-ds-dark border border-ds-border rounded text-sm text-white"
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-ds-text-muted">尺寸 (W, H, D)</label>
                  <div className="flex gap-2 mt-1">
                    {['宽', '高', '深'].map((dim, idx) => (
                      <input
                        key={dim}
                        type="number"
                        step={0.1}
                        value={(selectedAnnoData as Cuboid3D).size[idx].toFixed(2)}
                        onChange={(e) => {
                          const newSize = [...(selectedAnnoData as Cuboid3D).size] as [number, number, number]
                          newSize[idx] = parseFloat(e.target.value) || 0
                          updateAnnotation(selectedAnnoData.id, { size: newSize })
                        }}
                        className="w-20 px-2 py-1 bg-ds-dark border border-ds-border rounded text-sm text-white"
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-ds-text-muted">旋转 (Yaw)</label>
                  <input
                    type="range"
                    min={-3.14}
                    max={3.14}
                    step={0.1}
                    value={(selectedAnnoData as Cuboid3D).rotation[1]}
                    onChange={(e) => {
                      const newRot = [...(selectedAnnoData as Cuboid3D).rotation] as [number, number, number]
                      newRot[1] = parseFloat(e.target.value)
                      updateAnnotation(selectedAnnoData.id, { rotation: newRot })
                    }}
                    className="w-full mt-1"
                  />
                  <div className="text-xs text-ds-text-muted mt-1 text-center">
                    {((selectedAnnoData as Cuboid3D).rotation[1] * 180 / Math.PI).toFixed(1)}°
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 标注列表 */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">标注列表</h3>
              <Tag color="purple">{annotations.length}</Tag>
            </div>
            
            {annotations.length === 0 ? (
              <div className="text-center text-ds-text-muted text-sm py-8">
                暂无3D标注<br/>
                <span className="text-xs">选择工具后在点云上操作</span>
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
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: anno.color }} />
                      <span className="text-sm text-white flex-1">{anno.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(anno.id); }}
                        className="text-ds-text-muted hover:text-ds-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-ds-text-muted">
                      #{(idx + 1).toString().padStart(2, '0')} • {'size' in anno ? '3D框' : '关键点'}
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
              <span className="text-white">{mockTask3D.progress.current} / {mockTask3D.progress.total}</span>
            </div>
            <div className="h-1.5 bg-ds-dark rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-ds-primary to-ds-secondary rounded-full"
                style={{ width: `${(mockTask3D.progress.current / mockTask3D.progress.total) * 100}%` }}
              />
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button icon={<ChevronLeft className="w-4 h-4" />} className="flex-1 bg-ds-dark border-ds-border">
                上一个
              </Button>
              <Button icon={<ChevronRight className="w-4 h-4" />} className="flex-1 bg-ds-dark border-ds-border">
                下一个
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default PointCloudAnnotation

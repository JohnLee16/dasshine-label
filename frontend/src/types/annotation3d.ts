// 3D点云标注类型定义

// 3D边界框 (9自由度)
export interface Cuboid3D {
  id: string
  position: [number, number, number]  // x, y, z (中心点)
  size: [number, number, number]      // width, height, depth
  rotation: [number, number, number]  // roll, pitch, yaw (弧度)
  label: string
  color: string
  confidence?: number
}

// 3D关键点
export interface Point3D {
  id: string
  position: [number, number, number]
  label: string
  color: string
  visibility: 'visible' | 'occluded' | 'hidden'
}

// 3D多边形/分割
export interface Polygon3D {
  id: string
  vertices: [number, number, number][]
  label: string
  color: string
}

// 统一3D标注类型
export type Annotation3D = Cuboid3D | Point3D | Polygon3D

// 3D任务配置
export interface Task3DConfig {
  pointCloudUrl: string
  labels: Label3DConfig[]
  supportedAnnotations: ('cuboid' | 'point' | 'polygon3d')[]
  preLabelEnabled: boolean
  preLabelUrl?: string
}

// 3D标签配置
export interface Label3DConfig {
  name: string
  color: string
  shortcut?: string
  type: ('cuboid' | 'point' | 'polygon3d')[]
  defaultSize?: [number, number, number]  // 默认3D框尺寸
}

// 3D视图类型
export type View3DType = 'perspective' | 'top' | 'front' | 'side'

// 3D点云数据
export interface PointCloudData {
  points: Float32Array  // [x1,y1,z1, x2,y2,z2, ...]
  colors?: Float32Array  // [r1,g1,b1, r2,g2,b2, ...]
  intensity?: Float32Array
  timestamp?: number
}

// 3D标注结果
export interface Annotation3DResult {
  taskId: string
  annotations: Annotation3D[]
  metadata?: {
    annotatorId: string
    annotatedAt: string
    toolVersion: string
    viewConfig?: {
      cameraPosition: [number, number, number]
      targetPosition: [number, number, number]
    }
  }
}

// 传感器数据 (LiDAR + Camera)
export interface SensorData {
  lidar: {
    url: string
    format: 'pcd' | 'bin' | 'las' | 'xyz'
    timestamp: number
  }
  cameras?: {
    url: string
    intrinsics: number[]  // 3x3 camera matrix
    extrinsics: number[]  // 4x4 transformation matrix
    timestamp: number
  }[]
  calibration?: {
    lidarToWorld: number[]  // 4x4 matrix
    worldToLidar: number[]  // 4x4 matrix
  }
}

// 时序3D标注 (追踪)
export interface Track3D {
  trackId: string
  label: string
  color: string
  frames: {
    frameId: number
    timestamp: number
    annotation: Cuboid3D
  }[]
}

// 3D标注统计
export interface Annotation3DStats {
  totalCuboids: number
  totalPoints: number
  totalPolygons: number
  labels: Record<string, number>
  averageCuboidSize: [number, number, number]
}

// KITTI格式导出
export interface KITTIAnnotation {
  type: string
  truncated: number
  occluded: number
  alpha: number
  bbox2d: [number, number, number, number]  // left, top, right, bottom
  dimensions: [number, number, number]  // height, width, length
  location: [number, number, number]  // x, y, z
  rotation_y: number
  score?: number
}

// 3D工具类型
export type Tool3DType = 'select' | 'cuboid' | 'point' | 'polygon3d' | 'move'

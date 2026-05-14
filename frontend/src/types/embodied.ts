/**
 * 与后端 `app/schemas/embodied_schemas.py` 对齐的 TypeScript 契约。
 * 变更时请同步修改 schema_version 与后端校验逻辑。
 */
export const EMBODIED_SCHEMA_VERSION = '1.0' as const

export type StreamKind =
  | 'rgb'
  | 'depth'
  | 'wrist_rgb'
  | 'mocap'
  | 'teleop'
  | 'robot_state'
  | 'other'

export type SyncMode = 'logical' | 'geometric' | 'none'

export type Shape2D = 'bbox' | 'polygon' | 'keypoints'

export type ViewSyncState = 'pending' | 'aligned' | 'manual'

export interface EmbodiedStream {
  id: string
  kind: StreamKind
  label: string
  uri?: string | null
  fps: number
  frame_count?: number | null
}

export interface EmbodiedEpisodeManifest {
  schema_version: string
  episode_id: string
  ref_stream_id: string
  sync_mode: SyncMode
  frame_count: number
  streams: EmbodiedStream[]
  calibration?: Record<string, unknown> | null
}

export interface TemporalSegment {
  id: string
  label: string
  t_start: number
  t_end: number
  stream_id?: string | null
}

export interface DiscreteEvent {
  id: string
  label: string
  t: number
  stream_id?: string | null
  source?: 'mocap' | 'teleop' | 'robot' | 'human' | 'other' | null
  payload?: Record<string, unknown> | null
}

export interface InstanceRecord {
  instance_id: string
  label: string
  notes?: string | null
}

export interface View2DAnnotation {
  id: string
  instance_id: string
  stream_id: string
  frame_index: number
  shape: Shape2D
  geometry: Record<string, unknown>
  sync_state: ViewSyncState
}

export interface EmbodiedAnnotationDocument {
  schema_version: string
  segments: TemporalSegment[]
  events: DiscreteEvent[]
  instances: InstanceRecord[]
  views_2d: View2DAnnotation[]
  mocap_markers: Record<string, unknown>[]
  teleop_markers: Record<string, unknown>[]
}

export interface EmbodiedAnnotationEnvelope {
  annotation: EmbodiedAnnotationDocument
  updated_at?: string | null
  schema_version: string
}

export function emptyEmbodiedAnnotation(): EmbodiedAnnotationDocument {
  return {
    schema_version: EMBODIED_SCHEMA_VERSION,
    segments: [],
    events: [],
    instances: [],
    views_2d: [],
    mocap_markers: [],
    teleop_markers: [],
  }
}

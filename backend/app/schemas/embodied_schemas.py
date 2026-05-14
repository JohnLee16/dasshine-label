"""
具身多视角 / 动捕 / 遥控 标注 — 前后端共享契约（OpenAPI 由 Pydantic 生成）。

manifest：Episode 级数据源描述，通常由导入流水线写入 task.data["embodied"]["manifest"]。
annotation：标注员草稿/定稿，读写 task.metadata["embodied"]["annotation"]（与任务提交流解耦，便于自动保存）。
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


StreamKind = Literal["rgb", "depth", "wrist_rgb", "mocap", "teleop", "robot_state", "other"]
SyncMode = Literal["logical", "geometric", "none"]
Shape2D = Literal["bbox", "polygon", "keypoints"]
ViewSyncState = Literal["pending", "aligned", "manual"]


class EmbodiedStream(BaseModel):
    """单路观测或信号流。"""

    id: str = Field(..., description="流唯一 ID，多视角标注中用于关联 views_2d")
    kind: StreamKind = Field(default="other", description="模态类型：动捕/遥控/视觉等")
    label: str = Field(default="", description="界面展示名")
    uri: Optional[str] = Field(default=None, description="媒体或信号文件 URL / 相对路径")
    fps: float = Field(default=30.0, ge=0)
    frame_count: Optional[int] = Field(default=None, ge=0, description="总帧数；未知可省略")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "wrist_l",
                "kind": "wrist_rgb",
                "label": "左腕相机",
                "uri": "/media/ep42/wrist_l.mp4",
                "fps": 30,
                "frame_count": 900,
            }
        }


class EmbodiedEpisodeManifest(BaseModel):
    """Episode 清单：多视角对齐、参考流、同步策略。"""

    schema_version: str = Field(default="1.0", description="契约版本，前后端需一致")
    episode_id: str = Field(..., description="Episode 业务 ID，可与 task.id 不同")
    ref_stream_id: str = Field(
        default="camera_0",
        description="主参考相机；几何投影同步时作为投影源",
    )
    sync_mode: SyncMode = Field(
        default="logical",
        description="logical=实例 ID 跨视角联动; geometric=有标定投影; none=仅时间轴共用",
    )
    frame_count: int = Field(default=0, ge=0, description="与 ref_stream 对齐的主时间轴长度（帧）")
    streams: List[EmbodiedStream] = Field(default_factory=list)
    calibration: Optional[Dict[str, Any]] = Field(
        default=None,
        description="外参/内参等，结构由导入方约定；geometric 模式使用",
    )

    @model_validator(mode="after")
    def stream_ids_unique(self) -> "EmbodiedEpisodeManifest":
        ids = [s.id for s in self.streams]
        if len(ids) != len(set(ids)):
            raise ValueError("streams[].id 必须唯一")
        return self


class TemporalSegment(BaseModel):
    """时间片段（技能阶段、子任务等）。"""

    id: str
    label: str
    t_start: float = Field(..., ge=0, description="秒，相对 Episode 起点")
    t_end: float = Field(..., ge=0)
    stream_id: Optional[str] = Field(default=None, description="若仅某一观测上有效")

    @model_validator(mode="after")
    def end_after_start(self) -> "TemporalSegment":
        if self.t_end < self.t_start:
            raise ValueError("t_end 必须 >= t_start")
        return self


class DiscreteEvent(BaseModel):
    """离散事件：夹爪闭合、按键、接管等。"""

    id: str
    label: str
    t: float = Field(..., ge=0)
    stream_id: Optional[str] = None
    source: Optional[Literal["mocap", "teleop", "robot", "human", "other"]] = None
    payload: Optional[Dict[str, Any]] = None


class InstanceRecord(BaseModel):
    """跨视角、跨时间的逻辑实例（如同一物体）。"""

    instance_id: str
    label: str
    notes: Optional[str] = None


class View2DAnnotation(BaseModel):
    """某一相机、某一帧上的 2D 几何；通过 instance_id 与其它视角同步。"""

    id: str
    instance_id: str
    stream_id: str
    frame_index: int = Field(..., ge=0)
    shape: Shape2D = "bbox"
    geometry: Dict[str, Any] = Field(
        default_factory=dict,
        description="如 bbox: {x,y,w,h} 归一化或像素由项目约定",
    )
    sync_state: ViewSyncState = Field(
        default="manual",
        description="pending=待对齐其它视角; aligned=已确认; manual=无自动同步",
    )


class EmbodiedAnnotationDocument(BaseModel):
    """具身标注文档根：动捕与遥控均可映射为 events / segments 或扩展 markers。"""

    schema_version: str = Field(default="1.0")
    segments: List[TemporalSegment] = Field(default_factory=list)
    events: List[DiscreteEvent] = Field(default_factory=list)
    instances: List[InstanceRecord] = Field(default_factory=list)
    views_2d: List[View2DAnnotation] = Field(default_factory=list)
    mocap_markers: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="动捕专有：如骨架质量、接触帧等，结构可迭代",
    )
    teleop_markers: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="遥控专有：通道语义、接管区间等",
    )


def default_annotation() -> EmbodiedAnnotationDocument:
    return EmbodiedAnnotationDocument()


def manifest_from_task_data(data: Optional[Dict[str, Any]], task_id: int, data_url: Optional[str]) -> EmbodiedEpisodeManifest:
    """从 task.data 解析 manifest；缺省时构造最小可标注占位。"""
    if isinstance(data, dict):
        embodied = data.get("embodied")
        if isinstance(embodied, dict) and embodied.get("manifest"):
            return EmbodiedEpisodeManifest.model_validate(embodied["manifest"])
    streams: List[EmbodiedStream] = []
    if data_url:
        streams.append(
            EmbodiedStream(
                id="camera_0",
                kind="rgb",
                label="主视角",
                uri=data_url,
                fps=30.0,
                frame_count=None,
            )
        )
    return EmbodiedEpisodeManifest(
        episode_id=str(task_id),
        ref_stream_id="camera_0" if streams else "none",
        sync_mode="logical",
        frame_count=0,
        streams=streams,
        calibration=None,
    )

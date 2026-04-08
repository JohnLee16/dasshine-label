from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin as require_admin
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.schemas.project_schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectSummary,
    DispatchRequest, DispatchResult,
    AddMemberRequest, MemberOut,
    TaskBulkCreate, ProjectStats,
)
from app.services.project_service import ProjectService, _get_schema

router = APIRouter(prefix="/projects", tags=["projects"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _to_summary(p: Project, db: Session) -> dict:
    schema = _get_schema(p)
    from app.models.project import ProjectMember
    member_count = db.query(ProjectMember).filter(ProjectMember.project_id == p.id).count()
    status_val = p.status.value if hasattr(p.status, "value") else str(p.status)
    return {
        "id": p.id,
        "name": p.name,
        "cover_color": schema.get("cover_color", "#00d4ff"),
        "category": schema.get("category"),
        "ann_type": schema.get("ann_type"),
        "status": status_val,
        "total_items": p.total_items or 0,
        "approved_items": p.approved_items or 0,
        "price_per_task": schema.get("price_per_task", 0.1),
        "member_count": member_count,
        "created_at": p.created_at,
    }


def _to_out(p: Project) -> dict:
    schema = _get_schema(p)
    status_val = p.status.value if hasattr(p.status, "value") else str(p.status)
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description or "",
        "cover_color": schema.get("cover_color", "#00d4ff"),
        "category": schema.get("category"),
        "ann_type": schema.get("ann_type"),
        "status": status_val,
        "dispatch_strategy": schema.get("dispatch_strategy", "smart"),
        "tasks_per_annotator": schema.get("tasks_per_annotator", 10),
        "cross_validate_count": schema.get("cross_validate_count", 1),
        "price_per_task": schema.get("price_per_task", 0.1),
        "auto_label_enabled": p.auto_label_enabled or False,
        "auto_label_model": p.auto_label_model,
        "auto_label_threshold": p.auto_label_threshold or 0.8,
        "total_items": p.total_items or 0,
        "labeled_items": p.labeled_items or 0,
        "approved_items": p.approved_items or 0,
        "created_at": p.created_at,
    }


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    project = svc.create(payload, current_user.id)
    return _to_out(project)


@router.get("")
def list_projects(
    skip: int = 0,
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    category: Optional[str] = None,
    my_projects: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    user_id = current_user.id if (my_projects or not current_user.is_admin) else None
    projects = svc.list_all(skip=skip, limit=limit, status=status,
                            category=category, user_id=user_id)
    return [_to_summary(p, db) for p in projects]


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    project = ProjectService(db).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return _to_out(project)


@router.patch("/{project_id}")
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    project = svc.get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if project.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    return _to_out(svc.update(project_id, payload))


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not ProjectService(db).delete(project_id):
        raise HTTPException(404, "Project not found")


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@router.post("/{project_id}/activate")
def activate_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    p = svc.get(project_id)
    if not p:
        raise HTTPException(404, "Not found")
    if p.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    return _to_out(svc.activate(project_id))


@router.post("/{project_id}/pause")
def pause_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    p = svc.get(project_id)
    if not p:
        raise HTTPException(404, "Not found")
    if p.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    return _to_out(svc.pause(project_id))


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/members")
def get_members(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ProjectService(db).get_members(project_id)


@router.post("/{project_id}/members")
def add_member(
    project_id: int,
    payload: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    p = svc.get(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    if p.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    if not svc.add_member(project_id, payload.user_id, payload.role):
        raise HTTPException(404, "User not found")
    return {"success": True}


@router.delete("/{project_id}/members/{user_id}")
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    p = svc.get(project_id)
    if not p:
        raise HTTPException(404, "Not found")
    if p.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    svc.remove_member(project_id, user_id)
    return {"success": True}


# ── Task import ───────────────────────────────────────────────────────────────

@router.post("/{project_id}/tasks/import")
def import_tasks(
    project_id: int,
    payload: TaskBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return ProjectService(db).bulk_import_tasks(payload, project_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Dispatch ──────────────────────────────────────────────────────────────────

@router.post("/{project_id}/dispatch")
def dispatch_tasks(
    project_id: int,
    payload: DispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = ProjectService(db)
    p = svc.get(project_id)
    if not p:
        raise HTTPException(404, "Not found")
    if p.created_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your project")
    try:
        return svc.dispatch(project_id, payload, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{project_id}/dispatch-logs")
def get_dispatch_logs(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = ProjectService(db).get(project_id)
    if not p:
        raise HTTPException(404, "Not found")
    schema = _get_schema(p)
    return schema.get("dispatch_logs", [])


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/stats")
def get_stats(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return ProjectService(db).get_stats(project_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Annotation type metadata ──────────────────────────────────────────────────

@router.get("/meta/types")
def get_annotation_types():
    return {
        "categories": [
            {"id": "image_2d", "label": "图像 2D", "icon": "image", "color": "#00d4ff", "types": [
                {"id": "bbox_2d", "label": "矩形框", "desc": "目标检测"},
                {"id": "polygon", "label": "多边形", "desc": "实例分割"},
                {"id": "polyline", "label": "折线", "desc": "车道线/骨架"},
                {"id": "keypoint", "label": "关键点", "desc": "姿态估计"},
                {"id": "segmentation", "label": "语义分割", "desc": "像素级分类"},
                {"id": "classification", "label": "图像分类", "desc": "整图标签"},
            ]},
            {"id": "pointcloud_3d", "label": "3D 点云", "icon": "cube", "color": "#a78bfa", "types": [
                {"id": "bbox_3d", "label": "3D 包围盒", "desc": "自动驾驶检测"},
                {"id": "lidar_seg", "label": "点云分割", "desc": "语义/实例分割"},
                {"id": "lane_3d", "label": "3D 车道线", "desc": "高精地图"},
            ]},
            {"id": "video", "label": "视频", "icon": "video", "color": "#f59e0b", "types": [
                {"id": "video_tracking", "label": "目标追踪", "desc": "多帧 ID 关联"},
                {"id": "video_action", "label": "动作识别", "desc": "时序片段标注"},
                {"id": "video_caption", "label": "视频描述", "desc": "字幕/描述"},
            ]},
            {"id": "audio", "label": "语音", "icon": "mic", "color": "#10b981", "types": [
                {"id": "asr", "label": "语音转写", "desc": "ASR 标注"},
                {"id": "tts_label", "label": "语音质量", "desc": "TTS 评测"},
                {"id": "speaker_diarize", "label": "说话人分离", "desc": "多人对话"},
                {"id": "emotion_audio", "label": "情绪识别", "desc": "语音情感"},
            ]},
            {"id": "nlp", "label": "语料", "icon": "text", "color": "#ec4899", "types": [
                {"id": "ner", "label": "命名实体识别", "desc": "NER"},
                {"id": "re", "label": "关系抽取", "desc": "实体关系"},
                {"id": "sentiment", "label": "情感分析", "desc": "正负中性"},
                {"id": "text_classify", "label": "文本分类", "desc": "多标签"},
                {"id": "qa_pair", "label": "问答对", "desc": "SFT 数据"},
                {"id": "summarization", "label": "摘要", "desc": "文本压缩"},
                {"id": "translation", "label": "翻译", "desc": "双语对齐"},
            ]},
            {"id": "embodied", "label": "具身机器人", "icon": "robot", "color": "#f97316", "types": [
                {"id": "robot_traj", "label": "轨迹标注", "desc": "运动路径"},
                {"id": "robot_action", "label": "动作序列", "desc": "操作步骤"},
                {"id": "robot_grasp", "label": "抓取标注", "desc": "抓取点/姿态"},
                {"id": "robot_scene", "label": "场景理解", "desc": "空间关系"},
            ]},
            {"id": "ocr", "label": "OCR", "icon": "scan", "color": "#06b6d4", "types": [
                {"id": "ocr_text", "label": "文字检测识别", "desc": "端到端 OCR"},
                {"id": "ocr_layout", "label": "版面分析", "desc": "区域分类"},
                {"id": "ocr_table", "label": "表格识别", "desc": "结构化提取"},
            ]},
            {"id": "multimodal", "label": "多模态", "icon": "layers", "color": "#8b5cf6", "types": [
                {"id": "image_caption", "label": "图文描述", "desc": "Caption 生成"},
                {"id": "vqa", "label": "视觉问答", "desc": "VQA 数据"},
                {"id": "rlhf", "label": "RLHF 偏好", "desc": "人类反馈对齐"},
            ]},
        ]
    }

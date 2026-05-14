"""
具身 Episode 标注 API：与前端同步的 manifest + annotation 读写。

存储约定：
- manifest：优先 task.data["embodied"]["manifest"]；否则根据 data_url 生成占位。
- annotation：task.metadata["embodied"]["annotation"]（JSON），适合自动保存与联调。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.exceptions import raise_bad_request, raise_forbidden, raise_not_found
from app.models.project import ProjectMember
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.embodied_schemas import (
    EmbodiedAnnotationDocument,
    EmbodiedEpisodeManifest,
    default_annotation,
    manifest_from_task_data,
)

router = APIRouter(prefix="/tasks")


def _task_meta_dict(task: Task) -> Dict[str, Any]:
    raw = task.task_metadata
    return dict(raw) if isinstance(raw, dict) else {}


def _can_read_task(user: User, task: Task, db: Session) -> bool:
    if user.is_admin:
        return True
    if task.assignee_id == user.id:
        return True
    q = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == task.project_id,
            ProjectMember.user_id == user.id,
        )
        .first()
    )
    return q is not None


def _can_write_annotation(user: User, task: Task) -> bool:
    if user.is_admin:
        return True
    if task.assignee_id != user.id:
        return False
    return task.status in (TaskStatus.ASSIGNED, TaskStatus.ANNOTATING, TaskStatus.PENDING)


class EmbodiedAnnotationEnvelope(BaseModel):
    """响应包装：便于前端展示保存时间与版本。"""

    annotation: EmbodiedAnnotationDocument
    updated_at: Optional[str] = None
    schema_version: str = Field(default="1.0")


class EmbodiedAnnotationPutResponse(BaseModel):
    success: bool = True
    updated_at: str


@router.get("/{task_id}/embodied/manifest", response_model=EmbodiedEpisodeManifest)
def get_embodied_manifest(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise_not_found("任务不存在")
    if not _can_read_task(current_user, task, db):
        raise_forbidden("无权查看该任务")
    return manifest_from_task_data(task.data, task.id, task.data_url)


@router.get("/{task_id}/embodied/annotation", response_model=EmbodiedAnnotationEnvelope)
def get_embodied_annotation(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise_not_found("任务不存在")
    if not _can_read_task(current_user, task, db):
        raise_forbidden("无权查看该任务")

    meta = _task_meta_dict(task)
    embodied = meta.get("embodied")
    updated_at: Optional[str] = None
    doc = default_annotation()
    if isinstance(embodied, dict) and embodied.get("annotation") is not None:
        try:
            doc = EmbodiedAnnotationDocument.model_validate(embodied["annotation"])
        except Exception:
            raise_bad_request("已存储的具身标注 JSON 与当前 schema 不兼容")
        updated_at = embodied.get("updated_at")

    return EmbodiedAnnotationEnvelope(annotation=doc, updated_at=updated_at)


@router.put("/{task_id}/embodied/annotation", response_model=EmbodiedAnnotationPutResponse)
def put_embodied_annotation(
    task_id: int,
    body: EmbodiedAnnotationDocument,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise_not_found("任务不存在")
    if not _can_read_task(current_user, task, db):
        raise_forbidden("无权查看该任务")
    if not _can_write_annotation(current_user, task):
        raise_forbidden("当前任务状态或分配关系不允许保存标注草稿")

    meta = _task_meta_dict(task)
    embodied = dict(meta.get("embodied") or {})
    now = datetime.now(timezone.utc).isoformat()
    embodied["annotation"] = body.model_dump(mode="json")
    embodied["updated_at"] = now
    embodied["schema_version"] = body.schema_version
    meta["embodied"] = embodied
    task.task_metadata = meta

    db.add(task)
    db.commit()
    db.refresh(task)

    return EmbodiedAnnotationPutResponse(success=True, updated_at=now)

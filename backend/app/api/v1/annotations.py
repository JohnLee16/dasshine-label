"""
标注结果API
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.annotation import Annotation, AnnotationStatus, AnnotationType
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.services.annotation_result import get_annotation_result_dict
from app.services.embodied_merge import merge_embodied_draft_into_result

router = APIRouter()


class AnnotationCreate(BaseModel):
    task_id: int
    result: dict
    work_time: int = Field(..., ge=0, description="工作时长(秒)")


class AnnotationUpdate(BaseModel):
    result: Optional[dict] = None
    work_time: Optional[int] = None


class AnnotationResponse(BaseModel):
    id: str
    task_id: int
    annotator_id: int
    result: dict
    version: int
    work_time: int
    is_final: bool
    created_at: datetime

    class Config:
        from_attributes = True


def _to_annotation_response(ann: Annotation) -> AnnotationResponse:
    return AnnotationResponse(
        id=ann.id,
        task_id=ann.task_id,
        annotator_id=ann.annotator_id,
        result=get_annotation_result_dict(ann),
        version=ann.version,
        work_time=ann.work_time,
        is_final=ann.is_latest,
        created_at=ann.created_at,
    )


@router.post("/annotations", response_model=AnnotationResponse)
def create_annotation(
    annotation: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交标注结果（写入 Annotation.data；具身草稿从 task.metadata 合并）。"""
    task = db.query(Task).filter(Task.id == annotation.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="任务未分配给您")

    if task.status not in [TaskStatus.ASSIGNED, TaskStatus.ANNOTATING]:
        raise HTTPException(status_code=400, detail="任务状态不允许提交标注")

    merged = merge_embodied_draft_into_result(task, dict(annotation.result or {}))

    db_annotation = Annotation(
        task_id=annotation.task_id,
        data_id=str(annotation.task_id),
        annotation_type=AnnotationType.CLASSIFICATION,
        data={"result": merged},
        status=AnnotationStatus.COMPLETED,
        work_time=annotation.work_time,
        annotator_id=current_user.id,
        version=1,
        is_latest=True,
    )
    db.add(db_annotation)

    task.status = TaskStatus.SUBMITTED
    task.submitted_at = datetime.utcnow()

    current_user.completed_tasks += 1

    db.commit()
    db.refresh(db_annotation)
    return _to_annotation_response(db_annotation)


@router.get("/annotations/{annotation_id}", response_model=AnnotationResponse)
def get_annotation(
    annotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取标注详情"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")

    if annotation.annotator_id != current_user.id and not current_user.is_admin:
        task = annotation.task
        is_member = any(m.user_id == current_user.id for m in task.project.members)
        if not is_member:
            raise HTTPException(status_code=403, detail="权限不足")

    return _to_annotation_response(annotation)


@router.put("/annotations/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: str,
    annotation_update: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """修改标注结果（新版本 is_latest；合并具身 metadata 草稿）。"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")

    if annotation.annotator_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能修改自己的标注")

    if annotation.task.status in [TaskStatus.APPROVED, TaskStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="已审核的标注不能修改")

    base = (
        dict(annotation_update.result)
        if annotation_update.result is not None
        else get_annotation_result_dict(annotation)
    )
    merged = merge_embodied_draft_into_result(annotation.task, base)

    new_annotation = Annotation(
        task_id=annotation.task_id,
        data_id=annotation.data_id,
        annotation_type=annotation.annotation_type,
        data={"result": merged},
        status=AnnotationStatus.COMPLETED,
        work_time=annotation_update.work_time or annotation.work_time,
        annotator_id=current_user.id,
        version=annotation.version + 1,
        parent_id=annotation.id,
        is_latest=True,
    )
    db.add(new_annotation)

    annotation.is_latest = False

    db.commit()
    db.refresh(new_annotation)
    return _to_annotation_response(new_annotation)


@router.get("/tasks/{task_id}/annotations")
def get_task_annotations(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务的所有标注结果"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    is_member = any(m.user_id == current_user.id for m in task.project.members)
    if not is_member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="权限不足")

    annotations = (
        db.query(Annotation)
        .filter(
            Annotation.task_id == task_id,
            Annotation.is_latest == True,  # noqa: E712
        )
        .all()
    )

    return {
        "task_id": task_id,
        "total": len(annotations),
        "annotations": [_to_annotation_response(a).model_dump() for a in annotations],
    }


@router.get("/users/{user_id}/annotations")
def get_user_annotations(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    """获取用户的标注历史"""
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="权限不足")

    annotations = (
        db.query(Annotation)
        .filter(
            Annotation.annotator_id == user_id,
            Annotation.is_latest == True,  # noqa: E712
        )
        .order_by(Annotation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "user_id": user_id,
        "total": len(annotations),
        "annotations": [_to_annotation_response(a).model_dump() for a in annotations],
    }

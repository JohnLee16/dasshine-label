"""
标注结果API
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_user
from app.models.task import Task, TaskStatus
from app.models.annotation import Annotation
from app.models.user import User

router = APIRouter()


class AnnotationCreate(BaseModel):
    task_id: int
    result: dict
    work_time: int = Field(..., ge=0, description="工作时长(秒)")


class AnnotationUpdate(BaseModel):
    result: dict
    work_time: Optional[int] = None


class AnnotationResponse(BaseModel):
    id: int
    task_id: int
    annotator_id: int
    result: dict
    version: int
    work_time: int
    is_final: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/annotations", response_model=AnnotationResponse)
def create_annotation(
    annotation: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """提交标注结果"""
    # 检查任务是否存在
    task = db.query(Task).filter(Task.id == annotation.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 检查任务是否已分配给当前用户
    if task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="任务未分配给您")
    
    # 检查任务状态
    if task.status not in [TaskStatus.ASSIGNED, TaskStatus.ANNOTATING]:
        raise HTTPException(status_code=400, detail="任务状态不允许提交标注")
    
    # 创建标注记录
    db_annotation = Annotation(
        task_id=annotation.task_id,
        annotator_id=current_user.id,
        result=annotation.result,
        version=1,
        started_at=task.started_at or datetime.utcnow(),
        completed_at=datetime.utcnow(),
        work_time=annotation.work_time,
        is_final=True
    )
    db.add(db_annotation)
    
    # 更新任务状态
    task.status = TaskStatus.SUBMITTED
    task.submitted_at = datetime.utcnow()
    
    # 更新用户统计
    current_user.completed_tasks += 1
    
    db.commit()
    db.refresh(db_annotation)
    return db_annotation


@router.get("/annotations/{annotation_id}", response_model=AnnotationResponse)
def get_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取标注详情"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")
    
    # 检查权限 (标注者本人、管理员或项目成员)
    if annotation.annotator_id != current_user.id and not current_user.is_admin:
        # 检查是否是项目成员
        task = annotation.task
        is_member = any(m.user_id == current_user.id for m in task.project.members)
        if not is_member:
            raise HTTPException(status_code=403, detail="权限不足")
    
    return annotation


@router.put("/annotations/{annotation_id}")
def update_annotation(
    annotation_id: int,
    annotation_update: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改标注结果"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")
    
    # 只能修改自己的标注
    if annotation.annotator_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能修改自己的标注")
    
    # 如果任务已进入审核阶段，不允许修改
    if annotation.task.status in [TaskStatus.APPROVED, TaskStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="已审核的标注不能修改")
    
    # 创建新版本
    new_annotation = Annotation(
        task_id=annotation.task_id,
        annotator_id=current_user.id,
        result=annotation_update.result or annotation.result,
        version=annotation.version + 1,
        started_at=annotation.started_at,
        completed_at=datetime.utcnow(),
        work_time=annotation_update.work_time or annotation.work_time,
        is_final=True
    )
    db.add(new_annotation)
    
    # 标记旧版本为废弃
    annotation.is_discarded = True
    
    db.commit()
    db.refresh(new_annotation)
    return {"message": "更新成功", "annotation": new_annotation}


@router.get("/tasks/{task_id}/annotations")
def get_task_annotations(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取任务的所有标注结果"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 检查权限
    is_member = any(m.user_id == current_user.id for m in task.project.members)
    if not is_member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="权限不足")
    
    annotations = db.query(Annotation).filter(
        Annotation.task_id == task_id,
        Annotation.is_discarded == False
    ).all()
    
    return {
        "task_id": task_id,
        "total": len(annotations),
        "annotations": annotations
    }


@router.get("/users/{user_id}/annotations")
def get_user_annotations(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    """获取用户的标注历史"""
    # 普通用户只能查看自己的
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="权限不足")
    
    annotations = db.query(Annotation).filter(
        Annotation.annotator_id == user_id,
        Annotation.is_discarded == False
    ).order_by(Annotation.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "user_id": user_id,
        "total": len(annotations),
        "annotations": annotations
    }

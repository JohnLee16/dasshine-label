"""
标注结果管理API
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter()


class AnnotationCreate(BaseModel):
    task_id: int
    result: dict
    work_time: int


class AnnotationUpdate(BaseModel):
    result: Optional[dict] = None
    is_final: Optional[bool] = None


@router.get("/annotations")
def list_annotations(
    task_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取标注列表"""
    # TODO: 实现查询逻辑
    return {"message": "标注列表", "task_id": task_id}


@router.get("/annotations/{annotation_id}")
def get_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取标注详情"""
    return {"message": "标注详情", "id": annotation_id}


@router.post("/annotations")
def create_annotation(
    data: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建标注"""
    return {"message": "创建成功"}


@router.patch("/annotations/{annotation_id}")
def update_annotation(
    annotation_id: int,
    data: AnnotationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新标注"""
    return {"message": "更新成功", "id": annotation_id}

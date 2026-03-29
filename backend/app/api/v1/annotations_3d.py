"""
3D点云标注API
支持3D边界框、关键点、多边形的CRUD操作
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.annotation import Annotation, AnnotationType
import json
from datetime import datetime

router = APIRouter(prefix="/annotations/3d", tags=["3D标注"])


# ============ 数据模型 ============

class Position3D(BaseModel):
    x: float
    y: float
    z: float


class Size3D(BaseModel):
    width: float
    height: float
    depth: float


class Rotation3D(BaseModel):
    roll: float = Field(default=0, description="绕X轴旋转(弧度)")
    pitch: float = Field(default=0, description="绕Y轴旋转(弧度)")
    yaw: float = Field(default=0, description="绕Z轴旋转(弧度)")


class Cuboid3DCreate(BaseModel):
    """3D边界框创建"""
    position: Position3D
    size: Size3D
    rotation: Rotation3D = Field(default_factory=Rotation3D)
    label: str
    color: str = "#00d4ff"
    confidence: Optional[float] = None


class Cuboid3DUpdate(BaseModel):
    """3D边界框更新"""
    position: Optional[Position3D] = None
    size: Optional[Size3D] = None
    rotation: Optional[Rotation3D] = None
    label: Optional[str] = None
    color: Optional[str] = None


class Point3DCreate(BaseModel):
    """3D关键点创建"""
    position: Position3D
    label: str
    color: str = "#00d4ff"
    visibility: str = "visible"  # visible | occluded | hidden


class Point3DUpdate(BaseModel):
    """3D关键点更新"""
    position: Optional[Position3D] = None
    label: Optional[str] = None
    visibility: Optional[str] = None


class Annotation3DCreate(BaseModel):
    """创建3D标注"""
    task_id: int
    data_id: str  # 点云数据ID
    annotation_type: str  # cuboid | point | polygon3d
    data: dict  # 具体标注数据
    frame_id: Optional[int] = None  # 时序帧ID
    track_id: Optional[str] = None  # 追踪ID


class Annotation3DResponse(BaseModel):
    """3D标注响应"""
    id: str
    task_id: int
    data_id: str
    annotation_type: str
    data: dict
    frame_id: Optional[int]
    track_id: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchAnnotation3DCreate(BaseModel):
    """批量创建3D标注"""
    task_id: int
    data_id: str
    annotations: List[Annotation3DCreate]


class Annotation3DStats(BaseModel):
    """3D标注统计"""
    total_cuboids: int
    total_points: int
    total_polygons: int
    labels: dict


class Export3DRequest(BaseModel):
    """3D标注导出请求"""
    format: str  # kitti | json | csv
    include_metadata: bool = True


# ============ API端点 ============

@router.post("/cuboid", response_model=Annotation3DResponse)
async def create_cuboid_annotation(
    annotation: Cuboid3DCreate,
    task_id: int,
    data_id: str,
    frame_id: Optional[int] = None,
    track_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建3D边界框标注"""
    db_annotation = Annotation(
        task_id=task_id,
        data_id=data_id,
        annotation_type=AnnotationType.BOUNDING_BOX,  # 复用现有类型或新增CUBOID_3D
        data={
            "type": "cuboid",
            "position": annotation.position.dict(),
            "size": annotation.size.dict(),
            "rotation": annotation.rotation.dict(),
            "label": annotation.label,
            "color": annotation.color,
            "confidence": annotation.confidence,
        },
        frame_id=frame_id,
        track_id=track_id,
        created_by=current_user.id,
        status="completed"
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return Annotation3DResponse(
        id=str(db_annotation.id),
        task_id=db_annotation.task_id,
        data_id=db_annotation.data_id,
        annotation_type="cuboid",
        data=db_annotation.data,
        frame_id=db_annotation.frame_id,
        track_id=db_annotation.track_id,
        created_by=db_annotation.created_by,
        created_at=db_annotation.created_at,
        updated_at=db_annotation.updated_at,
    )


@router.post("/point", response_model=Annotation3DResponse)
async def create_point3d_annotation(
    annotation: Point3DCreate,
    task_id: int,
    data_id: str,
    frame_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建3D关键点标注"""
    db_annotation = Annotation(
        task_id=task_id,
        data_id=data_id,
        annotation_type=AnnotationType.KEYPOINT,  # 复用现有类型
        data={
            "type": "point3d",
            "position": annotation.position.dict(),
            "label": annotation.label,
            "color": annotation.color,
            "visibility": annotation.visibility,
        },
        frame_id=frame_id,
        created_by=current_user.id,
        status="completed"
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return Annotation3DResponse(
        id=str(db_annotation.id),
        task_id=db_annotation.task_id,
        data_id=db_annotation.data_id,
        annotation_type="point3d",
        data=db_annotation.data,
        frame_id=db_annotation.frame_id,
        track_id=db_annotation.track_id,
        created_by=db_annotation.created_by,
        created_at=db_annotation.created_at,
        updated_at=db_annotation.updated_at,
    )


@router.get("/task/{task_id}", response_model=List[Annotation3DResponse])
async def get_task_3d_annotations(
    task_id: int,
    data_id: Optional[str] = None,
    frame_id: Optional[int] = None,
    annotation_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取任务的3D标注列表"""
    query = db.query(Annotation).filter(Annotation.task_id == task_id)
    
    if data_id:
        query = query.filter(Annotation.data_id == data_id)
    if frame_id is not None:
        query = query.filter(Annotation.frame_id == frame_id)
    
    annotations = query.all()
    
    # 过滤3D类型
    result = []
    for anno in annotations:
        data = anno.data or {}
        if annotation_type and data.get("type") != annotation_type:
            continue
        if data.get("type") in ["cuboid", "point3d", "polygon3d"]:
            result.append(Annotation3DResponse(
                id=str(anno.id),
                task_id=anno.task_id,
                data_id=anno.data_id,
                annotation_type=data.get("type", "unknown"),
                data=data,
                frame_id=anno.frame_id,
                track_id=anno.track_id,
                created_by=anno.created_by,
                created_at=anno.created_at,
                updated_at=anno.updated_at,
            ))
    
    return result


@router.put("/{annotation_id}", response_model=Annotation3DResponse)
async def update_3d_annotation(
    annotation_id: str,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新3D标注"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")
    
    # 合并更新数据
    if annotation.data:
        annotation.data.update(updates)
    else:
        annotation.data = updates
    
    annotation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(annotation)
    
    return Annotation3DResponse(
        id=str(annotation.id),
        task_id=annotation.task_id,
        data_id=annotation.data_id,
        annotation_type=annotation.data.get("type", "unknown"),
        data=annotation.data,
        frame_id=annotation.frame_id,
        track_id=annotation.track_id,
        created_by=annotation.created_by,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at,
    )


@router.delete("/{annotation_id}")
async def delete_3d_annotation(
    annotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除3D标注"""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    
    if not annotation:
        raise HTTPException(status_code=404, detail="标注不存在")
    
    db.delete(annotation)
    db.commit()
    
    return {"message": "标注已删除"}


@router.post("/batch", response_model=List[Annotation3DResponse])
async def batch_create_3d_annotations(
    batch: BatchAnnotation3DCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量创建3D标注"""
    db_annotations = []
    
    for anno_data in batch.annotations:
        db_anno = Annotation(
            task_id=batch.task_id,
            data_id=batch.data_id,
            annotation_type=AnnotationType.BOUNDING_BOX,
            data=anno_data.data,
            frame_id=anno_data.frame_id,
            track_id=anno_data.track_id,
            created_by=current_user.id,
            status="completed"
        )
        db.add(db_anno)
        db_annotations.append(db_anno)
    
    db.commit()
    
    return [
        Annotation3DResponse(
            id=str(anno.id),
            task_id=anno.task_id,
            data_id=anno.data_id,
            annotation_type=anno.data.get("type", "unknown"),
            data=anno.data,
            frame_id=anno.frame_id,
            track_id=anno.track_id,
            created_by=anno.created_by,
            created_at=anno.created_at,
            updated_at=anno.updated_at,
        )
        for anno in db_annotations
    ]


@router.get("/task/{task_id}/stats", response_model=Annotation3DStats)
async def get_3d_annotation_stats(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取3D标注统计"""
    annotations = db.query(Annotation).filter(Annotation.task_id == task_id).all()
    
    stats = {
        "total_cuboids": 0,
        "total_points": 0,
        "total_polygons": 0,
        "labels": {}
    }
    
    for anno in annotations:
        data = anno.data or {}
        anno_type = data.get("type")
        label = data.get("label", "unknown")
        
        if anno_type == "cuboid":
            stats["total_cuboids"] += 1
        elif anno_type == "point3d":
            stats["total_points"] += 1
        elif anno_type == "polygon3d":
            stats["total_polygons"] += 1
        
        stats["labels"][label] = stats["labels"].get(label, 0) + 1
    
    return Annotation3DStats(**stats)


@router.post("/task/{task_id}/export")
async def export_3d_annotations(
    task_id: int,
    request: Export3DRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """导出3D标注 (KITTI/JSON/CSV格式)"""
    annotations = db.query(Annotation).filter(
        Annotation.task_id == task_id,
        Annotation.status == "completed"
    ).all()
    
    if request.format == "kitti":
        # 导出为KITTI格式
        lines = []
        for anno in annotations:
            data = anno.data or {}
            if data.get("type") != "cuboid":
                continue
            
            # KITTI格式: type truncated occluded alpha bbox dimensions location rotation
            pos = data.get("position", {})
            size = data.get("size", {})
            rot = data.get("rotation", {})
            
            line = f"{data.get('label', 'Unknown')} 0.00 0 0.00 0.00 0.00 0.00 0.00 " \
                   f"{size.get('height', 0):.2f} {size.get('width', 0):.2f} {size.get('depth', 0):.2f} " \
                   f"{pos.get('x', 0):.2f} {pos.get('y', 0):.2f} {pos.get('z', 0):.2f} " \
                   f"{rot.get('yaw', 0):.2f}"
            lines.append(line)
        
        content = "\n".join(lines)
        return {
            "format": "kitti",
            "content": content,
            "filename": f"task_{task_id}_3d.txt"
        }
    
    elif request.format == "json":
        # 导出为JSON格式
        result = {
            "task_id": task_id,
            "exported_at": datetime.utcnow().isoformat(),
            "annotations": [
                {
                    "id": str(anno.id),
                    "type": anno.data.get("type"),
                    "data": anno.data,
                    "frame_id": anno.frame_id,
                    "track_id": anno.track_id,
                }
                for anno in annotations
            ]
        }
        return {
            "format": "json",
            "content": json.dumps(result, indent=2),
            "filename": f"task_{task_id}_3d.json"
        }
    
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")

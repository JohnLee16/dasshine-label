"""
数据导出API
"""

import json
import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_admin
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.annotation import Annotation

router = APIRouter()


def export_to_json(tasks: List[Task]) -> str:
    """导出为JSON格式"""
    data = []
    for task in tasks:
        annotations = []
        for ann in task.annotations:
            if not ann.is_discarded:
                annotations.append({
                    "annotator_id": ann.annotator_id,
                    "result": ann.result,
                    "version": ann.version,
                    "work_time": ann.work_time
                })
        
        data.append({
            "task_id": task.id,
            "data": task.data,
            "annotations": annotations,
            "status": task.status.value if hasattr(task.status, 'value') else task.status,
            "is_golden": task.is_golden
        })
    return json.dumps(data, ensure_ascii=False, indent=2)


def export_to_csv(tasks: List[Task]) -> str:
    """导出为CSV格式"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # 写入表头
    writer.writerow(["task_id", "data", "annotation", "annotator_id", "status"])
    
    for task in tasks:
        for ann in task.annotations:
            if not ann.is_discarded:
                writer.writerow([
                    task.id,
                    json.dumps(task.data, ensure_ascii=False),
                    json.dumps(ann.result, ensure_ascii=False),
                    ann.annotator_id,
                    task.status.value if hasattr(task.status, 'value') else task.status
                ])
    
    return output.getvalue()


def export_to_coco(tasks: List[Task], project_name: str) -> dict:
    """导出为COCO格式 (用于计算机视觉)"""
    coco_data = {
        "info": {
            "description": project_name,
            "version": "1.0",
            "year": datetime.now().year,
            "date_created": datetime.now().isoformat()
        },
        "images": [],
        "annotations": [],
        "categories": []
    }
    
    # 简化实现，实际应根据项目类型构建
    for i, task in enumerate(tasks):
        coco_data["images"].append({
            "id": task.id,
            "file_name": task.data.get("file_name", f"{task.id}.jpg"),
            "height": task.data.get("height", 0),
            "width": task.data.get("width", 0)
        })
        
        for ann in task.annotations:
            if not ann.is_discarded:
                coco_data["annotations"].append({
                    "id": f"{task.id}_{ann.id}",
                    "image_id": task.id,
                    "category_id": 1,
                    "bbox": ann.result.get("bbox", []),
                    "segmentation": ann.result.get("segmentation", []),
                    "area": ann.result.get("area", 0),
                    "iscrowd": 0
                })
    
    return coco_data


@router.get("/export/{project_id}")
def export_project(
    project_id: int,
    format: str = "json",
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    导出项目标注数据
    
    Args:
        format: 导出格式 (json/csv/coco)
        status: 过滤状态 (approved/reviewing等)
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 查询任务
    query = db.query(Task).filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    else:
        # 默认导出已审核通过的数据
        query = query.filter(Task.status == TaskStatus.APPROVED)
    
    tasks = query.all()
    
    if not tasks:
        raise HTTPException(status_code=404, detail="没有可导出的数据")
    
    # 根据格式导出
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{project.name}_{timestamp}"
    
    if format == "json":
        content = export_to_json(tasks)
        filename += ".json"
        media_type = "application/json"
    elif format == "csv":
        content = export_to_csv(tasks)
        filename += ".csv"
        media_type = "text/csv"
    elif format == "coco":
        content = json.dumps(export_to_coco(tasks, project.name), ensure_ascii=False, indent=2)
        filename += ".json"
        media_type = "application/json"
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")
    
    return StreamingResponse(
        io.StringIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/{project_id}/stats")
def get_export_stats(
    project_id: int,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取项目导出统计"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    stats = {
        "project_id": project_id,
        "project_name": project.name,
        "total_tasks": project.total_items,
        "approved_tasks": project.approved_items,
        "labeled_tasks": project.labeled_items,
        "ready_for_export": db.query(Task).filter(
            Task.project_id == project_id,
            Task.status == TaskStatus.APPROVED
        ).count(),
        "export_formats": ["json", "csv", "coco"]
    }
    
    return stats

"""
数据导出API
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin

router = APIRouter()


@router.get("/export/{project_id}")
def export_project(
    project_id: int,
    format: str = "json",
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """导出项目标注数据"""
    return {
        "message": "导出成功",
        "project_id": project_id,
        "format": format,
        "download_url": f"/downloads/project_{project_id}.{format}"
    }

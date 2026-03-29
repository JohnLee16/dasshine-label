# backend/app/api/v1/projects.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.project import Project, ProjectType, ProjectStatus, ProjectMember
from app.models.user import User

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = None
    type: ProjectType
    annotation_schema: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str = Field(None, min_length=1, max_length=200)
    description: str = None
    status: ProjectStatus = None
    annotation_schema: dict = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    type: str
    status: str
    total_items: int
    labeled_items: int
    approved_items: int
    progress: float
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    """获取项目列表"""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects


@router.post("/projects", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新项目"""
    db_project = Project(
        name=project.name,
        description=project.description,
        type=project.type,
        status=ProjectStatus.DRAFT,
        annotation_schema=project.annotation_schema,
        created_by_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # 创建者为项目成员
    member = ProjectMember(
        project_id=db_project.id,
        user_id=current_user.id,
        role="owner",
        can_assign=True,
        can_review=True,
        can_export=True
    )
    db.add(member)
    db.commit()
    
    return db_project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取项目详情"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.put("/projects/{project_id}")
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return {"message": "更新成功", "project": project}


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    db.delete(project)
    db.commit()
    return {"message": "删除成功"}


@router.post("/projects/{project_id}/members")
def add_project_member(
    project_id: int,
    user_id: int,
    role: str = "annotator",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """添加项目成员"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        role=role,
        can_assign=role in ["owner", "manager"],
        can_review=role in ["owner", "manager", "reviewer"],
        can_export=role in ["owner", "manager"]
    )
    db.add(member)
    db.commit()
    
    return {"message": "成员添加成功"}

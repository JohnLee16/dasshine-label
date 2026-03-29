"""
用户管理API
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_user, get_current_admin
from app.models.user import User, UserRole, UserStatus, AnnotatorLevel
from app.core.security import get_password_hash

router = APIRouter()


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: UserRole = UserRole.ANNOTATOR


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[UserStatus] = None
    level: Optional[AnnotatorLevel] = None
    skills: Optional[List[str]] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    status: str
    level: str
    accuracy_score: float
    completed_tasks: int
    
    class Config:
        from_attributes = True


@router.get("/users/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 50,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None
):
    """获取用户列表 (管理员)"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """获取用户详情 (管理员)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """创建用户 (管理员)"""
    # 检查用户名和邮箱是否已存在
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="邮箱已存在")
    
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        role=user.role,
        status=UserStatus.ACTIVE,
        level=AnnotatorLevel.NOVICE
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """更新用户信息 (管理员)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # 处理技能列表
    if "skills" in update_data and update_data["skills"]:
        update_data["skills"] = json.dumps(update_data["skills"])
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return {"message": "更新成功", "user": user}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """删除用户 (管理员)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 软删除，标记状态为deleted
    user.status = UserStatus.DELETED
    db.commit()
    return {"message": "用户已删除"}


@router.get("/users/{user_id}/stats")
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取用户统计信息"""
    # 普通用户只能查看自己的统计
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="权限不足")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "user_id": user.id,
        "username": user.username,
        "accuracy_score": user.accuracy_score,
        "efficiency_score": user.efficiency_score,
        "total_tasks": user.total_tasks,
        "completed_tasks": user.completed_tasks,
        "completion_rate": user.completion_rate,
        "level": user.level.value if hasattr(user.level, 'value') else str(user.level)
    }


import json

"""
用户管理API
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_admin

router = APIRouter()


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None


@router.get("/users")
def list_users(
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    return {"message": "用户列表", "page": page, "page_size": page_size}


@router.post("/users")
def create_user(
    data: UserCreate,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建用户"""
    return {"message": "创建成功"}

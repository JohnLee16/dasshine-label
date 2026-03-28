"""
API依赖注入
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.core.exceptions import raise_unauthorized
from app.models.user import User

# 安全scheme
security = HTTPBearer(auto_error=False)


def get_db() -> Generator:
    """获取数据库会话"""
    # 这里需要导入session，但为了循环导入问题，稍后完善
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """获取当前用户"""
    if not credentials:
        raise_unauthorized("未提供认证令牌")
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise_unauthorized("无效的认证令牌")
    
    user_id = payload.get("sub")
    if not user_id:
        raise_unauthorized("无效的认证令牌")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise_unauthorized("用户不存在")
    
    if not user.is_active:
        raise_unauthorized("用户已被禁用")
    
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前管理员"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user

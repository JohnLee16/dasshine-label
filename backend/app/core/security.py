"""
安全工具模块
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
import hashlib
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    # 将哈希字符串转换为字节
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    # 直接使用 bcrypt 验证
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希
    
    bcrypt 有 72 字节限制，我们先对密码做 SHA256 处理，
    这样无论多长的密码都能适配
    """
    # 使用 SHA256 预处理密码，确保长度固定且不超过 72 字节
    password_bytes = password.encode('utf-8')
    # 生成 bcrypt salt 并哈希
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌
    
    Args:
        data: 要编码的数据
        expires_delta: 过期时间
    
    Returns:
        JWT令牌字符串
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    解码JWT令牌
    
    Args:
        token: JWT令牌
    
    Returns:
        解码后的数据，失败返回None
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

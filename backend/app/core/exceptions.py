"""
自定义异常模块
"""

from fastapi import HTTPException, status


class DasshineException(Exception):
    """基础异常类"""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        super().__init__(self.message)


class AuthenticationError(DasshineException):
    """认证错误"""
    def __init__(self, message: str = "认证失败"):
        super().__init__(message, "AUTH_ERROR")


class AuthorizationError(DasshineException):
    """授权错误"""
    def __init__(self, message: str = "权限不足"):
        super().__init__(message, "FORBIDDEN")


class ResourceNotFoundError(DasshineException):
    """资源不存在"""
    def __init__(self, resource: str = "资源"):
        super().__init__(f"{resource}不存在", "NOT_FOUND")


class ValidationError(DasshineException):
    """验证错误"""
    def __init__(self, message: str = "数据验证失败"):
        super().__init__(message, "VALIDATION_ERROR")


class DuplicateError(DasshineException):
    """重复错误"""
    def __init__(self, resource: str = "资源"):
        super().__init__(f"{resource}已存在", "DUPLICATE_ERROR")


class TaskDispatchError(DasshineException):
    """任务分发错误"""
    def __init__(self, message: str = "任务分发失败"):
        super().__init__(message, "DISPATCH_ERROR")


class AutoLabelError(DasshineException):
    """自动标注错误"""
    def __init__(self, message: str = "自动标注失败"):
        super().__init__(message, "AUTO_LABEL_ERROR")


# HTTP异常快捷方法
def raise_not_found(detail: str = "资源不存在"):
    """抛出404异常"""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail
    )


def raise_bad_request(detail: str = "请求参数错误"):
    """抛出400异常"""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail
    )


def raise_unauthorized(detail: str = "未授权"):
    """抛出401异常"""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_forbidden(detail: str = "权限不足"):
    """抛出403异常"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail
    )

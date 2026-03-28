"""
质量检查相关任务
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_timeout_tasks():
    """
    检查并回收超时任务
    
    定时任务，每5分钟执行一次
    """
    try:
        from app.db.session import SessionLocal
        from app.services.task_dispatch import TaskDispatchService
        
        db = SessionLocal()
        try:
            service = TaskDispatchService(db)
            released = service.check_timeout_tasks(timeout_minutes=30)
            
            if released > 0:
                logger.info(f"回收了 {released} 个超时任务")
            
            return {"released": released}
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"检查超时任务失败: {e}")
        raise

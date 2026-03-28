"""
自动标注异步任务
"""

from typing import List
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def auto_label_task(self, task_id: int):
    """
    执行单个任务的自动标注
    
    失败自动重试3次
    """
    try:
        from app.db.session import SessionLocal
        from app.services.auto_label import AutoLabelService
        
        db = SessionLocal()
        try:
            service = AutoLabelService(db)
            # 注意：Celery需要同步调用，所以使用run_until_complete
            import asyncio
            result = asyncio.run(service.process_task(task_id))
            
            if result:
                logger.info(f"任务 {task_id} 自动标注成功，置信度: {result.overall_confidence}")
                return {
                    "task_id": task_id,
                    "success": True,
                    "confidence": result.overall_confidence,
                    "model": result.model
                }
            else:
                logger.warning(f"任务 {task_id} 自动标注返回空结果")
                return {"task_id": task_id, "success": False, "reason": "empty_result"}
                
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"自动标注任务失败: {exc}")
        # 重试（指数退避）
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task
def batch_auto_label(project_id: int, task_ids: List[int]):
    """
    批量自动标注任务
    
    Args:
        project_id: 项目ID
        task_ids: 任务ID列表
    """
    results = {
        "total": len(task_ids),
        "success": 0,
        "failed": 0,
        "details": []
    }
    
    for task_id in task_ids:
        try:
            result = auto_label_task.delay(task_id)
            results["success"] += 1
            results["details"].append({"task_id": task_id, "job_id": result.id})
        except Exception as e:
            results["failed"] += 1
            results["details"].append({"task_id": task_id, "error": str(e)})
    
    logger.info(f"批量自动标注完成: {results}")
    return results


@shared_task
def auto_label_project(project_id: int, batch_size: int = 100):
    """
    自动标注整个项目
    
    用于后台批量处理
    """
    try:
        from app.db.session import SessionLocal
        from app.services.auto_label import AutoLabelService
        
        db = SessionLocal()
        try:
            service = AutoLabelService(db)
            import asyncio
            stats = asyncio.run(service.batch_process(project_id, batch_size))
            
            logger.info(f"项目 {project_id} 批量自动标注完成: {stats}")
            return stats
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"项目自动标注失败: {exc}")
        raise

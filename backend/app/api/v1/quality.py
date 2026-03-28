"""
质量控制API
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user, get_current_admin

router = APIRouter()


class CrossValidationRequest(BaseModel):
    task_id: int


class CrossValidationResponse(BaseModel):
    task_id: int
    annotator_count: int
    agreement_rate: float
    kappa_score: float
    is_golden: bool
    golden_accuracy: Optional[float]


class QualityScoreResponse(BaseModel):
    user_id: int
    username: str
    accuracy: float
    consistency: float
    efficiency: float
    overall_score: float
    level: str
    suggested_level: str


class ReviewRequest(BaseModel):
    task_id: int
    decision: str  # approved | rejected
    score: Optional[float] = None
    feedback: Optional[str] = None


class ReviewResponse(BaseModel):
    success: bool
    message: str
    task_id: int


class InsertGoldenRequest(BaseModel):
    project_id: int
    ratio: float = 0.1


class QualityReportResponse(BaseModel):
    project_id: int
    project_name: str
    total_tasks: int
    approved_tasks: int
    approval_rate: float
    cross_validated: int
    golden_tasks: int
    quality_score: float


@router.post("/quality/cross-validation", response_model=CrossValidationResponse)
def calculate_cross_validation(
    request: CrossValidationRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    计算任务的交叉验证结果
    
    返回多标注员之间的一致性指标
    """
    from app.services.quality_control import get_quality_service
    
    service = get_quality_service(db)
    result = service.calculate_cross_validation(request.task_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="任务不存在或无足够标注")
    
    return result


@router.get("/quality/score/{user_id}", response_model=QualityScoreResponse)
def get_annotator_quality(
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取标注员质量评分
    
    综合准确率、一致性、效率的评分
    """
    from app.services.quality_control import get_quality_service
    
    service = get_quality_service(db)
    score = service.calculate_annotator_quality(user_id)
    
    if not score:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "user_id": score.user_id,
        "username": score.username,
        "accuracy": score.accuracy,
        "consistency": score.consistency,
        "efficiency": score.efficiency,
        "overall_score": score.overall_score,
        "level": score.level.value if hasattr(score.level, 'value') else str(score.level),
        "suggested_level": score.suggested_level.value if hasattr(score.suggested_level, 'value') else str(score.suggested_level)
    }


@router.post("/quality/review", response_model=ReviewResponse)
def review_task(
    request: ReviewRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    审核任务
    
    审核员对标注结果进行审核
    """
    from app.services.quality_control import get_quality_service
    
    service = get_quality_service(db)
    success = service.review_task(
        task_id=request.task_id,
        reviewer_id=current_user.id,
        decision=request.decision,
        score=request.score,
        feedback=request.feedback
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="审核失败")
    
    return {
        "success": True,
        "message": f"任务已{ '通过' if request.decision == 'approved' else '驳回' }",
        "task_id": request.task_id
    }


@router.post("/quality/insert-golden")
def insert_golden_tasks(
    request: InsertGoldenRequest,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    插入黄金标准题（管理员）
    
    向项目中插入测试题用于质量监控
    """
    from app.services.quality_control import get_quality_service
    
    service = get_quality_service(db)
    inserted = service.insert_golden_tasks(request.project_id, request.ratio)
    
    return {
        "success": True,
        "project_id": request.project_id,
        "inserted": inserted,
        "ratio": request.ratio
    }


@router.get("/quality/report/{project_id}", response_model=QualityReportResponse)
def get_quality_report(
    project_id: int,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    获取项目质量报告（管理员）
    """
    from app.services.quality_control import get_quality_service
    
    service = get_quality_service(db)
    report = service.get_project_quality_report(project_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    return report


@router.get("/quality/leaderboard")
def get_quality_leaderboard(
    limit: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取标注员质量排行榜
    """
    from app.services.quality_control import get_quality_service
    from app.models.user import User
    
    service = get_quality_service(db)
    
    # 获取所有标注员
    annotators = db.query(User).filter(
        User.completed_tasks > 10
    ).order_by(
        User.accuracy_score.desc()
    ).limit(limit).all()
    
    leaderboard = []
    for i, user in enumerate(annotators, 1):
        score = service.calculate_annotator_quality(user.id)
        if score:
            leaderboard.append({
                "rank": i,
                "user_id": user.id,
                "username": user.username,
                "accuracy": score.accuracy,
                "completed_tasks": user.completed_tasks,
                "level": user.level.value if hasattr(user.level, 'value') else str(user.level),
                "overall_score": score.overall_score
            })
    
    return {
        "total": len(leaderboard),
        "data": leaderboard
    }
